---
sidebar_position: 2
title: OLS Regression
---

# OLS Regression for Parameter Estimation

The alpha (α) and beta (β) parameters of the cost function are **not hardcoded** — they are derived entirely from data using Ordinary Least Squares (OLS) regression on the annotator's real-time annotation telemetry.

## The Regression Problem

Given a set of observed annotations, each with a measured `time_seconds` and `word_count`, we fit:

$$
t_i = \alpha + \beta \cdot \ln(1 + L_i) + \epsilon_i
$$

Where:
- $t_i$ = observed annotation time for task $i$ (seconds)
- $L_i$ = word count of task $i$
- $\epsilon_i$ = residual error
- $\alpha, \beta$ = parameters to estimate

## OLS Solution

We construct the design matrix $\mathbf{A}$ and solve:

$$
\min_{\alpha, \beta} \| \mathbf{A} \cdot \begin{bmatrix} \alpha \\ \beta \end{bmatrix} - \mathbf{t} \|^2
$$

Where:

$$
\mathbf{A} = \begin{bmatrix} 1 & \ln(1 + L_1) \\ 1 & \ln(1 + L_2) \\ \vdots & \vdots \\ 1 & \ln(1 + L_n) \end{bmatrix}, \quad \mathbf{t} = \begin{bmatrix} t_1 \\ t_2 \\ \vdots \\ t_n \end{bmatrix}
$$

This is solved via `np.linalg.lstsq()` — NumPy's least-squares solver.

## Implementation Detail

```python
def update(self, new_interaction_logs: list):
    # Add new interactions to history
    for log in new_interaction_logs:
        x_feat = np.log1p(log['length'])
        y_target = log['time_seconds']
        if y_target < 300:  # Filter outliers (> 5 min)
            self.user_history.append([x_feat, y_target])

    # Rolling window of last 5 interactions
    WINDOW_SIZE = 5
    history_to_use = self.user_history[-WINDOW_SIZE:]

    if len(history_to_use) >= 3:  # Need 3+ points for meaningful regression
        data = np.array(history_to_use)
        log_lengths = data[:, 0]  # x = log(1 + word_count)
        times = data[:, 1]        # y = time_seconds

        # Check for sufficient variance
        length_variance = np.std(log_lengths)
        if length_variance < 0.3:
            # LOW VARIANCE FALLBACK: direct speed estimation
            avg_time = np.mean(times)
            avg_log_len = np.mean(log_lengths)
            new_alpha = max(1.0, min(avg_time * 0.2, 5.0))
            new_beta = (avg_time - new_alpha) / max(avg_log_len, 0.1)
        else:
            # OLS regression: time = alpha + beta * log_length
            A = np.column_stack([np.ones(len(log_lengths)), log_lengths])
            result, _, _, _ = np.linalg.lstsq(A, times, rcond=None)
            new_alpha, new_beta = result[0], result[1]

        # Clamp to reasonable ranges
        new_alpha = max(1.0, min(15.0, new_alpha))  # 1-15 seconds overhead
        new_beta = max(0.1, min(15.0, new_beta))     # 0.1-15x reading speed
```

## Rolling Window Strategy

The regression uses a **rolling window of the last 5 interactions** instead of the full history. This ensures:

1. **Fast adaptation**: The cost model responds to fatigue within 5 annotations
2. **Recency bias**: Recent reading speed matters more than speed 30 minutes ago
3. **Minimal memory**: Only 5 data points stored, not the entire session

## Low Variance Fallback

When all 5 recent texts have similar lengths (std < 0.3 in log space), OLS can't distinguish α from β because the regression line has insufficient "spread" in the x-axis. In this case:

$$
\hat{\alpha} = \text{clamp}\left(0.2 \cdot \bar{t}, 1.0, 5.0\right)
$$

$$
\hat{\beta} = \frac{\bar{t} - \hat{\alpha}}{\max(\overline{\ln(1+L)}, 0.1)}
$$

This direct estimation attributes 20% of the average time to fixed overhead and the remainder to reading speed.

## Regression Quality Metric (R²)

The coefficient of determination is logged after each update:

$$
R^2 = 1 - \frac{SS_{res}}{SS_{tot}} = 1 - \frac{\sum(t_i - \hat{t}_i)^2}{\sum(t_i - \bar{t})^2}
$$

| R² Value | Interpretation |
|----------|----------------|
| > 0.8 | Excellent fit — log-cost model captures reading speed well |
| 0.5 — 0.8 | Moderate fit — some noise from task difficulty variation |
| < 0.5 | Poor fit — reader behaviour is erratic or distracted |

## Parameter Clamping

Both parameters are clamped to physically sensible ranges:

| Parameter | Min | Max | Rationale |
|-----------|-----|-----|-----------|
| α | 1.0s | 15.0s | Sub-second overhead is unrealistic; >15s suggests distraction |
| β | 0.1 | 15.0 | Near-zero beta means length doesn't matter; >15 means extreme fatigue |

## Update Trigger

Parameters update every **5 annotations**, synchronised with the model retraining cycle. This ensures:
1. Cost model and ML model update together
2. Rankings reflect both updated predictions AND updated costs
3. The Spy Window shows parameter changes at consistent intervals
