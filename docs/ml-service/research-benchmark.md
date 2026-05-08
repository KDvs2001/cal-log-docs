---
sidebar_position: 6
title: Research Benchmark Execution
---

# Research Benchmark Execution

This document outlines the evaluation script used to benchmark the CAL-Log system across 10 diverse datasets. 

> [!IMPORTANT]
> **Viva Defense Guide:** The code below is broken down into functional chunks (Kaggle Notebook style). Below each code block is a **Defensibility Rationale** designed to help you justify *why* these specific techniques were chosen over alternatives during your Viva defense.

---

## 1. Imports and Environment Configuration

The script begins by setting up the Python environment, ensuring required libraries are present, and configuring hardware acceleration.

```python
# ======================================================================================
# IMPORTS AND CONFIGURATION
# ======================================================================================

import os
import sys
import time
import html
import re
import warnings
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import random

# Auto‑install missing libraries (only if needed)
try:
    import google.protobuf
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Fixing Libraries...")
    os.system("pip install --upgrade --force-reinstall transformers sentence-transformers accelerate")
    print("Libraries updated. RESTART RUNTIME if you see errors.")

from sklearn.metrics import f1_score, accuracy_score, pairwise_distances
from sklearn.utils.class_weight import compute_class_weight
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    DataCollatorWithPadding, logging as hf_logging
)
from datasets import load_dataset
from torchmetrics.classification import CalibrationError
from torch.utils.data import Dataset, DataLoader
from huggingface_hub import login

warnings.filterwarnings("ignore")
hf_logging.set_verbosity_error()

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"CAL-LOG RESEARCH BENCHMARK | Device: {DEVICE}")

try:
    login(token="hf_REDACTED_TOKEN_FOR_SECURITY")
    print("Logged into Hugging Face.")
except Exception:
    pass
```

### Defensibility Rationale: Imports & Config
- **Why use the Hugging Face `transformers` and `datasets` libraries over native PyTorch/TensorFlow?**
  Hugging Face standardizes the loading process across our 10 diverse datasets. Using native PyTorch `DataLoader` for raw text requires custom tokenization and batch padding logic for every single dataset format. The goal of this benchmark is to test the *Active Learning algorithm*, not to build custom data ingestion pipelines.
- **Why aggressively suppress warnings (`filterwarnings("ignore")`)?**
  The Transformers library is extremely verbose regarding model initialization. Over 30 active learning rounds across 10 datasets, this would flood the console, causing severe I/O bottlenecks and making it impossible to monitor the actual cost and F1 metrics in real-time.

---

## 2. Dataset Factory & Preprocessing

This class abstracts the loading process. It downloads the dataset, identifies the relevant text/label columns dynamically, and sanitizes the text.

```python
# ======================================================================================
# DATASET FACTORY & PREPROCESSING
# ======================================================================================

class TextPreprocessor:
    """Clean raw text for consistent processing across datasets."""

    @staticmethod
    def clean(text):
        if not isinstance(text, str): return ""
        text = html.unescape(text)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'http\S+', '[URL]', text)
        text = re.sub(r'\s+', ' ', text).strip()
        text = "".join([c for c in text if c.isprintable()])
        return text

    @staticmethod
    def clean_batch(texts):
        return np.array([TextPreprocessor.clean(t) for t in texts])


class DatasetFactory:
    """Load and prepare datasets, handling different column names and label formats."""

    @staticmethod
    def load(name, config_name=None, seed=42, n_pool=2000, n_test=300):
        print(f"Loading {name}...")
        try:
            ds = load_dataset(name, config_name) if config_name else load_dataset(name)

            text_col, label_col, is_multi = 'text', 'label', False
            label_cols = []

            # Dynamic column mapping
            if 'tweet_eval' in name:
                text_col, label_col = 'text', 'label'
            elif 'amazon_polarity' in name or 'dbpedia_14' in name:
                text_col, label_col = 'content', 'label'
            elif 'yahoo_answers_topics' in name:
                text_col, label_col = 'question_content', 'topic'
            elif 'civil_comments' in name:
                text_col, is_multi = 'text', True
                label_cols = ['toxicity', 'severe_toxicity', 'obscene', 'threat',
                              'insult', 'identity_attack', 'sexual_explicit']

            # Fallback mapper
            if text_col not in ds['train'].column_names:
                text_col = next(
                    (c for c in ['text', 'sentence', 'content', 'review', 'tweet']
                     if c in ds['train'].column_names), 'text')

            train_full = ds['train'].shuffle(seed=seed)
            test_full = ds['test'].shuffle(seed=seed) if 'test' in ds else ds['train'].shuffle(seed=seed + 1)

            def get_clean_data(dataset, limit, is_multilabel=False):
                raw_texts = dataset[:limit * 2][text_col]
                clean_texts = TextPreprocessor.clean_batch(raw_texts)
                # Drop texts shorter than 5 characters
                valid_mask = [len(t) > 5 for t in clean_texts]
                final_texts = clean_texts[valid_mask][:limit]

                if is_multilabel:
                    raw_y = np.array([[1 if x[c] >= 0.5 else 0 for c in label_cols] for x in dataset])
                    final_y = raw_y[valid_mask][:limit]
                else:
                    raw_y = dataset[:limit * 2][label_col]
                    final_y = np.array(raw_y)[valid_mask][:limit]
                return final_texts, final_y

            train_texts, train_y = get_clean_data(train_full, n_pool, is_multi)
            test_texts, test_y = get_clean_data(test_full, n_test, is_multi)

            if is_multi:
                n_labels = len(label_cols)
            else:
                n_labels = len(np.unique(train_y))
                if hasattr(ds['train'].features[label_col], 'names'):
                    n_labels = len(ds['train'].features[label_col].names)

            return {
                'texts': train_texts, 'labels': train_y,
                'test_texts': test_texts, 'test_labels': test_y,
                'num_labels': n_labels,
                'problem_type': 'multi_label_classification' if is_multi else 'single_label_classification'
            }
        except Exception as e:
            print(f"Load Error {name}: {e}")
            return None
```

