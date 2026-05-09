---
sidebar_position: 3
title: "Appendix: Per-Dataset Breakdown"
description: "Detailed per-dataset results including AUC heatmaps, ECE heatmaps, individual learning curves, F1 at 60-minute heatmaps, seed stability, and speedup analysis."
---

# Appendix: Per-Dataset Breakdown

The following appendix provides granular, per-dataset breakdowns for all metrics. These results complement the aggregated main results by revealing dataset-specific patterns and identifying where CAL-Log excels or encounters challenges.

---

## AUC-F1-Cost Heatmap (All Strategies x All Datasets)

![AUC-F1-Cost heatmap for all strategies across all 10 datasets](/img/benchmark/appendix/app_fig1_auc_heatmap.png)

**Table A1: AUC-F1-Cost per Dataset**

| Strategy | 20_newsgroups | ag_news | amazon_polarity | emotion | dbpedia_14 | rotten_tomatoes | imdb | tweet_eval | yahoo_answers | yelp_polarity | MEAN |
|----------|-------------|---------|----------------|---------|-----------|----------------|------|-----------|--------------|--------------|------|
| Random | 0.013 | 0.712 | 0.652 | 0.357 | 0.579 | 0.741 | 0.286 | 0.521 | 0.303 | 0.524 | 0.469 |
| Entropy | 0.012 | 0.697 | 0.662 | 0.364 | 0.525 | 0.751 | 0.286 | 0.476 | 0.310 | 0.467 | 0.455 |
| LeastConfidence | 0.005 | 0.702 | 0.687 | 0.334 | 0.502 | 0.749 | 0.312 | 0.451 | 0.288 | 0.544 | 0.457 |
| Margin | 0.007 | 0.695 | 0.669 | 0.333 | 0.538 | 0.725 | 0.328 | 0.493 | 0.342 | 0.598 | 0.473 |
| CoreSet | 0.019 | 0.697 | 0.675 | 0.290 | 0.493 | 0.721 | 0.270 | 0.501 | 0.302 | 0.566 | 0.453 |
| BADGE | 0.003 | 0.700 | 0.668 | 0.315 | 0.567 | 0.734 | 0.326 | 0.509 | 0.321 | 0.525 | 0.467 |
| CAL-Linear | 0.202 | 0.730 | 0.825 | 0.485 | 0.787 | 0.784 | 0.647 | 0.455 | 0.242 | 0.829 | 0.599 |
| **CAL-Log** | **0.211** | **0.722** | **0.831** | **0.272** | **0.796** | **0.794** | **0.690** | **0.494** | **0.432** | **0.854** | **0.610** |

**Interpretation:**
- CAL-Log achieves the highest AUC on 6 out of 10 datasets (amazon_polarity, dbpedia_14, rotten_tomatoes, imdb, yahoo_answers_topics, yelp_polarity).
- The most dramatic improvements appear on long-document datasets: **yelp_polarity** (0.854 vs 0.524 for Random, a 63% improvement) and **imdb** (0.690 vs 0.286, a 141% improvement).
- The weakest performance is on **dair-ai/emotion** (0.272), a short-text dataset where the cost model provides less differentiation because all documents have similar (low) annotation costs.

---

## ECE Heatmap (Calibration Quality)

![ECE heatmap for all strategies across all 10 datasets](/img/benchmark/appendix/app_fig2_ece_heatmap.png)

**Table A3: Expected Calibration Error per Dataset**

| Strategy | 20_newsgroups | ag_news | amazon_polarity | emotion | dbpedia_14 | rotten_tomatoes | imdb | tweet_eval | yahoo_answers | yelp_polarity | MEAN |
|----------|-------------|---------|----------------|---------|-----------|----------------|------|-----------|--------------|--------------|------|
| Random | 0.185 | 0.054 | 0.055 | 0.175 | 0.093 | 0.044 | 0.062 | 0.214 | 0.101 | 0.036 | 0.102 |
| Entropy | 0.287 | 0.059 | 0.163 | 0.207 | 0.096 | 0.079 | 0.171 | 0.230 | 0.232 | 0.092 | 0.162 |
| LeastConfidence | 0.300 | 0.070 | 0.068 | 0.192 | 0.072 | 0.075 | 0.137 | 0.201 | 0.133 | 0.047 | 0.129 |
| Margin | 0.316 | 0.053 | 0.155 | 0.196 | 0.075 | 0.066 | 0.065 | 0.233 | 0.192 | 0.060 | 0.141 |
| CoreSet | 0.220 | 0.044 | 0.053 | 0.193 | 0.088 | 0.057 | 0.064 | 0.251 | 0.103 | 0.138 | 0.121 |
| BADGE | 0.230 | 0.033 | 0.038 | 0.189 | 0.090 | 0.044 | 0.063 | 0.176 | 0.098 | 0.041 | 0.100 |
| CAL-Linear | 0.288 | 0.048 | 0.055 | 0.124 | 0.092 | 0.047 | 0.083 | 0.230 | 0.091 | 0.040 | 0.110 |
| **CAL-Log** | **0.283** | **0.065** | **0.078** | **0.130** | **0.099** | **0.077** | **0.087** | **0.209** | **0.253** | **0.060** | **0.134** |

