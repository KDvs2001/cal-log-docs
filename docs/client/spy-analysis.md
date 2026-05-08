---
sidebar_position: 4
title: Spy Analysis
---

# SpyAnalysis.jsx — Real-Time Transparency Panel

**File**: `client/src/components/workspace/SpyAnalysis.jsx` (57 lines)  
**Role**: The "Spy Window" sidebar coordinator that hosts four sub-panels exposing the active learning mathematics in real-time.

## Architecture

SpyAnalysis is a **composition component** — it doesn't contain complex logic itself but arranges four specialised sub-components:

```jsx
const SpyAnalysis = ({ selectionLogic, metrics, history, interactionLog, shadowMetrics, onShowAlphaBetaPanel }) => {
    return (
        <div className="flex flex-col gap-6 pb-8">
            <ComparisonTable shadowMetrics={shadowMetrics} />
            <SelectionCard selectionLogic={selectionLogic} />
            <ParameterGraphs metrics={metrics} history={history} />
            <CostMathDebug selectionLogic={selectionLogic} metrics={metrics} interactionLog={interactionLog} />
        </div>
    );
};
```

## Sub-Components

### 1. ComparisonTable (`analysis/ComparisonTable.jsx`)
Shows a side-by-side comparison of CAL-Log vs Entropy vs Random for the current batch:
- Average text length selected
- Estimated annotation cost
- Average entropy (information value)
- **Information efficiency** (bits per second)

### 2. SelectionCard (`analysis/SelectionCard.jsx`)
Displays **why** CAL-Log chose the current task:
- Task ID and CAL-Log score
- Entropy value and cost breakdown
- Full formula with plugged-in numbers
- Reading pattern classification and reasoning

### 3. ParameterGraphs (`analysis/ParameterGraphs.jsx`)
Recharts-powered line graphs showing:
- **Alpha convergence** over annotation steps
- **Beta convergence** over annotation steps
- **Accuracy comparison** (CAL-Log vs Random vs Entropy) over time
- **Cumulative cost comparison** over time

### 4. CostMathDebug (`analysis/CostMathDebug.jsx`)
Raw calculation logs for mathematical verification:
- Last 5 annotation inputs (text length, log(1+L), time taken)
- Current α and β values
- Cost formula with live values

### 5. ShadowAuditModal (`analysis/ShadowAuditModal.jsx`)
Detailed audit trail showing exactly which tasks each shadow strategy picked and why.

## Help Button Integration

```jsx
{onShowAlphaBetaPanel && (
    <button
        onClick={onShowAlphaBetaPanel}
        className="absolute top-4 right-4 z-10 p-2 bg-blue-600 ..."
    >
        <HelpCircle size={16} />
        What do these mean?
    </button>
)}
```

The "What do these mean?" button opens the `AlphaBetaImpactPanel` — a modal explaining how α and β affect task selection, designed for evaluators who are curious about the mathematics.
