---
sidebar_position: 2
title: Data Flow
---

# Request Lifecycle & Data Flow

This page traces the complete lifecycle of a single annotation - from the evaluator clicking a label button to the cost model updating and the next task appearing.

## End-to-End Annotation Flow

```mermaid
sequenceDiagram
    participant User as Evaluator
    participant React as React Frontend
    participant Flask as ML Service (Flask)
    participant Node as Node.js API
    participant Mongo as MongoDB Atlas

    Note over User, Mongo: Phase 1: Task Loading
    React->>Flask: POST /predict {labeled_task_ids}
    Flask->>Flask: Filter pool, rank by CAL-Log score
    Flask->>Flask: Run shadow simulation (Random, Entropy)
    Flask-->>React: {tasks[], shadow_metrics, pool_remaining}
    React->>Flask: GET /spy/selection
    Flask-->>React: {score, entropy, cost, reasoning}

    Note over User, Mongo: Phase 2: Annotation
    User->>React: Click "Positive" or "Negative" (or press 1/2)
    React->>React: Optimistic UI update (show next task immediately)
    React->>React: Record time_taken = (Date.now() - viewStartTime) / 1000
    React->>Flask: POST /annotate {text, label, time_taken}
    Flask->>Flask: Buffer interaction for cost model
    Flask->>Flask: Buffer label for shadow models
    alt Every 5 annotations
        Flask->>Flask: OLS regression → update α, β
        Flask->>Flask: partial_fit() all 3 models
        Flask->>Flask: Validate against held-out test set
    end
    Flask-->>React: {status, alpha, beta, trained}

    Note over User, Mongo: Phase 3: Session Persistence
    React->>Node: POST /api/session/save {contestantId, annotations, costs}
    Node->>Mongo: findOneAndUpdate (upsert: true)
    Mongo-->>Node: Updated session document
    Node-->>React: {success: true}
```

## Key Architectural Decisions

### 1. Optimistic UI Updates

When the evaluator clicks a label, the React frontend **immediately** advances to the next task before the network request completes. This is critical because:

- The `time_taken` measurement would be contaminated by network latency if we waited for the server
- The evaluator's annotation "flow state" would be broken by 200-500ms pauses
- The `setSubmitting(false)` call happens right after the optimistic update, not after the fetch

```javascript
// ResearchWorkspace.jsx - optimistic update pattern
const nextTasks = tasks.slice(1);
if (nextTasks.length > 0) {
    setTasks(nextTasks);
    setCurrentTask(nextTasks[0]);  // Show next task IMMEDIATELY
}
setSubmitting(false);  // Re-enable button BEFORE network call

// THEN do the async work (non-blocking)
const response = await fetch(`${API_URL}/annotate`, { ... });
```

### 2. Ref-Based State for Async Handlers

React's `useState` setter is asynchronous, which creates **stale closure bugs** in async handlers. The `labeledIdsRef` ref is used to maintain a synchronous reference:

```javascript
const labeledIdsRef = useRef([]);

// Always update the ref synchronously
const newLabeledIds = [...labeledIdsRef.current, currentTask.id];
labeledIdsRef.current = newLabeledIds;
setLabeledTaskIds(newLabeledIds);  // Also update state for re-renders
```

### 3. Server-Side Pool Management

The ML service maintains its own task pool (`state.clean_pool`) rather than receiving tasks from the frontend. This means:
- The frontend never sees ground-truth labels (prevents leakage)
- Task deduplication happens once at startup
- The pool is shuffled per-session for variety

### 4. Fire-and-Forget Session Saves

Session persistence is non-blocking - the `saveSession()` call uses `.catch()` instead of `await` to prevent slow MongoDB writes from blocking the UI:

```javascript
fetch(`${SERVER_URL}/api/session/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
}).catch(err => console.error('Session save failed:', err));
```

## Polling Architecture

The frontend polls three endpoints every 2 seconds for real-time dashboard updates:

| Endpoint | Data | Consumer |
|----------|------|----------|
| `GET /spy/history` | Alpha/beta convergence timeline | ParameterGraphs |
| `GET /health` | Current alpha, beta, accuracy_history | SpyAnalysis |
| `GET /spy/metrics` | Cumulative costs per strategy | ComparisonTable |

This polling approach was chosen over WebSockets because:
1. The data updates only every 5 annotations (when the model retrains)
2. WebSocket state management adds complexity with no UX benefit
3. Vercel's serverless functions don't support persistent WebSocket connections
