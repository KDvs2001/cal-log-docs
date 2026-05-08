---
sidebar_position: 6
title: Session Management
---

# Session Management Components

## ContestantIdModal

**File**: `client/src/components/workspace/ContestantIdModal.jsx` (13KB)  
**Role**: Entry gate that authenticates evaluators and determines session mode.

The modal presents three paths:
1. **New user**: Enter ID → Start fresh session
2. **Returning user**: Enter existing ID → Resume from saved progress
3. **Fresh start**: Enter existing ID → Reset and start over

The modal checks for existing sessions via `GET /api/session/load/:id` and offers the appropriate options.

## SaveConfirmationModal

**File**: `client/src/components/workspace/SaveConfirmationModal.jsx`  
**Role**: Prevents accidental data loss on page refresh.

Triggered by the `beforeunload` event:
```javascript
useEffect(() => {
    const handleBeforeUnload = (e) => {
        if (contestantId && annotationCount > 0) {
            e.preventDefault();
            setShowSaveConfirmation(true);
            return (e.returnValue = '');
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [contestantId, annotationCount]);
```

## EvaluatorTour

**File**: `client/src/components/workspace/EvaluatorTour.jsx` (9.5KB)  
**Role**: Step-by-step onboarding walkthrough using `react-joyride`.

Tour steps guide first-time evaluators through:
1. The task card and annotation buttons
2. The Spy Window and its panels
3. Keyboard shortcuts
4. How to end the session

Tour state is persisted in `localStorage` so it only shows once per evaluator:
```javascript
const [tourActive, setTourActive] = useState(!localStorage.getItem('cal_log_tour_seen'));
```

## SessionSummary

**File**: `client/src/components/workspace/SessionSummary.jsx` (21KB)  
**Role**: Post-session results page showing aggregate performance metrics.

Displays:
- Total annotations completed
- Final α and β values
- Cumulative time saved vs Entropy and Random
- Accuracy convergence graph
- Data export button (JSON download)
- Link to the feedback survey (`EvaluatorFeedbackModal`)

## EvaluatorFeedbackModal

**File**: `client/src/components/workspace/EvaluatorFeedbackModal.jsx` (23KB)  
**Role**: Post-session survey collecting qualitative and quantitative feedback.

The form captures:
- **Demographics**: Role, NLP familiarity, self-reported reading style
- **Quantitative metrics** (auto-captured): Starting/ending α/β, efficiency scores
- **Likert ratings** (1-5): Document selection quality, system trust, interface clarity
- **Open-ended responses**: Most surprising observation, most confusing aspect, suggestions

All data is submitted to `POST /api/feedback` and validated by the Mongoose schema.

## FatigueTrackerModal

**File**: `client/src/components/workspace/FatigueTrackerModal.jsx`  
**Role**: Break suggestion when the evaluator appears fatigued.

Displayed when `elapsedTime > 5× trimmedAverageTime` (see [Fatigue Modeling](/mathematics/fatigue-modeling)). The modal pauses the timer and offers a "Resume" button. Time spent viewing the modal is excluded from the annotation measurement.
