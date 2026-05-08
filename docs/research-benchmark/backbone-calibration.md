---
sidebar_position: 4
title: Backbone & Calibration
---

# The Backbone & Calibration

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
```

:::danger[Architectural Rationale]
**`__init__()`**
The class explicitly defaults to `roberta-base`. RoBERTa provides a heavily optimized contextual embedding space compared to standard BERT, serving as a powerful, academically accepted standard for text classification baselines without the astronomical VRAM overhead of massive LLMs.
:::

```python
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
```

:::danger[Architectural Rationale]
**`train_epoch()` - Model Re-initialization**
Notice that `AutoModelForSequenceClassification.from_pretrained()` is called *inside* the training method, fundamentally destroying the previous model weights. In Active Learning, incrementally fine-tuning a model on newly sampled data without resetting weights mathematically induces catastrophic forgetting; gradients aggressively bias toward the highly uncertain, most recently sampled data points. Retraining from a fresh checkpoint guarantees the model explicitly learns the holistic, unbiased representation of the currently labeled pool. It also implements dynamic `class_weights` mapped directly into `BCEWithLogitsLoss` and `CrossEntropyLoss` to actively penalize class imbalances inherent in the initial random sampling phases.
:::

```python
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
```

:::danger[Architectural Rationale]
**`_calibrate_temperature()` - PPRS Calibration**
Modern transformer architectures are structurally overconfident. If a model universally outputs $p=0.99$ due to softmax saturation, entropy flattens completely, and active uncertainty sampling mathematically degrades into pure random sampling. PPRS Temperature Scaling rectifies this by dividing raw logits by a scalar $T$. This method deploys the `LBFGS` optimizer over standard `AdamW` because $T$ is a strictly 1-dimensional parameter. LBFGS computes the exact second-order derivative (the Hessian approximation), converging on the mathematically optimal temperature scalar in milliseconds rather than requiring extensive epoch iterations.
:::

```python
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

:::danger[Architectural Rationale]
**`predict()` - Batched Inference & Feature Extraction**
The prediction step must serve two distinct masters: probability mapping for Entropy/Margin sampling, and dense feature extraction for BADGE/CoreSet sampling. This method natively batches inference to prevent CUDA memory overflows, extracts `out.hidden_states[-1][:, 0, :]` (the final hidden `[CLS]` token representation) to serve as the dense embedding space, and finally applies the previously calculated `self.temperature` scalar before executing the final `softmax` or `sigmoid` activation tensors.
:::