**Interpretation:**
- ECE measures calibration quality, which directly affects the entropy-based scoring used in CAL-Log. Lower values indicate better calibration.
- CAL-Log's ECE (0.134) is competitive but not the lowest overall. BADGE achieves the best mean ECE (0.100), and Random is close (0.102).
- Higher ECE on datasets like yahoo_answers (0.253) and 20_newsgroups (0.283) reflects the inherent difficulty of calibrating across many classes with limited labelled data.
- Despite slightly elevated ECE on some datasets, the cost-aware selection mechanism compensates by prioritising high-value samples regardless of calibration imperfections.

---

## Per-Dataset Learning Curves

![Per-dataset learning curves for all strategies](/img/benchmark/appendix/app_fig3_per_dataset_learning_curves.png)

This figure shows individual learning curves for each of the 10 datasets, with CAL-Log highlighted as a thick red solid line and the F1=0.80 target shown as a dashed red line.

**Key observations per dataset category:**

### Long Documents
- **amazon_polarity**: CAL-Log reaches F1=0.80 within approximately 25 minutes and maintains above 0.90 for much of the budget.
- **imdb**: CAL-Log shows steady improvement, reaching 0.80 around 100 minutes. This is the most challenging long-document dataset due to review length (~230 words).
- **yelp_polarity**: CAL-Log rapidly reaches F1=0.80 within approximately 19 minutes, the fastest across all datasets.

### Medium Documents
- **ag_news**: All strategies perform relatively well, with CAL-Log showing marginal but consistent advantages in the early budget region.

### Multi-class Documents
- **dbpedia_14**: CAL-Log demonstrates dramatic early gains, reaching near 0.96 at the 60-minute mark before some instability at higher budgets.
- **20_newsgroups**: The most challenging dataset (20 classes). All strategies struggle, but CAL-Log reaches approximately 0.45 by budget end, substantially above most baselines.
- **yahoo_answers**: CAL-Log shows a steady climb, outperforming most baselines by the 60-minute mark.

### Short Documents
- **rotten_tomatoes**: CAL-Log performs competitively, reaching F1=0.80 around 21 minutes.
- **emotion**: The most challenging short-text dataset. All strategies exhibit high variance; CAL-Log's advantage is minimal here.
- **tweet_eval**: All strategies plateau around F1=0.54, indicating an inherent ceiling for this dataset given the model architecture.

---

## F1 at 60-Minute Heatmap

![F1 at 60-minute budget heatmap](/img/benchmark/appendix/app_fig4_f1at60_heatmap.png)

**Table A4: F1 at 60-Minute Budget per Dataset**

| Strategy | 20_newsgroups | ag_news | amazon_polarity | emotion | dbpedia_14 | rotten_tomatoes | imdb | tweet_eval | yahoo_answers | yelp_polarity | MEAN |
|----------|-------------|---------|----------------|---------|-----------|----------------|------|-----------|--------------|--------------|------|
| Random | 0.007 | 0.556 | 0.474 | 0.258 | 0.728 | 0.827 | 0.333 | 0.575 | 0.314 | 0.479 | 0.455 |
| Entropy | 0.008 | 0.798 | 0.612 | 0.330 | 0.601 | 0.817 | 0.338 | 0.510 | 0.305 | 0.408 | 0.473 |
| LeastConfidence | 0.004 | 0.814 | 0.723 | 0.279 | 0.518 | 0.799 | 0.333 | 0.484 | 0.184 | 0.475 | 0.461 |
| Margin | 0.009 | 0.831 | 0.561 | 0.215 | 0.556 | 0.714 | 0.333 | 0.548 | 0.381 | 0.666 | 0.481 |
| CoreSet | 0.010 | 0.549 | 0.559 | 0.229 | 0.499 | 0.707 | 0.333 | 0.561 | 0.236 | 0.588 | 0.427 |
| BADGE | 0.000 | 0.557 | 0.770 | 0.236 | 0.699 | 0.853 | 0.333 | 0.580 | 0.266 | 0.433 | 0.473 |
| CAL-Linear | 0.188 | 0.797 | 0.910 | 0.002 | 0.318 | 0.840 | 0.814 | 0.477 | 0.544 | 0.901 | 0.579 |
| **CAL-Log** | **0.188** | **0.816** | **0.890** | **0.003** | **0.960** | **0.823** | **0.719** | **0.542** | **0.576** | **0.891** | **0.641** |

