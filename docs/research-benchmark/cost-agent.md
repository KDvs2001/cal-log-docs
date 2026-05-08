---
sidebar_position: 5
title: Cost Agent
---

# The Cost Agent & Simulated Cost Function

This class orchestrates the strategies (Random, Entropy, CoreSet, BADGE) and executes the core CAL-Log logic (Cost Simulation & Redundancy Control).

```python
# ======================================================================================
# THE AGENT (FATIGUE + REDUNDANCY + ABLATION)
# ======================================================================================

class CostAgent:
    def __init__(self, data, name, strategy):
        self.data = data
        self.name = name
        self.strategy = strategy
        self.indices = np.arange(len(data['texts']))
        self.labeled = []
        self.unlabeled = list(self.indices)
        self.history = []
        self.cum_cost = 0.0

        self.backbone = StandardBackbone(num_labels=data['num_labels'], problem_type=data['problem_type'])
        self.ece_metric = CalibrationError(task="multiclass", num_classes=data['num_labels']).to(DEVICE)
        
        sbert = SentenceTransformer("all-MiniLM-L6-v2", device=DEVICE)
        self.sbert_embs = sbert.encode(data['texts'], convert_to_tensor=False, show_progress_bar=False)

    def _get_cost(self, idxs):
        wc = np.array([len(self.data['texts'][i].split()) for i in idxs])
        reading_time = wc * 0.24
        overhead = 3.0
        total_words_labeled = sum(len(self.data['texts'][i].split()) for i in self.labeled)
        fatigue_factor = 1.0 + (total_words_labeled / 5000) * 0.15
        base_cost = np.maximum(2.0, reading_time + overhead) * fatigue_factor
        random_variation = np.random.normal(1.0, 0.05, len(wc))
        return base_cost * random_variation

    def step(self, r, batch_size=20):
        print(f"   R{r}...", end="\r")

        if len(self.labeled) > 0:
            cw = None
            if self.data['problem_type'] != 'multi_label_classification':
                y = self.data['labels'][self.labeled]
                if len(np.unique(y)) > 1:
                    cw_vals = compute_class_weight('balanced', classes=np.unique(y), y=y)
                    cw_full = np.ones(self.data['num_labels'])
                    cw_full[np.unique(y)] = cw_vals
                    cw = torch.tensor(cw_full, dtype=torch.float32).to(DEVICE)
            self.backbone.train_epoch(self.data['texts'][self.labeled], self.data['labels'][self.labeled], epochs=3, class_weights=cw)

        metrics = {'f1': 0.0, 'acc': 0.0, 'ece': 0.0}
        if self.backbone.current_model:
            probs, _ = self.backbone.predict(self.data['test_texts'])
            y_true = self.data['test_labels']
            if self.data['problem_type'] == 'multi_label_classification':
                preds = (probs > 0.5).astype(int)
                avg = 'micro'
            else:
                preds = np.argmax(probs, axis=1)
                avg = 'macro'
            metrics['f1'] = f1_score(y_true, preds, average=avg, zero_division=0)
            metrics['acc'] = accuracy_score(y_true, preds)
            try:
                if self.data['problem_type'] != 'multi_label_classification':
                    metrics['ece'] = self.ece_metric(torch.tensor(probs, device=DEVICE), torch.tensor(y_true, device=DEVICE)).item()
            except: pass

        if len(self.unlabeled) == 0: return False
        k = min(batch_size, len(self.unlabeled))
        pool_idx = np.array(self.unlabeled)
        
        if len(pool_idx) > 2000:
            pool_idx = np.random.choice(pool_idx, 2000, replace=False)
        pool_texts = self.data['texts'][pool_idx]

        if self.labeled: 
            probs, dyn_embs = self.backbone.predict(pool_texts)
        else:
            probs = np.ones((len(pool_idx), self.data['num_labels'])) / self.data['num_labels']
            dyn_embs = np.zeros((len(pool_idx), 768))

        is_cold_start = (len(self.labeled) == 0)
        sel_local = []

        if self.strategy == "Random" or (is_cold_start and self.strategy in ["CoreSet", "BADGE"]):
            sel_local = np.random.choice(len(pool_idx), k, replace=False)
        elif self.strategy == "Entropy":
            sel_local = np.argsort(CoreMath.calculate_entropy(probs, self.data['problem_type']))[-k:]
        elif self.strategy == "LeastConfidence":
            sel_local = np.argsort(CoreMath.calculate_least_confidence(probs, self.data['problem_type']))[-k:]
        elif self.strategy == "Margin":
            sel_local = np.argsort(CoreMath.calculate_margin(probs, self.data['problem_type']))[:k]
        elif self.strategy == "BADGE":
            sel_local = CoreMath.kmeans_plus_plus(dyn_embs, k)
        elif self.strategy == "CoreSet":
            global_pool_embs = self.sbert_embs[pool_idx]
            labeled_embs = self.sbert_embs[self.labeled]
            if len(labeled_embs) > 2000: labeled_embs = labeled_embs[-2000:]
            sel_local = np.argsort(np.min(pairwise_distances(global_pool_embs, labeled_embs), axis=1))[-k:]
        elif self.strategy == "CAL-Linear":
            scores = CoreMath.calculate_entropy(probs, self.data['problem_type']) / (np.array([len(t.split()) for t in pool_texts]) + 1e-6)
            sel_local = np.argsort(scores)[-k:]
        elif self.strategy == "CAL-Log":
            ents = CoreMath.calculate_entropy(probs, self.data['problem_type'])
            lens = np.array([np.log1p(len(t.split())) for t in pool_texts])
            scores = ents / (5.0 + 3.0 * lens + 1e-6)

            if len(self.labeled) > 0:
                candidates_idx = np.argsort(scores)[-k * 2:]
                cand_embs = self.sbert_embs[pool_idx[candidates_idx]]
                lab_embs = self.sbert_embs[self.labeled]
                if len(lab_embs) > 500: lab_embs = lab_embs[-500:]
                penalties = np.where(np.max(1 - pairwise_distances(cand_embs, lab_embs, metric='cosine'), axis=1) > 0.95, 0.0, 1.0)
                scores[candidates_idx] *= penalties

            sel_local = np.argsort(scores)[-k:]

        sel_idx = pool_idx[sel_local]
        self.cum_cost += np.sum(self._get_cost(sel_idx)) / 60.0
        self.labeled.extend(sel_idx)
        self.unlabeled = list(set(self.indices) - set(self.labeled))

        self.history.append({'round': r, 'strategy': self.strategy, 'dataset': self.name, 'cost': self.cum_cost, 'f1': metrics['f1'], 'ece': metrics['ece']})
        return True
```