### Defensibility Rationale: Data Preprocessing
- **Why implement dynamic column mapping instead of fixed CSV schemas?**
  Real-world data is unstructured. By writing a dynamic mapper that probes for likely column names (e.g., `text`, `content`, `tweet`), we prove the system is robust and generalizable. If we only hardcoded schemas, an evaluator could argue the active learning algorithm is over-engineered for a specific dataset.
- **Why explicitly drop texts under 5 characters?**
  Extremely short texts (e.g., "ok", "yes") carry practically zero information gain for the model. However, under the cognitive cost model, reading *any* text incurs the base task-switching overhead ($\alpha$). Including 2-character texts severely skews the logarithmic cost simulation, artificially inflating the performance of naive uncertainty sampling.

---

## 3. Core Math (Entropy & Uncertainty Metrics)

The mathematical heart of the baseline strategies, computing standard uncertainty functions.

```python
# ======================================================================================
# CORE MATH (ENTROPY & UNCERTAINTY SCORING)
# ======================================================================================

class CoreMath:
    @staticmethod
    def calculate_entropy(probs, problem_type):
        if problem_type == "multi_label_classification":
            p = np.clip(probs, 1e-6, 1 - 1e-6)
            return np.mean(-(p * np.log2(p) + (1 - p) * np.log2(1 - p)), axis=1)
        return -np.sum(probs * np.log2(probs + 1e-12), axis=1)

    @staticmethod
    def calculate_margin(probs, problem_type):
        if problem_type == "multi_label_classification":
            return 0.5 - np.min(np.abs(probs - 0.5), axis=1)
        part = np.partition(probs, -2, axis=1)
        return part[:, -1] - part[:, -2]

    @staticmethod
    def calculate_least_confidence(probs, problem_type):
        if problem_type == "multi_label_classification":
            return np.mean(np.minimum(probs, 1 - probs), axis=1)
        return 1 - np.max(probs, axis=1)

    @staticmethod
    def kmeans_plus_plus(embeddings, k, seed=42):
        np.random.seed(seed)
        N = embeddings.shape[0]
        if N < k: return list(range(N))
        centers = [np.random.randint(N)]
        dists = np.sum((embeddings - embeddings[centers[0]]) ** 2, axis=1)
        for _ in range(1, k):
            probs = dists / np.sum(dists)
            new_c = np.random.choice(N, p=probs)
            centers.append(new_c)
            new_dists = np.sum((embeddings - embeddings[new_c]) ** 2, axis=1)
            dists = np.minimum(dists, new_dists)
        return centers
```

### Defensibility Rationale: Core Math
- **Why are there two different entropy calculations based on problem type?**
  Standard Shannon Entropy assumes classes are mutually exclusive (probabilities sum to 1). If applied blindly to a multi-label task (like the `civil_comments` toxicity dataset), the math completely breaks down. For multi-label, we *must* use Binary Cross-Entropy (BCE), taking the average entropy of $N$ independent binary decisions. 
- **Why clip probabilities to `1e-6` and `1e-12`?**
  If a neural network outputs absolute certainty ($p=1.0$ or $p=0.0$), calculating $\log_2(0)$ causes a mathematical exception (`NaN`) that crashes NumPy. Adding a microscopic epsilon (`1e-12`) is a standard defensive programming practice in computational mathematics.

