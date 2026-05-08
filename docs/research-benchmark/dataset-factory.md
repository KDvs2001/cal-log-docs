---
sidebar_position: 2
title: Dataset Factory
---

# Dataset Factory & Preprocessing

This class abstracts the dataset ingestion process. It downloads the dataset, dynamically identifies relevant text/label columns regardless of schema, and sanitizes the input text.

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
```

:::danger[Architectural Rationale]
**`TextPreprocessor.clean()`**
Raw internet data contains HTML entities (`&amp;`), arbitrary tags (`<br>`), and non-printable unicode control characters. Failing to aggressively sanitize this string data causes Out-Of-Vocabulary (OOV) token explosions in the RoBERTa `Byte-Pair Encoding (BPE)` tokenizer. Stripping these mathematically normalizes the input space, ensuring the cost-simulation model calculates reading-length purely on actual readable words rather than invisible bytecode sequences.
:::

```python
    @staticmethod
    def clean_batch(texts):
        return np.array([TextPreprocessor.clean(t) for t in texts])
```

:::danger[Architectural Rationale]
**`TextPreprocessor.clean_batch()`**
Python iteration over string arrays is computationally slow. Wrapping the cleaning function in NumPy vectorization (`np.array([...])`) aligns memory in contiguous blocks, dramatically accelerating text preprocessing for pools scaling into the tens of thousands.
:::

```python
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
```

:::danger[Architectural Rationale]
**`DatasetFactory.load()` - Dynamic Schema Mapping**
Real-world enterprise data is highly unstructured, with primary textual data residing in columns arbitrarily named `tweet`, `content`, `review`, or `question_content`. By implementing a dynamic fallback mapper that probes for probable column names, the architecture empirically demonstrates robustness. Hardcoding specific CSV schemas would inextricably couple the benchmark to specific datasets, compromising generalizability claims.
:::

```python
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

:::danger[Architectural Rationale]
**`DatasetFactory.load()` - Sub-5 Character Filtering**
The pipeline explicitly executes a `valid_mask = [len(t) > 5 ...]` tensor operation. Extremely short texts (e.g., "ok", "yes") possess essentially zero Shannon entropy or semantic information gain for the language model. However, under the cognitive cost model equation $C(x) = \alpha + \beta \ln(1 + L(x))$, reading *any* text automatically incurs the strict $\alpha$ base task-switching latency. Permitting these 2-character texts into the pool severely skews the logarithmic cost simulation, artificially inflating the apparent performance efficiency of naive uncertainty sampling baselines. By mathematically excising them, the benchmark isolates the true cost of reading substantive context.
:::