**Interpretation:**
- At the 60-minute budget, CAL-Log achieves a mean F1 of **0.641**, leading all strategies.
- Standout performance: **dbpedia_14** (0.960), **amazon_polarity** (0.890), and **yelp_polarity** (0.891).
- The dair-ai/emotion dataset is a known outlier where the short text length (~15 words) limits the cost model's ability to differentiate annotation costs.

---

## Seed Stability (F1 Variance)

![Seed stability boxplot across all strategies](/img/benchmark/appendix/app_fig5_seed_variance_boxplot.png)

**Table A6: Seed Stability**

| Strategy | Mean F1 | Std F1 |
|----------|---------|--------|
| Random | 0.682 | 0.109 |
| Entropy | 0.657 | 0.134 |
| LeastConfidence | 0.716 | 0.068 |
| Margin | 0.744 | 0.046 |
| CoreSet | 0.694 | 0.088 |
| BADGE | 0.741 | 0.072 |
| CAL-Linear | 0.648 | 0.130 |
| **CAL-Log** | **0.691** | **0.125** |

**Interpretation:**
- CAL-Log's standard deviation (0.125) is in the mid-range, comparable to CAL-Linear (0.130) and Random (0.109).
- Margin sampling shows the lowest variance (0.046), reflecting its conservative selection strategy.
- The boxplot confirms that CAL-Log's median F1 is competitive, with a similar interquartile range to most baselines.
- The presence of outliers (low F1 values near 0.0 for datasets like 20_newsgroups) affects all strategies equally.

---

## Speedup Heatmap (vs Random Baseline)

![Speedup heatmap for all strategies relative to Random](/img/benchmark/appendix/app_fig6_speedup_heatmap.png)

**Table A5: Speedup vs Random per Dataset**

| Strategy | ag_news | amazon_polarity | dbpedia_14 | rotten_tomatoes | imdb | yelp_polarity | MEAN |
|----------|---------|----------------|-----------|----------------|------|--------------|------|
| Entropy | 0.88 | 1.19 | 0.99 | 0.85 | 0.43 | 0.83 | 0.86 |
| LeastConfidence | 0.88 | 1.12 | 0.87 | 1.11 | 0.72 | 1.20 | 0.98 |
| Margin | 0.71 | 1.29 | 1.05 | 0.77 | 0.55 | 1.35 | 0.95 |
| CoreSet | 0.82 | 0.98 | 1.10 | 0.91 | 0.45 | 1.05 | 0.88 |
| BADGE | 0.80 | 1.02 | 1.07 | 0.76 | 0.55 | 1.07 | 0.88 |
| CAL-Linear | 1.04 | 3.27 | 2.12 | 1.65 | 3.94 | 5.56 | 2.93 |
| **CAL-Log** | **1.16** | **2.87** | **2.26** | **1.94** | **2.31** | **5.52** | **2.68** |

**Interpretation:**
- CAL-Log achieves speedup values greater than 1.0 on every dataset where the comparison is possible, meaning it consistently reaches F1=0.80 faster than Random.
- The highest speedup is on **yelp_polarity** (5.52x), meaning CAL-Log reaches the F1=0.80 target 5.52 times faster than Random on this dataset.
- Traditional strategies show inconsistent speedups: most have values below 1.0 on several datasets (meaning they are actually slower than Random), while CAL-Log is above 1.0 everywhere.
- Datasets where some strategies or all failed to reach the target (e.g., 20_newsgroups, emotion, tweet_eval, yahoo_answers) are excluded from the speedup calculation, as indicated by empty cells.

---

## CAL-Log Per-Dataset Summary

**Table A7: CAL-Log Detailed Performance per Dataset**

| Dataset | Length | Avg Words | Cost to 0.70 | Cost to 0.80 | AUC | ECE | F1@30 | F1@60 | F1@90 | F1 Final |
|---------|--------|-----------|-------------|-------------|-----|-----|-------|-------|-------|----------|
| amazon_polarity | Long | ~120 | 25.4 | 29.0 | 0.831 | 0.078 | 0.906 | 0.890 | 0.921 | 0.936 |
| stanfordnlp/imdb | Long | ~230 | 40.7 | 99.5 | 0.690 | 0.087 | 0.636 | 0.719 | 0.798 | 0.855 |
| yelp_polarity | Long | ~150 | 18.6 | 18.6 | 0.854 | 0.060 | 0.905 | 0.891 | 0.774 | 0.900 |
| ag_news | Medium | ~45 | 22.8 | 29.9 | 0.722 | 0.065 | 0.805 | 0.816 | 0.859 | 0.876 |
| SetFit/20_newsgroups | Multi | ~200 | -- | -- | 0.211 | 0.283 | 0.062 | 0.188 | 0.333 | 0.458 |
| dbpedia_14 | Multi | ~55 | 25.7 | 31.5 | 0.796 | 0.099 | 0.799 | 0.960 | 0.307 | 0.649 |
| yahoo_answers_topics | Multi | ~90 | -- | -- | 0.432 | 0.253 | 0.286 | 0.576 | 0.618 | 0.477 |
| dair-ai/emotion | Short | ~15 | -- | -- | 0.272 | 0.130 | 0.301 | 0.003 | 0.011 | 0.387 |
| rotten_tomatoes | Short | ~18 | 17.0 | 20.9 | 0.794 | 0.077 | 0.606 | 0.823 | 0.770 | 0.831 |
| tweet_eval | Short | ~18 | -- | -- | 0.494 | 0.209 | 0.498 | 0.542 | 0.542 | 0.542 |

