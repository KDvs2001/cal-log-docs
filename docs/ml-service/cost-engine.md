---
sidebar_position: 2
title: Cost Engine
---

# cost_engine.py - Adaptive Cost Model

**File**: `ml_service/cost_engine.py` (203 lines)  
**Role**: Implements the adaptive cost function $C(x) = \alpha + \beta \cdot \ln(1 + L(x))$ with OLS regression for real-time parameter estimation.

## Viva Summary
> [!NOTE]
> **For the Viva**: The Cost Engine is what makes CAL-Log "Cost-Aware". Instead of assuming all documents take the same amount of time to read, it predicts the reading time (Cost) based on document length. After every 5 annotations, it runs an **Ordinary Least Squares (OLS) regression** on your real reading times to dynamically update $\alpha$ (cognitive overhead) and $\beta$ (reading speed multiplier). This means the system adapts to *your* personal reading speed in real-time.

### The OLS Regression Cycle

```mermaid
flowchart TD
    A[Annotator completes 5 tasks] --> B[Collect (Length, Time) pairs]
    B --> C{Are there outliers?}
    C -- Yes (>5 min) --> D[Discard outlier]
    C -- No --> E
    D --> E[Check Variance]
    E --> F{Variance > 0.3?}
    F -- No --> G[Fallback: Direct Estimation]
    F -- Yes --> H[Full OLS Regression]
    H --> I[Calculate new Alpha & Beta]
    G --> I
    I --> J[Clamp to sensible bounds (e.g. Beta 0.1-15)]
    J --> K[Update Cost Engine State]
    K --> L[Next /predict uses new parameters]
```

## Class: `AdaptiveCostModel`

### Constructor

```python
class AdaptiveCostModel:
    def __init__(self):
        self.alpha = 5.0  # Cold start - will be overwritten by regression
        self.beta = 3.0   # Cold start - will be overwritten by regression
        self.user_history = []  # [(log_length, time_seconds), ...]
```

Both α and β start at conservative defaults. After the first 5 annotations with sufficient text-length variance, they are **entirely replaced** by OLS-derived values. The cold-start values are never used again.

### `_heuristic_cost()` - Core Formula

```python
def _heuristic_cost(self, log_length: float) -> float:
    """Calculate cost: C(x) = alpha + beta * log(1 + L(x))"""
    return self.alpha + (self.beta * log_length)
```

This is the simplest function in the system, but the most important. Every ranking decision flows through this multiplication.

### `predict()` - Batch Cost Estimation

```python
def predict(self, text_lengths: list) -> np.ndarray:
    """Predict annotation cost for a list of text lengths."""
    log_lengths = np.log1p(text_lengths)  # ln(1 + x), numerically stable
    predicted_costs = [self._heuristic_cost(l) for l in log_lengths]
    return np.array(predicted_costs)
```

Called by `CALLogRanker.calculate_costs()` on every `/predict` request. Converts raw word counts to predicted seconds.

### `update()` - OLS Regression

This is the most mathematically dense function. See [OLS Regression](/mathematics/ols-regression) for the full derivation.

```python
def update(self, new_interaction_logs: list):
    # 1. Add new interactions, filtering outliers (>5 min)
    for log in new_interaction_logs:
        x_feat = np.log1p(log['length'])
        y_target = log['time_seconds']
        if y_target < 300:
            self.user_history.append([x_feat, y_target])

    # 2. Rolling window of last 5
    WINDOW_SIZE = 5
    history_to_use = self.user_history[-WINDOW_SIZE:]

    if len(history_to_use) >= 3:
        data = np.array(history_to_use)
        log_lengths = data[:, 0]
        times = data[:, 1]
        
        length_variance = np.std(log_lengths)
        
        if length_variance < 0.3:
            # LOW VARIANCE FALLBACK
            avg_time = np.mean(times)
            avg_log_len = np.mean(log_lengths)
            new_alpha = max(1.0, min(avg_time * 0.2, 5.0))
            new_beta = (avg_time - new_alpha) / max(avg_log_len, 0.1)
        else:
            # FULL OLS REGRESSION
            A = np.column_stack([np.ones(len(log_lengths)), log_lengths])
            result, _, _, _ = np.linalg.lstsq(A, times, rcond=None)
            new_alpha, new_beta = result[0], result[1]
            
            # Log R² for academic defensibility
            residuals = times - A @ result
            ss_res = np.sum(residuals ** 2)
            ss_tot = np.sum((times - np.mean(times)) ** 2)
            r_squared = 1 - (ss_res / max(ss_tot, 1e-9))
        
        # Clamp to physically sensible ranges
        self.alpha = max(1.0, min(15.0, new_alpha))
        self.beta = max(0.1, min(15.0, new_beta))
```

**Critical implementation details**:

1. **Outlier filtering**: Any annotation taking >300 seconds (5 minutes) is discarded - the evaluator was likely distracted, not reading
2. **Variance check**: When `std(log_lengths) < 0.3`, all texts are similar length and OLS can't distinguish α from β. Falls back to direct estimation.
3. **R² logging**: The coefficient of determination is computed and logged so regression quality can be defended in the viva
4. **Clamping**: Both parameters are bounded to prevent nonsensical predictions (e.g., negative cost)

### `_get_speed_label()` - Classification

```python
def _get_speed_label(self) -> str:
    if self.beta < 1.5:
        return "FAST SKIMMER"
    elif self.beta > 3.0:
        return "CAREFUL READER"
    else:
        return "BALANCED"
```

Simple threshold classification on β. This label appears in the Spy Window but has **no effect** on task selection - the cost formula handles adaptation implicitly.

### `get_reading_pattern()` - Full Report

Returns a dictionary consumed by the Spy Window's reading pattern display:

```python
{
    "pattern": "fast_skimmer",
    "description": "Fast reader - low beta means cost formula naturally favors...",
    "beta": 1.23,
    "alpha": 3.45,
    "baseline_beta": 3.0,
    "avg_time": 4.2,
    "sample_size": 5
}
```

The `baseline_beta: 3.0` field lets the frontend show "below/above baseline" comparisons.