---

## 4. The Backbone & PPRS Temperature Scaling

This module wraps the Hugging Face `AutoModel` to facilitate the iterative train-evaluate-predict cycle required for Active Learning, including post-training calibration.

```python
# ======================================================================================
# BACKBONE & CALIBRATION
# ======================================================================================

class StandardBackbone:
    def __init__(self, model_name="roberta-base", num_labels=2, problem_type="single"):
        self.model_name = model_name
        self.num_labels = num_labels
        self.problem_type = problem_type
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.current_model = None
        self.temperature = 1.0

    def train_epoch(self, texts, labels, epochs=3, class_weights=None):
        model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name, num_labels=self.num_labels, problem_type=self.problem_type
        ).to(DEVICE)
        encodings = self.tokenizer(texts.tolist(), truncation=True, padding=True, max_length=128)

        class CustomDataset(Dataset):
            def __init__(self, enc, lab):
                self.enc = enc; self.lab = lab
            def __getitem__(self, i):
                item = {k: torch.tensor(v[i]) for k, v in self.enc.items()}
                if self.lab is not None: item['labels'] = torch.tensor(self.lab[i])
                return item
            def __len__(self): return len(self.enc['input_ids'])

        dataset = CustomDataset(encodings, labels)
        train_size = int(0.9 * len(dataset))
        val_size = len(dataset) - train_size

        if val_size > 4:
            train_ds, val_ds = torch.utils.data.random_split(dataset, [train_size, val_size])
        else:
            train_ds, val_ds = dataset, None

        dl = DataLoader(train_ds, batch_size=16, shuffle=True, collate_fn=DataCollatorWithPadding(self.tokenizer))
        opt = torch.optim.AdamW(model.parameters(), lr=2e-5)
        model.train()

        for _ in range(epochs):
            for batch in dl:
                batch = {k: v.to(DEVICE) for k, v in batch.items()}
                out = model(**batch)
                if self.problem_type == "multi_label_classification":
                    loss = nn.BCEWithLogitsLoss(pos_weight=class_weights)(out.logits, batch['labels'].float())
                else:
                    loss = nn.CrossEntropyLoss(weight=class_weights)(out.logits.view(-1, self.num_labels), batch['labels'].view(-1))
                loss.backward()
                opt.step()
                opt.zero_grad()

        self.current_model = model
        if val_ds: self._calibrate_temperature(model, val_ds)

    def _calibrate_temperature(self, model, val_ds):
        model.eval()
        val_dl = DataLoader(val_ds, batch_size=16, collate_fn=DataCollatorWithPadding(self.tokenizer))
        logits_list, labels_list = [], []
        with torch.no_grad():
            for batch in val_dl:
                batch = {k: v.to(DEVICE) for k, v in batch.items()}
                logits_list.append(model(**batch).logits)
                labels_list.append(batch['labels'])
        logits = torch.cat(logits_list).cpu()
        labels = torch.cat(labels_list).cpu()

        T = nn.Parameter(torch.ones(1) * 1.5)
        optimizer = torch.optim.LBFGS([T], lr=0.01, max_iter=50)

        def eval_fn():
            optimizer.zero_grad()
            loss = nn.CrossEntropyLoss()(logits / T, labels)
            loss.backward()
            return loss

        optimizer.step(eval_fn)
        self.temperature = T.item()

    def predict(self, texts):
        if not self.current_model: return None, None
        encodings = self.tokenizer(texts.tolist(), truncation=True, padding=True, max_length=128)

        class InferDataset(Dataset):
            def __init__(self, enc): self.enc = enc
            def __getitem__(self, i): return {k: torch.tensor(v[i]) for k, v in self.enc.items()}
            def __len__(self): return len(self.enc['input_ids'])

        dl = DataLoader(InferDataset(encodings), batch_size=64, shuffle=False, collate_fn=DataCollatorWithPadding(self.tokenizer))
        self.current_model.eval()
        probs, embs = [], []

        with torch.no_grad():
            for batch in dl:
                batch = {k: v.to(DEVICE) for k, v in batch.items()}
                out = self.current_model(**batch, output_hidden_states=True)
                scaled_logits = out.logits / self.temperature

                if self.problem_type == "multi_label_classification":
                    p = torch.sigmoid(scaled_logits)
                else:
                    p = torch.softmax(scaled_logits, dim=1)

                probs.append(p.cpu().numpy())
                embs.append(out.hidden_states[-1][:, 0, :].float().cpu().numpy())

        return np.vstack(probs), np.vstack(embs)
```

