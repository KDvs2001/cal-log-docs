---
sidebar_position: 2
title: ResearchWorkspace
---

# ResearchWorkspace.jsx — Main Container Component

**File**: `client/src/components/ResearchWorkspace.jsx` (725 lines)  
**Role**: Main container component managing state, API communication, and child component orchestration.

## State Architecture

The component manages 25+ state variables across several categories:

### Core ML State
```javascript
const [tasks, setTasks] = useState([]);              // Ranked task list from ML service
const [currentTask, setCurrentTask] = useState(null); // Currently displayed task
const [history, setHistory] = useState([]);            // Alpha/beta convergence timeline
const [selectionLogic, setSelectionLogic] = useState(null); // Spy Window reasoning data
const [metrics, setMetrics] = useState({ alpha: 5.0, beta: 3.0, step: 0 });
const [shadowMetrics, setShadowMetrics] = useState(null);   // Shadow strategy comparison
```

### Session Management State
```javascript
const [contestantId, setContestantId] = useState(null);
const [annotationCount, setAnnotationCount] = useState(0);
const [labeledTaskIds, setLabeledTaskIds] = useState([]);
const [showContestantModal, setShowContestantModal] = useState(true);
const [fullAnnotations, setFullAnnotations] = useState([]); // Full log for export
```

### Cumulative Efficiency Tracking
```javascript
const [cumulativeTimeSaved, setCumulativeTimeSaved] = useState(0);
const [cumulativeEntropyCost, setCumulativeEntropyCost] = useState(0);
const [cumulativeRandomCost, setCumulativeRandomCost] = useState(0);
const [cumulativeCalLogCost, setCumulativeCalLogCost] = useState(0);
```

### Timing & Fatigue
```javascript
const [viewStartTime, setViewStartTime] = useState(Date.now());
const [elapsedTime, setElapsedTime] = useState(0);
const [annotationTimes, setAnnotationTimes] = useState([]);
const [isFatigueModalOpen, setIsFatigueModalOpen] = useState(false);
const [fatiguePauseTime, setFatiguePauseTime] = useState(0);
```

## Key Functions

### `fetchNextBatch()` — Task Loading with Retry

```javascript
const fetchNextBatch = async (retryCount = 0) => {
    // Progressive loading messages every 15s
    const stageTimer = setInterval(() => {
        setLoadingStage(prev => Math.min(prev + 1, 4));
    }, 15000);

    // AbortController for request cancellation
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 90000);

    const rankRes = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        body: JSON.stringify({ labeled_task_ids: labeledIdsRef.current }),
        signal: controller.signal
    });

    // If superseded by a newer request, discard results
    if (fetchControllerRef.current !== controller) return;
};
```

**Retry strategy**: 4 retries with exponential backoff (3s → 6s → 12s → 20s) to handle HuggingFace Spaces cold starts.

### `handleAnnotate()` — The Core Annotation Handler

```javascript
const handleAnnotate = async (label) => {
    // 1. SYNCHRONOUS: Optimistic UI update
    const timeTaken = ((Date.now() - viewStartTime) - fatiguePauseTime) / 1000;
    const nextTasks = tasks.slice(1);
    setTasks(nextTasks);
    setCurrentTask(nextTasks[0]);        // Show next task IMMEDIATELY
    setSubmitting(false);                 // Re-enable button BEFORE network call

    // Update ref (avoids stale closure)
    labeledIdsRef.current = [...labeledIdsRef.current, currentTask.id];

    // Compute incremental savings from shadow metrics
    if (shadowMetrics) {
        const entropyCost = shadowMetrics.entropy.estimated_cost;
        const callogCost = shadowMetrics.cal_log.estimated_cost;
        setCumulativeTimeSaved(prev => prev + (entropyCost - callogCost));
    }

    // 2. ASYNC: Non-blocking network calls
    const response = await fetch(`${API_URL}/annotate`, { ... });
    const data = await response.json();

    if (data.trained) {
        // Model was retrained — fetch fresh rankings
        pollMetrics();
        fetchNextBatch();
    }

    // Fire-and-forget session save
    saveSession(newCount, newLabeledIds, fullAnnotation);
};
```

### Keyboard Shortcuts

```javascript
useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === '1') handleAnnotate('Negative');
        if (e.key === '2') handleAnnotate('Positive');
        if (e.key === ' ' && !e.target.matches('input, textarea')) {
            e.preventDefault();  // Prevent page scroll
            setShowGuidelines(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentTask, submitting]);
```

| Key | Action |
|-----|--------|
| `1` | Label as Negative |
| `2` | Label as Positive |
| `Space` | Toggle Guidelines panel |

### Session Data Export

```javascript
const exportSessionData = () => {
    const report = {
        meta: { contestantId, exportedAt: new Date().toISOString(), ... },
        costModel: { currentAlpha: metrics.alpha, currentBeta: metrics.beta },
        annotations: fullAnnotations,
        shadowComparison: shadowMetrics
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `callog_session_${contestantId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);  // Free browser memory
};
```

## Layout Structure

The main layout uses a 12-column CSS Grid:

```jsx
<div className="grid grid-cols-12 gap-6">
    {/* Left: 8 columns — WorkspaceHeader + TaskCard */}
    <div className="col-span-8">
        <WorkspaceHeader />
        <TaskCard />
    </div>

    {/* Right: 4 columns — Spy Window */}
    <div className="col-span-4">
        <SpyAnalysis />
    </div>
</div>
```

The 8:4 split gives the annotation task 67% of the screen width, keeping the evaluator's focus on reading while the Spy Window provides secondary analytics on the right.
