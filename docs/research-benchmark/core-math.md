---
sidebar_position: 3
title: Core Math
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
```

:::danger[Architectural Rationale]
**`calculate_entropy()`**
This method enforces a strict mathematical bifurcation. Standard Shannon Entropy $H(X) = -\sum P(x) \log_2 P(x)$ intrinsically assumes probability masses are mutually exclusive (sum to 1). Applying this blindly to multi-label tensor outputs completely disintegrates the math. For multi-label paradigms, the method explicitly computes Binary Cross-Entropy (BCE) averages across $N$ independent binary decisions. Furthermore, neural networks outputting absolute certainty ($p=1.0$ or $p=0.0$) causes $\log_2(0)$ to throw `NaN` exceptions during gradient/matrix operations. The `np.clip(probs, 1e-6)` tensor clamping serves as a mandatory numerical stabilizer preventing complete PyTorch pipeline collapse.
:::

```python
    @staticmethod
    def calculate_margin(probs, problem_type):
        if problem_type == "multi_label_classification":
            return 0.5 - np.min(np.abs(probs - 0.5), axis=1)
        part = np.partition(probs, -2, axis=1)
        return part[:, -1] - part[:, -2]
```

:::danger[Architectural Rationale]
**`calculate_margin()`**
Raw entropy treats all classes equally, which can misrepresent uncertainty if the model is just generally confused. `calculate_margin()` isolates the top two predicted probabilities and calculates their difference. A margin approaching $0$ means the model is severely torn between the two most likely classes (straddling the decision boundary). In multi-label scenarios, the margin is computed as the distance from the $0.5$ activation threshold ($0.5 - |p - 0.5|$).
:::

```python
    @staticmethod
    def calculate_least_confidence(probs, problem_type):
        if problem_type == "multi_label_classification":
            return np.mean(np.minimum(probs, 1 - probs), axis=1)
        return 1 - np.max(probs, axis=1)
```

:::danger[Architectural Rationale]
**`calculate_least_confidence()`**
This provides the most direct measure of maximum predictive uncertainty via $1 - \max(p)$. It aggressively targets samples where the model's highest confidence activation is extremely weak, serving as a baseline anchor to compare against our more complex `CAL-Log` multi-variate optimizations.
:::

```python
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

:::danger[Architectural Rationale]
**`kmeans_plus_plus()`**
The `BADGE` strategy relies on cluster centroids to ensure diversity in the queried pool. However, naive K-Means initialization is highly susceptible to poor localized seeding, and running full Lloyd's algorithm iteratively on 768-dimensional embeddings at every Active Learning step introduces catastrophic latency. `kmeans_plus_plus()` resolves this by probabilistically seeding initial centers proportional to the squared distance ($D^2$) from the nearest existing center. This mathematically guarantees a wide, diverse spatial distribution of anchor points in $O(Nd)$ time before any actual clustering iteration begins.
:::