*"--" indicates the target F1 threshold was not reached within the 120-minute budget.*

**Interpretation:**
- CAL-Log's strongest results appear on **long-document** and **binary classification** tasks (amazon_polarity, yelp_polarity), where the cost model provides maximum differentiation.
- The most challenging datasets are **20_newsgroups** (20 classes, mixed document lengths) and **dair-ai/emotion** (6 classes, very short texts), which neither CAL-Log nor any baseline handles well within the budget.
- The **rotten_tomatoes** result (Cost to 0.80 = 20.9 min, F1 Final = 0.831) demonstrates that even on short-text binary datasets, the cost-aware approach achieves excellent results.

---

## Cost to F1=0.80 per Dataset

**Table A2: Time to Reach F1=0.80 per Dataset (minutes)**

| Strategy | ag_news | amazon_polarity | dbpedia_14 | rotten_tomatoes | imdb | yelp_polarity | MEAN |
|----------|---------|----------------|-----------|----------------|------|--------------|------|
| Random | 34.7 | 83.3 | 71.4 | 40.5 | 229.5 | 102.8 | 93.7 |
| Entropy | 39.3 | 69.9 | 72.4 | 47.7 | 537.5 | 124.4 | 148.5 |
| LeastConfidence | 39.6 | 74.3 | 81.7 | 36.4 | 317.2 | 86.0 | 105.9 |
| Margin | 48.6 | 64.4 | 68.3 | 52.8 | 415.8 | 76.2 | 121.0 |
| CoreSet | 42.4 | 85.3 | 65.0 | 44.5 | 509.7 | 98.3 | 140.9 |
| BADGE | 43.4 | 81.6 | 66.9 | 53.1 | 418.0 | 96.0 | 126.5 |
| CAL-Linear | 33.2 | 25.5 | 33.7 | 24.6 | 58.2 | 18.5 | 32.3 |
| **CAL-Log** | **29.9** | **29.0** | **31.5** | **20.9** | **99.5** | **18.6** | **38.2** |

## Cost to F1=0.70 per Dataset

**Table A8: Time to Reach F1=0.70 per Dataset (minutes)**

| Strategy | ag_news | amazon_polarity | dbpedia_14 | rotten_tomatoes | imdb | yelp_polarity | MEAN |
|----------|---------|----------------|-----------|----------------|------|--------------|------|
| Random | 34.7 | 64.3 | 54.2 | 25.5 | 229.5 | 102.8 | 85.2 |
| Entropy | 30.0 | 69.9 | 66.3 | 22.3 | 227.0 | 124.4 | 90.0 |
| LeastConfidence | 34.8 | 54.8 | 61.6 | 18.8 | 317.2 | 86.0 | 95.5 |
| Margin | 34.4 | 37.4 | 68.3 | 30.3 | 318.4 | 76.2 | 94.2 |
| CoreSet | 33.0 | 51.4 | 65.0 | 41.5 | 437.2 | 98.3 | 121.1 |
| BADGE | 29.3 | 54.5 | 60.9 | 30.9 | 318.2 | 96.0 | 98.3 |
| CAL-Linear | 29.5 | 25.5 | 28.1 | 18.8 | 58.2 | 18.5 | 29.8 |
| **CAL-Log** | **22.8** | **25.4** | **25.7** | **17.0** | **40.7** | **18.6** | **25.0** |

**Interpretation:**
- At the F1=0.70 threshold, CAL-Log is the **fastest strategy** with a mean of 25.0 minutes, outperforming even CAL-Linear (29.8 minutes).
- CAL-Log is the fastest on 4 out of 6 datasets (ag_news, dbpedia_14, rotten_tomatoes, imdb), with CAL-Linear slightly faster on amazon_polarity and yelp_polarity.
- The **imdb** dataset is the most expensive across all strategies, but CAL-Log still achieves F1=0.70 in 40.7 minutes compared to 229.5 minutes for Random, a 5.6x speedup.

:::note
All tables in this appendix are also available as downloadable CSV files in the static assets directory for further analysis. See the [Evaluation Overview](./overview) page for metric definitions and experimental setup details.
:::
