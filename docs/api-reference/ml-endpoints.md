---
sidebar_position: 1
title: ML Service Endpoints
---

# ML Service API (Flask — Port 9090)

All endpoints are served by `simulation_server.py`.

## `POST /predict`

**Purpose**: Rank tasks from the server's pool and return the top candidates.

### Request
```json
{
    "labeled_task_ids": [0, 5, 12, 23, 41]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `labeled_task_ids` | `number[]` | IDs of tasks already annotated (to exclude from pool) |

### Response
```json
{
    "tasks": [
        {
            "id": 1234,
            "data": { "text": "This movie was absolutely fantastic..." },
            "true_label": null
        }
    ],
    "shadow_metrics": {
        "cal_log": {
            "avg_len": 142.3,
            "estimated_cost": 16.4,
            "avg_entropy": 0.687,
            "info_efficiency": 0.0419,
            "selected_ids": [1234, 5678, 9012],
            "audit_trail": [...]
        },
        "entropy": { ... },
        "random": { ... }
    },
    "pool_remaining": 49732
}
```

| Field | Description |
|-------|-------------|
| `tasks` | Top 25 ranked tasks (sorted by Score = H/C) |
| `tasks[].true_label` | Always `null` — ground truth is never leaked to the client |
| `shadow_metrics` | What each strategy would have picked (for Spy Window) |
| `pool_remaining` | How many unlabeled tasks remain |

---

## `POST /annotate`

**Purpose**: Report a completed annotation and trigger learning updates.

### Request
```json
{
    "text": "This movie was absolutely fantastic...",
    "label": "Positive",
    "time_taken": 8.45
}
```

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | Full text of the annotated task |
| `label` | `string` | `"Positive"` or `"Negative"` |
| `time_taken` | `number` | Seconds spent reading (measured by frontend) |

### Response
```json
{
    "status": "ok",
    "alpha": 4.23,
    "beta": 2.87,
    "trained": true
}
```

| Field | Description |
|-------|-------------|
| `alpha` | Current cost model α after update |
| `beta` | Current cost model β after update |
| `trained` | `true` if model was retrained on this step (every 5 annotations) |

---

## `POST /reset`

**Purpose**: Complete session reset for a new contestant.

### Request
No body required.

### Response
```json
{
    "status": "ok",
    "message": "Session fully reset",
    "alpha": 5.0,
    "beta": 3.0
}
```

Resets: backbone weights, cost model, shadow models, all buffers, accuracy history, spy files, and re-shuffles the pool.

---

## `GET /health`

**Purpose**: Health check — frontend polls this to verify the service is alive.

### Response
```json
{
    "status": "ok",
    "alpha": 4.23,
    "beta": 2.87,
    "mode": "Real Research",
    "accuracy_history": [
        { "step": 0, "cal_log": 0.5, "random": 0.5, "entropy": 0.5 },
        { "step": 5, "cal_log": 0.72, "random": 0.65, "entropy": 0.68 }
    ]
}
```

---

## `GET /spy/selection`

**Purpose**: Return the reasoning behind the last selected task.

### Response
```json
{
    "selected_task_id": 1234,
    "score": 0.042,
    "entropy": 0.691,
    "cost": 16.4,
    "alpha": 4.23,
    "beta": 2.87,
    "reasoning": "Score (0.042) = Entropy (0.691) / Cost (16.4s) ...",
    "task_stats": {
        "length": 234,
        "percentile": 45.2,
        "max_len": 1200,
        "avg_len": 189.3,
        "length_class": "medium",
        "length_description": "medium length (33-67 percentile)"
    },
    "reading_pattern": {
        "pattern": "balanced",
        "description": "Balanced pace - cost formula optimizes entropy/cost ratio normally",
        "beta": 2.87,
        "alpha": 4.23,
        "baseline_beta": 3.0,
        "avg_time": 7.2,
        "sample_size": 5
    },
    "pattern_reasoning": "velocity_profile='Balanced' (beta=2.87 ~ 3.0)..."
}
```

---

## `GET /spy/history`

**Purpose**: Alpha/beta convergence timeline.

### Response
```json
[
    { "step": 0, "alpha": 5.0, "beta": 3.0 },
    { "step": 5, "alpha": 4.5, "beta": 2.8 },
    { "step": 10, "alpha": 4.2, "beta": 2.9 }
]
```

---

## `GET /spy/metrics`

**Purpose**: Accuracy history and cumulative costs per strategy.

### Response
```json
{
    "accuracy_history": [
        { "step": 0, "cal_log": 0.5, "random": 0.5, "entropy": 0.5 }
    ],
    "step": 15,
    "alpha": 4.2,
    "beta": 2.9,
    "cumulative_costs": {
        "cal_log": 245.6,
        "entropy": 312.4,
        "random": 289.1,
        "history": [
            { "batch": 1, "cal_log": 16.4, "entropy": 21.2, "random": 18.9 }
        ]
    }
}
```

---

## `GET /spy/task_log`

**Purpose**: Persistent log of all task selections.

### Response
```json
[
    {
        "step": 0,
        "selected_id": 1234,
        "length": 234,
        "cost": 16.4,
        "beta": 3.0,
        "timestamp": "auto_generated"
    }
]
```
