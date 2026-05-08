---
sidebar_position: 2
title: Server Endpoints
---

# Node.js Server API (Express - Port 5001)

All endpoints are mounted under `/api` and served by `server/index.js`.

## Session API

### `POST /api/session/save`

**Purpose**: Upsert evaluator session progress.

```json
// Request
{
    "contestantId": "eval_001",
    "annotationCount": 15,
    "labeledTaskIds": [0, 5, 12, 23, 41, ...],
    "cumulativeTimeSaved": 42.3,
    "cumulativeEntropyCost": 312.4,
    "cumulativeRandomCost": 289.1,
    "cumulativeCalLogCost": 245.6,
    "newAnnotation": {
        "taskId": 1234,
        "textSnippet": "This movie was absolutely...",
        "wordCount": 234,
        "label": "Positive",
        "timeSeconds": 8.45,
        "alpha": 4.23,
        "beta": 2.87,
        "timestamp": "2026-05-08T16:30:00.000Z",
        "annotationIndex": 15
    }
}
```

```json
// Response
{
    "success": true,
    "session": {
        "contestantId": "eval_001",
        "annotationCount": 15,
        "labeledTaskIds": [0, 5, 12, ...],
        "cumulativeTimeSaved": 42.3,
        "lastUpdated": "2026-05-08T16:30:00.000Z"
    }
}
```

### `GET /api/session/load/:contestantId`

**Purpose**: Load a previously saved session.

```json
// Response (session exists)
{
    "exists": true,
    "session": {
        "contestantId": "eval_001",
        "annotationCount": 15,
        "labeledTaskIds": [0, 5, 12, ...],
        "annotations": [ ... ],
        "lastUpdated": "2026-05-08T16:30:00.000Z"
    }
}

// Response (no session)
{
    "exists": false,
    "session": null
}
```

### `POST /api/session/reset/:contestantId`

**Purpose**: Reset session to zero (preserves document row).

```json
// Response
{
    "success": true,
    "message": "Session reset successfully"
}
```

---

## Experiment API

### `GET /api/experiments`

**Purpose**: Fetch all benchmark results.

```json
// Response
[
    {
        "dataset": "imdb",
        "strategy": "Random",
        "totalCost": 18000,
        "f1Score": 0.82,
        "accuracy": 0.82,
        "tasksAnnotated": 800,
        "pValue": 1.0,
        "cohensD": 0.0
    },
    {
        "dataset": "imdb",
        "strategy": "CAL-Log",
        "totalCost": 9500,
        "f1Score": 0.84,
        "tasksAnnotated": 450,
        "pValue": 0.001,
        "cohensD": 0.92
    }
]
```

### `POST /api/experiments/seed`

**Purpose**: Reset and re-insert baseline benchmark data (idempotent).

```json
// Response
{
    "message": "Seeding successful",
    "count": 3
}
```

---

## Feedback API

### `POST /api/feedback`

**Purpose**: Submit evaluator feedback survey.

```json
// Request
{
    "sessionId": "session_eval_001_1715193000",
    "role": "Postgraduate / PhD student",
    "nlpFamiliarity": "Intermediate",
    "selfReportedReadingStyle": "I read at a moderate pace",
    "contestantId": "eval_001",
    "annotationsCompleted": 25,
    "startingAlpha": 5.0,
    "endingAlpha": 3.8,
    "startingBeta": 3.0,
    "endingBeta": 2.1,
    "avgTimeSavedVsEntropy": 4.2,
    "avgTimeSavedVsRandom": 2.8,
    "systemReadingProfile": "Fast Skimmer",
    "systemClassificationMatch": "Yes, it matched exactly",
    "ratingDocumentSelection": 4,
    "ratingTrustSystem": 5,
    "mostSurprising": "How quickly the system adapted to my reading speed",
    "mostConfusing": "What the alpha parameter represents"
}
```

```json
// Response (201 Created)
{
    "message": "Feedback submitted successfully.",
    "feedback": { ... }
}
```

Validation is handled by Mongoose schema constraints (`enum`, `min`, `max`, `required`). Invalid data returns `400 Bad Request`.
