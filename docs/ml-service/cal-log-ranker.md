---
sidebar_position: 3
title: CAL-Log Ranker
---

# cal_log_ranker.py - Task Ranking Engine

**File**: `ml_service/models/cal_log_ranker.py` (154 lines)  
**Role**: Implements the core CAL-Log formula: `Score = Entropy / Cost`. This class is the mathematical bridge between the cost model and the ML backbone.

## Class: `CALLogRanker`

### Constructor

```python
class CALLogRanker:
    def __init__(self, cost_model):
        self.cost_model = cost_model  # Reference to AdaptiveCostModel
```

The ranker holds a **reference** to the cost model (not a copy). This means when OLS regression updates α and β in the cost model, the ranker automatically uses the new values on the next ranking call.

### `calculate_entropy()` - Shannon Entropy

```python
def calculate_entropy(self, probabilities: np.ndarray) -> np.ndarray:
    """
    A raw [0.5, 0.5] output = max entropy (1.0) = model is guessing.
    We want these highly uncertain items because they teach the model the most.
    
    Args:
        probabilities: Shape (n_tasks, n_classes)
    Returns:
        entropy: Shape (n_tasks,) - higher = more uncertain
    """
    epsilon = 1e-9  # Prevents log(0) → -inf
    entropy = -np.sum(probabilities * np.log(probabilities + epsilon), axis=1)
    return entropy
```

The epsilon guard is essential because `np.log(0.0)` produces `-inf`, which would propagate through all subsequent calculations as `NaN`.

### `calculate_costs()` - Predicted Annotation Time

```python
def calculate_costs(self, texts: List[str]) -> np.ndarray:
    """Predict seconds to annotate each text."""
    lengths = [len(t.split()) for t in texts]
    costs = self.cost_model.predict(lengths)
    return costs
```

This function bridges the ranker to the cost model. Word counts are computed via `str.split()` (whitespace tokenisation), which is fast and doesn't require NLP libraries.

### `rank_by_cal_log()` - The Core Algorithm

```python
def rank_by_cal_log(
    self, 
    tasks: List[Dict[str, Any]], 
    probabilities: np.ndarray,
    penalties: np.ndarray = None
) -> List[Dict[str, Any]]:
    texts = [t['text'] for t in tasks]
    
    # Calculate components
    entropy = self.calculate_entropy(probabilities)
    costs = self.calculate_costs(texts)
    
    # THE CAL-LOG FORMULA
    scores = entropy / costs
    
    # Apply deduplication penalties if provided
    if penalties is not None:
        final_scores = scores * penalties
    else:
        final_scores = scores
    
    # Sort descending - most information-per-second first
    sorted_indices = np.argsort(final_scores)[::-1]
```

**Line-by-line breakdown**:

1. **`entropy = self.calculate_entropy(probabilities)`** - Vector of Shannon entropy values, shape `(N,)`
2. **`costs = self.calculate_costs(texts)`** - Vector of predicted seconds, shape `(N,)`
3. **`scores = entropy / costs`** - Element-wise division. This single line IS the CAL-Log algorithm.
4. **`np.argsort(final_scores)[::-1]`** - Get indices sorted descending. `argsort` returns ascending order; `[::-1]` reverses it.

### Transparency Report Generation

Each ranked task includes a full transparency report for the Spy Window:

```python
task_resp = {
    "id": tasks[idx]['taskId'],
    "text": tasks[idx]['text'],
    "score": float(final_scores[idx]),
    "prediction": {
        "label_index": int(np.argmax(probabilities[idx])),
        "confidence": float(np.max(probabilities[idx]))
    },
    "transparency_report": {
        "phase": "CAL-Log Active",
        "cost_analysis": {
            "predicted_seconds": float(costs[idx]),
            "context_penalty": "Adaptive"
        },
        "math_proof": {
            "entropy": float(entropy[idx]),
            "redundancy_penalty": float(penalties[idx]),
            "cal_log_score": float(scores[idx]),
            "final_adjusted_score": float(final_scores[idx])
        }
    }
}
```

This report enables **full mathematical auditability** - every component of the score is exposed, allowing the evaluator (or viva examiner) to verify the computation independently.

## Module Registration

The `models/__init__.py` package file explicitly exports `CALLogRanker`:

```python
from .cal_log_ranker import CALLogRanker
__all__ = ['CALLogRanker']
```

This keeps the import in `simulation_server.py` clean (`from models.cal_log_ranker import CALLogRanker`) and prevents namespace pollution.