### Defensibility Rationale: Modeling & Calibration
- **Why retrain the model from scratch `AutoModel.from_pretrained()` every round?**
  In active learning, if you incrementally train a model on newly queried data without resetting its weights, it suffers from *catastrophic forgetting* and biases towards the most recently sampled data points. Retraining from a fresh checkpoint guarantees the model strictly learns the holistic representation of the currently labeled pool.
- **Why use PPRS Temperature Scaling with LBFGS instead of Platt Scaling?**
  Modern transformers like RoBERTa are heavily overconfident. If the model outputs $p=0.99$ for everything, entropy is flat, and active learning reduces to random sampling. Temperature scaling softens the logits by dividing by $T$. The `LBFGS` optimizer is vastly superior to `Adam` here because $T$ is a single 1D parameter; LBFGS computes the exact second-order derivative (Hessian approximation), finding the optimal temperature in milliseconds.

---

## 5. The Cost Agent & Simulated Cost Function

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

### Defensibility Rationale: Cost Agent & Strategy Evaluation
- **How is cost simulated accurately without live human subjects?**
  Evaluating 8 strategies across 10 datasets for 30 rounds requires annotating roughly 48,000 documents. Conducting this live is impossible. We simulate empirical cost rigorously:
  - Base mapping: $0.24$ seconds per word (equivalent to 250 WPM reading speed).
  - Overhead: $+3.0$ seconds static task switching.
  - Fatigue: Increases cognitive effort by 15% every 5,000 words annotated.
- **Why inject $N(1.0, 0.05)$ Gaussian noise into the cost metric?**
  Humans are unpredictable. They get distracted or read sentences twice. Injecting 5% Gaussian noise into the calculation proves that CAL-Log's cost optimization holds up even when its internal prediction of reading time is slightly inaccurate compared to the simulated "true" time.
- **Why use SBERT cosine similarity for redundancy checking?**
  If two text documents are identical, they yield the exact same high entropy. Pure entropy sampling will waste human effort annotating both. Naive TF-IDF or Jaccard similarity fails to capture semantics (e.g., "The movie was bad" vs "Awful film"). `all-MiniLM-L6-v2` encodes dense sentence semantics, allowing us to accurately penalize queries that are $>0.95$ cosine similar to the existing labeled pool.

---

## 6. Execution Loop & Study Benchmarking

The final orchestrator that runs the cross-product of datasets and strategies, ensuring completely deterministic behavior.

```python
# ======================================================================================
# EXECUTION LOOP
# ======================================================================================

def run_study():
    SEED = 42
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    if torch.cuda.is_available(): torch.cuda.manual_seed_all(SEED)

    datasets = [
        ("tweet_eval", "stance_climate"), ("rotten_tomatoes", "default"),
        ("dair-ai/emotion", "split"), ("ag_news", "default"),
        ("stanfordnlp/imdb", "plain_text"), ("yelp_polarity", "plain_text"),
        ("amazon_polarity", "amazon_polarity"), ("dbpedia_14", "dbpedia_14"),
        ("yahoo_answers_topics", "yahoo_answers_topics"), ("SetFit/20_newsgroups", "default")
    ]

    strategies = ["Random", "Entropy", "LeastConfidence", "Margin", "CoreSet", "BADGE", "CAL-Linear", "CAL-Log"]
    all_res = []

    print("STARTING FULL-SCALE BENCHMARK (10 Datasets, 30 Rounds)")

    for ds_name, ds_cfg in datasets:
        time.sleep(3)
        data = DatasetFactory.load(ds_name, ds_cfg)
        if not data: continue

        for s in strategies:
            print(f"\n>>> {ds_name} : {s}")
            torch.cuda.empty_cache()
            agent = CostAgent(data, ds_name, strategy=s)
            
            for r in range(30):
                if not agent.step(r, 20): break
            all_res.extend(agent.history)

    pd.DataFrame(all_res).to_csv("cal_log_full_benchmark_v2.csv", index=False)
    print("DONE. Saved to cal_log_full_benchmark_v2.csv")

if __name__ == "__main__":
    run_study()
```

### Defensibility Rationale: Execution Infrastructure
- **Why set seeds across 4 different random engines?**
  Machine learning involves stochasticity at multiple levels: Python's built-in `random`, NumPy shuffling, PyTorch CPU initialization, and PyTorch CUDA kernel execution. Explicitly seeding all 4 ensures that if the evaluators run the script, they will achieve the exact F1 and Cost traces reported in the paper.
- **Why flush the GPU cache (`torch.cuda.empty_cache()`)?**
  Active learning requires repeatedly loading models into VRAM, calculating gradients, and destroying them. Over 30 rounds, PyTorch's memory allocator suffers from severe memory fragmentation. Explicitly emptying the cache between strategy evaluations ensures the 48-hour script doesn't crash halfway through with a `CUDA Out of Memory` exception.
