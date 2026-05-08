---
slug: /
sidebar_position: 1
title: Introduction
---

# CAL-Log: Cost-Aware Active Learning with Logarithmic Cost

**CAL-Log** is an advanced research platform designed to empirically evaluate active learning strategies for text classification. Unlike traditional uncertainty sampling techniques that blindly pick the most uncertain documents - often selecting long, exhausting texts - CAL-Log selects annotation tasks based on **information gain per unit of cognitive cost**, adapting dynamically to individual annotator reading speeds.

## Research Problem

In real-world NLP annotation pipelines, the dominant cost is **human time**. Standard active learning methods (e.g., uncertainty sampling, BADGE) optimise for model accuracy but ignore the variable cost of annotating different documents. A 500-word article takes 5x longer to annotate than a 100-word tweet, yet both count equally in traditional sampling strategies.

**CAL-Log solves this** by introducing a mathematically grounded cost function that models individual annotator fatigue and reading speed, then divides information gain by predicted cost to maximise the *efficiency* of every annotation.

## Core Contribution

The CAL-Log scoring formula:

$$
\text{Score}(x) = \frac{H(x)}{C(x)}
$$

Where:
- $H(x)$ = Shannon entropy from the classifier's softmax output (information value)
- $C(x) = \alpha + \beta \cdot \ln(1 + L(x))$ - adaptive cost function
- $\alpha$ = fixed cognitive overhead (task-switching, reading prompt, deciding)
- $\beta$ = reading speed multiplier, estimated via OLS regression on the annotator's real-time telemetry

## Published Research

This system accompanies the following published and accepted papers:

> **Kariyakaranage, V. S. & Athuraliya, B.** (2026). "AL-X0: Cost-Aware Active Learning for Cloud-Scale NLP via Zero-Shot Proxy Valuation." *2026 International Conference on Artificial Intelligence in Information and Communication (ICAIIC)*, pp. 657-662. DOI: [10.1109/ICAIIC68212.2026.11454245](https://doi.org/10.1109/ICAIIC68212.2026.11454245)

> **Kariyakaranage, V. S. & Athuraliya, B.** (2026). "CAL-Log: Calibration-Aware Logarithmic Cost Modeling for Active Learning in Low-Resource NLP." *2026 IEEE International Research Conference on Smart Computing and Systems Engineering (SCSE)*, vol. 9, pp. 1-6. DOI: [10.1109/SCSE70081.2026.11499970](https://doi.org/10.1109/SCSE70081.2026.11499970)

> **Kariyakaranage, V. S. & Athuraliya, B.** (2026). "Boundary Conditions of Cost-Aware Active Learning: A Multi-Dataset Taxonomy of Calibration and Length-Variance Failure Modes." *2026 IEEE 15th International Conference on Communication Systems and Network Technologies (CSNT)*, pp. 1317-1322. DOI: [10.1109/CSNT69054.2026.11502457](https://doi.org/10.1109/CSNT69054.2026.11502457)

> **Kariyakaranage, V. S. & Athuraliya, B.** (2026). "CAL-Log: Cost-Aware Active Learning with Logarithmic Cognitive Effort Modeling and Online Adaptation to Human Annotation Behavior." *Accepted to the 64th Annual Meeting of the Association for Computational Linguistics (ACL 2026) Student Research Workshop (SRW)*. San Diego, California, United States.

## Research Objectives

1. **Empirical Cost Optimization** - Demonstrate that a cost-aware scoring engine reduces total annotation duration compared to random sampling and pure entropy sampling baselines.
2. **Fatigue Modeling** - Accurately predict and account for annotator fatigue using a dynamic OLS regression model based on an alpha-beta logarithmic reading curve.
3. **Transparent Evaluation** - Provide absolute structural transparency to the evaluator via the "Spy Window", exposing real-time Shannon entropy values, cost penalty calculations, and dynamic algorithm behaviour.

## System Demo

> [!TIP]
> **Watch the full 8-minute system walkthrough below:**

<div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', maxWidth: '100%', borderRadius: '8px', marginBottom: '2rem' }}>
  <iframe 
    src="https://www.youtube.com/embed/PJI-27_Q6o0" 
    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowFullScreen
    title="CAL-Log System Demo"
  />
</div>

## System Overview

CAL-Log is implemented as a **4-tier architecture**:

| Tier | Technology | Purpose |
|------|-----------|---------|
| **Presentation** | React 18 + Vite | Annotation UI, real-time visualisation |
| **Application** | Node.js + Express | REST API, session management, MongoDB |
| **Analytics & ML** | Python + Flask | Cost engine, ranking, shadow benchmarking |
| **Data** | MongoDB Atlas | Session persistence, feedback storage |

## Quick Navigation

- **[Architecture Overview](./architecture/overview)** - 4-tier system design and component relationships
- **[Mathematics](./mathematics/cost-function)** - The cost function, OLS regression, entropy scoring
- **[ML Service](./ml-service/simulation-server)** - Line-by-line code walkthroughs of the Python backend
- **[Server](./server/express-setup)** - Node.js API routes and database models
- **[Client](./client/app-structure)** - React component hierarchy and UI design decisions
- **[API Reference](./api-reference/ml-endpoints)** - Full endpoint documentation
- **[Citations](./citations)** - All academic and technical references
