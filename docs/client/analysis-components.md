---
sidebar_position: 7
title: Analysis Components
---

# Analysis Sub-Components (Spy Window)

These components live in `client/src/components/workspace/analysis/` and render inside the Spy Window.

## SelectionCard (`SelectionCard.jsx`)

**Size**: 9.5KB  
**Purpose**: Shows the mathematical reasoning behind the current task selection.

Displays:
- **Selected Task ID** and its CAL-Log score
- **Full formula**: `Score (0.042) = Entropy (0.691) / Cost (16.4s)`
- **Cost breakdown**: `Cost = α(5.0) + β(3.0) × log(1 + 234) = 16.4s`
- **Task statistics**: Word count, percentile rank, length class
- **Reading pattern**: Current classification and reasoning
- **Relative trend**: Whether this task is significantly longer/shorter than recent selections

## CostMathDebug (`CostMathDebug.jsx`)

**Size**: 7.2KB  
**Purpose**: Raw calculation logs for mathematical audit.

Shows a table of the last 5 annotations with columns:
| Column | Source | Purpose |
|--------|--------|---------|
| Text snippet | `interaction.text` | Identifies the task |
| Word count | `len(text.split())` | Raw input to cost function |
| log(1+L) | `Math.log1p(wordCount)` | Transformed feature |
| Time (s) | `Date.now() - viewStartTime` | Measured annotation time |

Below the table, displays the current α, β, and the live cost formula with plugged-in values.

## ParameterGraphs (`ParameterGraphs.jsx`)

**Size**: 7.1KB  
**Purpose**: Recharts line charts showing parameter convergence and model accuracy.

Four graphs:
1. **Alpha over time** - Fixed overhead convergence
2. **Beta over time** - Reading speed convergence
3. **Accuracy comparison** - CAL-Log vs Random vs Entropy accuracy on the held-out test set
4. **Cumulative cost** - Running total of predicted annotation cost per strategy

All graphs use Recharts' `ResponsiveContainer` for fluid resizing:
```jsx
<ResponsiveContainer width="100%" height={200}>
    <LineChart data={history}>
        <Line type="monotone" dataKey="alpha" stroke="#3b82f6" />
        <Line type="monotone" dataKey="beta" stroke="#f97316" />
    </LineChart>
</ResponsiveContainer>
```

## ComparisonTable (`ComparisonTable.jsx`)

**Size**: 9.2KB  
**Purpose**: Side-by-side efficiency comparison of all three strategies.

For each strategy (CAL-Log, Entropy, Random), shows:
- **Average text length** selected
- **Estimated annotation cost** (seconds)
- **Average entropy** (information value)
- **Information efficiency** (entropy ÷ cost = bits/sec)

The strategy with the highest information efficiency is highlighted, which should consistently be CAL-Log.

## ShadowAuditModal (`ShadowAuditModal.jsx`)

**Size**: 7.1KB  
**Purpose**: Detailed audit trail for the shadow benchmarking system.

When expanded, shows the exact tasks each strategy picked:
- Task ID, text snippet (first 40 chars), word count, entropy value
- Full audit trail data from the `/predict` response

This enables the viva examiner to verify that the shadow comparison is methodologically sound.

## AlphaBetaImpactPanel

**File**: `client/src/components/workspace/AlphaBetaImpactPanel.jsx` (9.4KB)  
**Purpose**: Educational modal explaining how α and β affect task selection.

Shows interactive examples:
- What happens when α is high (long overhead → all tasks become expensive)
- What happens when β is high (long texts become much more expensive)
- What happens when β is low (text length barely matters → model picks the longest high-entropy texts)

## WorkspaceHeader

**File**: `client/src/components/workspace/WorkspaceHeader.jsx` (4.5KB)  
**Purpose**: Top bar showing annotation count, contestant ID, and action buttons (Save, Export, End Session).

## GuidelinesPanel

**File**: `client/src/components/workspace/GuidelinesPanel.jsx` (4.8KB)  
**Purpose**: Slide-out panel explaining the annotation task. Toggle with spacebar.
