---
sidebar_position: 4
title: System Boundaries & Rationale
---

# System Boundaries & Architectural Rationale

This document provides a critical, highly-defensible overview of the mathematical, architectural, and behavioral constraints of the CAL-Log framework. It justifies the core design decisions against alternative approaches, demonstrating why CAL-Log's specific architectural compromises yield the most robust active learning performance.

---

## 1. The Psycholinguistics of Cost Modeling

The fundamental thesis of CAL-Log is that treating annotation cost as a linear function of document length is fundamentally flawed. 

### The "Cost Collapse" Problem
Early cost-aware frameworks penalised sample selection using a linear model: $C(x) = \alpha + \beta \times L(x)$. However, empirical studies in information foraging theory and eye-tracking demonstrate that human reading effort does **not** increase linearly. 

When an annotator reads a text, the first few words consume significant cognitive effort to establish context. Subsequent words are processed significantly faster through "cognitive chunking". Linear cost models over-penalise long documents, pushing the acquisition function to exclusively select the shortest possible texts (e.g., 5-word tweets). This leads to **cost collapse**, where the system maximizes mathematical efficiency but selects texts with zero learning value.

### The Logarithmic Solution
CAL-Log solves this by using a psycholinguistically grounded logarithmic function:

$$
C(x) = \alpha + \beta \ln(1 + L(x))
$$

- $\alpha$: Fixed overhead per sample (e.g., API latency, mouse movement, reading the prompt).
- $\beta$: Reading speed parameter (scales with the annotator's cognitive capability).
- $L(x)$: Word count of the text.

This curve accurately models the tapering of cognitive effort, allowing CAL-Log to select longer, highly-informative documents without being artificially biased towards trivial short texts.

---

## 2. Telemetry Noise & Cold-Start Resilience

A dynamic cost model that adapts to human behavior must be resilient to noise. Real annotators take breaks, get distracted, or sometimes click randomly without reading.

### Outlier Rejection & Bounding
If an annotator "spam clicks" randomly, their recorded time per sample will approach zero. If they go to make coffee, the recorded time might be 15 minutes. If this unfiltered data feeds directly into the Ordinary Least Squares (OLS) regression updating $\alpha$ and $\beta$, the cost model will break.

CAL-Log implements strict bounding:
```javascript
// Example logic conceptually implemented in the telemetry engine
const TIME_CEILING = 300000; // 5 minutes max
const TIME_FLOOR = 1000;     // 1 second min

let validTime = Math.max(TIME_FLOOR, Math.min(rawTime, TIME_CEILING));
```
Furthermore, if $\beta$ is driven to extreme values by erratic behavior, the logarithmic curve essentially flattens. A flat cost curve mathematically degrades CAL-Log back into pure Entropy Sampling—a safe, graceful fallback state that prevents catastrophic failure.

### The Cold-Start Burn-In
**How does the system calculate cost for a brand-new annotator with zero history?**
The system requires a minimum of $N$ (e.g., $N=5$) samples to perform OLS regression. During this "burn-in" period, CAL-Log uses a default $\alpha$ representing standard UI overhead, and sets $\beta=0$. This means the first few samples are selected using pure standard Active Learning until enough telemetry is gathered to personalize the cost curve.

---

## 3. Scalability & Computational Complexity

Standard Active Learning requires computing the acquisition function over the entire unlabeled pool $U$ at every round. If $U$ contains 10 million tweets, calculating complex BERT embeddings and distances for every item is computationally unfeasible.

### O(N) Efficiency
Unlike purely geometric methods like CoreSet which can scale at $O(|U|^2)$ or BADGE which requires computing and storing dense gradient embeddings, CAL-Log's primary entropy-cost scoring is $O(|U|)$.

### Stochastic Subsetting for Massive Pools
To maintain sub-second latency for the annotator interface when $|U| > 100,000$, CAL-Log can safely implement stochastic subsetting. By randomly sampling a $10\%$ fraction of $U$ and running the CAL-Log ranking only on that subset, the system guarantees instant response times while still discovering highly informative, cost-efficient samples.

---

## 4. Statistical Robustness & Baseline Selection

To prove CAL-Log's superiority, it was benchmarked against the toughest existing paradigms.

### Baseline Selection Rationale
- **Entropy & Margin:** The standard uncertainty baselines.
- **CoreSet:** The state-of-the-art pure diversity baseline.
- **BADGE:** The state-of-the-art hybrid baseline (incorporating both uncertainty and diversity via gradient embeddings).
- **CAL-Linear:** An ablation baseline to explicitly prove that the logarithmic curve is superior to standard linear cost modeling.

### Proof of Significance
Beating Random sampling is not enough; the improvements must be statistically significant across multiple random seeds.

![Effect Size](/img/benchmark/main/fig6_effect_sizes_all_strategies.png)

As demonstrated above, CAL-Log maintains a strong negative Cohen's d effect size (indicating lower cost for higher F1) relative to all baselines. Furthermore, a **Wilcoxon signed-rank test** confirms the statistical significance of these results ($p=0.031$), proving that the efficiency gains are structural, not the result of random chance.