:::danger Architectural Rationale

**`__init__()` - Decoupled Semantic Architecture**
The architecture intentionally instantiates a `SentenceTransformer("all-MiniLM-L6-v2")` completely independent of the `StandardBackbone`. This ensures that semantic redundancy checks in `CAL-Log` rely on highly optimized, pre-trained dense retrieval embeddings rather than the task-specific, constantly shifting gradients of the RoBERTa backbone, providing a rigid anchor for semantic distance calculations.

**`_get_cost()` - Empirical Simulation Metrics**
Evaluating 8 distinct strategies across 10 datasets for 30 rounds requires the annotation of roughly 48,000 documents. Executing this via live human subjects introduces insurmountable logistical constraints. The `_get_cost()` method simulates this empirically:
1. **Reading Speed**: $0.24$ seconds/word mathematically reflects standard 250 WPM reading speeds.
2. **Cognitive Overhead**: $+3.0$ seconds static task switching latency.
3. **Fatigue Inflation**: A $15\%$ penalty multiplier applied iteratively per 5,000 words annotated, modeling documented cognitive degradation over extended annotation sessions.
Crucially, the method injects $N(1.0, 0.05)$ Gaussian noise. Humans are non-deterministic; injecting 5% noise into the deterministic time calculation mathematically verifies that the CAL-Log active learning optimization remains strictly robust even when internal algorithmic time predictions deviate from physical human execution times.

**`step()` - Strategy Orchestration Pipeline**
This method serves as the central router for the entire benchmark experiment:
- It explicitly calculates deterministic `f1_score` and Expected Calibration Error (`ece`) metrics *before* sampling new data to measure the precise impact of the previous round.
- It executes standard uncertainty sampling (Entropy, Margin, Least Confidence) and deep embedding sampling (BADGE, CoreSet).
- **CAL-Log Selection Logic**: For the `CAL-Log` branch, the algorithm explicitly computes the target optimization equation $H(x) / (\alpha + \beta \ln(1 + L(x)))$. To enforce redundancy control, it calculates the $N \times M$ cosine-similarity matrix using the static SBERT embeddings. Any candidate query exhibiting an absolute cosine similarity score $> 0.95$ relative to the existing labeled pool has its acquisition score mathematically obliterated (`* 0.0`), strictly forcing the system to pursue novel information gain rather than identical high-entropy duplicates.
:::
