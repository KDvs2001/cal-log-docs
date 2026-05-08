---
sidebar_position: 3
title: 3. Core Math
---

# Core Math (Entropy & Sampling)

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

:::danger Architectural Rationale
**Dynamic Entropy Selection (Single vs. Multi-label)**: Standard Shannon Entropy assumes classes are mutually exclusive (probabilities sum to 1). Applying this blindly to a multi-label task (e.g., the `civil_comments` toxicity dataset) causes structural mathematical failure. For multi-label scenarios, the system is strictly forced to use Binary Cross-Entropy (BCE), taking the average entropy of $N$ independent binary decisions.

**Probability Clipping (`1e-6` / `1e-12`)**: If a neural network outputs absolute certainty ($p=1.0$ or $p=0.0$), calculating $\log_2(0)$ causes a mathematical exception (`NaN`) that cascades through tensor operations, crashing NumPy/PyTorch. Adding a microscopic epsilon (`1e-12`) is a mandatory defensive programming practice in computational mathematics.
:::
