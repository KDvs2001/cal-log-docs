---
sidebar_position: 4
title: 4. Backbone & Calibration
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

:::danger Architectural Rationale
**Model Re-initialization per Round**: In active learning, incrementally training a model on newly queried data without resetting weights induces catastrophic forgetting; the model mathematically biases towards the most recently sampled data points. Retraining from a fresh `AutoModel.from_pretrained()` checkpoint ensures the model strictly learns the holistic representation of the currently labeled pool.

**LBFGS Temperature Scaling vs. Platt Scaling**: Modern transformer architectures (e.g., RoBERTa) are inherently overconfident. If the model universally outputs $p=0.99$, entropy flattens, reducing active learning to random sampling. Temperature scaling softens the logits via division by $T$. The `LBFGS` optimizer is vastly superior to `Adam` in this context because $T$ is a single 1D parameter; LBFGS computes the exact second-order derivative (Hessian approximation), converging on the globally optimal temperature in milliseconds.
:::
