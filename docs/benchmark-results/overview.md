---
sidebar_position: 1
title: "Evaluation Overview"
description: "Comprehensive benchmark evaluation of CAL-Log against seven active learning baselines across ten text classification datasets."
---

# Benchmark Evaluation Overview

This section presents the full empirical evaluation of the **CAL-Log** (Cost-Aware Active Learning with Logarithmic Cost) strategy against seven established active learning baselines. The benchmark was conducted across **10 diverse text classification datasets**, each run with **3 random seeds** to ensure reproducibility.

## Experimental Setup

### Strategies Evaluated

| Strategy | Type | Description |
|----------|------|-------------|
| **Random** | Passive | Uniform random sampling (baseline) |
| **Entropy** | Uncertainty | Selects samples with highest predictive entropy |
| **LeastConfidence** | Uncertainty | Selects samples where the model is least confident |
| **Margin** | Uncertainty | Selects samples with smallest margin between top-2 predictions |
| **CoreSet** | Diversity | Greedy coreset selection for geometric diversity |
| **BADGE** | Hybrid | Batch Active learning by Diverse Gradient Embeddings |
| **CAL-Linear** | Cost-Aware | Cost-aware ranking with linear cost model |
| **CAL-Log** | Cost-Aware | Cost-aware ranking with logarithmic cost model (proposed) |

### Datasets

The evaluation spans 10 datasets covering different text lengths and classification complexities:

| Dataset | Length Category | Approx. Words | Classes |
|---------|---------------|---------------|---------|
| amazon_polarity | Long | ~120 words | 2 |
| stanfordnlp/imdb | Long | ~230 words | 2 |
| yelp_polarity | Long | ~150 words | 2 |
| ag_news | Medium | ~45 words | 4 |
| SetFit/20_newsgroups | Multi | ~200 words | 20 |
| dbpedia_14 | Multi | ~55 words | 14 |
| yahoo_answers_topics | Multi | ~90 words | 10 |
| dair-ai/emotion | Short | ~15 words | 6 |
| rotten_tomatoes | Short | ~18 words | 2 |
| tweet_eval | Short | ~18 words | 3 |

### Evaluation Metrics

The benchmark evaluates each strategy on the following metrics:

- **AUC-F1-Cost**: Area under the F1 vs. annotation time curve, normalised to 120 minutes. Higher is better; captures overall efficiency across the entire budget window.
- **Cost to F1=0.80**: Annotation time (minutes) required to first reach macro-F1 of 0.80. Lower is better.
- **Cost to F1=0.70**: Annotation time (minutes) required to first reach macro-F1 of 0.70. Lower is better.
- **F1 at Fixed Budgets**: Macro-F1 score achieved at 30, 60, 90, and 120 minute budget checkpoints.
- **ECE**: Expected Calibration Error. Lower is better; measures how well predicted probabilities match observed frequencies.
- **Speedup vs Random**: Ratio of Random's time-to-target divided by strategy's time-to-target. Values above 1.0 indicate the strategy reaches the target faster than random sampling.

### Reproducibility

Each experiment is seeded with 3 independent random seeds. Results reported as mean values across all seeds and datasets unless otherwise noted. Error bars and confidence intervals represent the standard error of the mean (SEM) or 95% confidence intervals as specified per figure.

:::info Raw Data
All raw CSV tables used to generate these results are available for download in the `benchmark-tables` directory of the static assets.
:::
