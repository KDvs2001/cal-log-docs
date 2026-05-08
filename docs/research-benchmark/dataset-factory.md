---
sidebar_position: 2
title: 2. Dataset Factory
---

# Dataset Factory & Preprocessing

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

:::danger Architectural Rationale
**Dynamic Column Mapping vs. Fixed Schemas**: Real-world data is highly unstructured. By writing a dynamic mapper that systematically probes for likely column names (e.g., `text`, `content`, `tweet`), we empirically prove the system is robust and generalizable. Hardcoded schemas would render the active learning algorithm overly coupled to specific dataset structures.

**Dropping Texts $<5$ Characters**: Extremely short texts (e.g., "ok", "yes") carry practically zero information gain for the model. However, under the cognitive cost model, reading *any* text incurs the base task-switching overhead ($\alpha$). Including negligible-length texts severely skews the logarithmic cost simulation, artificially inflating the performance of naive uncertainty sampling baselines.
:::
