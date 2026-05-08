---
sidebar_position: 5
title: Database Models
---

# Mongoose Database Models

Three Mongoose models define the data layer. All models use schema-level validation to enforce data integrity without manual checks in route handlers.

## AnnotationSession

**File**: `server/infrastructure/database/models/AnnotationSession.js`  
**Role**: Aggregate root holding the full state of one evaluator's session.

### Embedded Sub-Document: AnnotationDetail

```javascript
const AnnotationDetailSchema = new mongoose.Schema({
    taskId: Number,
    textSnippet: String,    // First N chars of annotated text (for audit)
    wordCount: Number,
    label: String,          // 'Positive' or 'Negative'
    timeSeconds: Number,    // How long the evaluator spent
    alpha: Number,          // Cost model α at time of annotation
    beta: Number,           // Cost model β at time of annotation
    timestamp: Date,
    annotationIndex: Number // Sequential counter within session
}, { _id: false });         // No auto-generated ObjectId on sub-docs
```

**`{ _id: false }`**: Mongoose normally generates an ObjectId for every sub-document. Since we never query individual annotations (only the parent session), this would waste storage and add no value.

### Session Schema

```javascript
const AnnotationSessionSchema = new mongoose.Schema({
    contestantId: { type: String, required: true, unique: true, trim: true },
    annotationCount: { type: Number, default: 0 },
    cumulativeTimeSaved: { type: Number, default: 0 },
    cumulativeEntropyCost: { type: Number, default: 0 },
    cumulativeRandomCost: { type: Number, default: 0 },
    cumulativeCalLogCost: { type: Number, default: 0 },
    labeledTaskIds: [{ type: Number }],
    annotations: [AnnotationDetailSchema],  // Embedded array
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });
```

**Why embed annotations instead of a separate collection?**
- Each session has ~50 annotations max — well within MongoDB's 16MB document limit
- Embedding avoids a separate collection + JOIN-equivalent (`$lookup`)
- All session data loads in a single `findOne` query

### Pre-Save Hook

```javascript
AnnotationSessionSchema.pre('save', function (next) {
    this.lastUpdated = Date.now();
    next();
});
```

Automatically bumps `lastUpdated` on every save, independent of the route handler.

---

## EvaluatorFeedback

**File**: `server/infrastructure/database/models/EvaluatorFeedback.js`  
**Role**: Post-session survey with mixed quantitative and qualitative data.

### Schema Fields

| Category | Fields | Validation |
|----------|--------|-----------|
| **Demographics** | role, nlpFamiliarity, selfReportedReadingStyle | `enum` (fixed options) |
| **Quantitative** | annotationsCompleted, startingAlpha/Beta, endingAlpha/Beta | `required`, `default` |
| **Efficiency** | avgTimeSavedVsEntropy, avgTimeSavedVsRandom | `required` |
| **Strategy Scores** | calLogEfficiency, entropyEfficiency, randomEfficiency | `default: 0` |
| **Likert Ratings** | ratingDocumentSelection, ratingTrustSystem, etc. | `min: 1, max: 5` |
| **Open-Ended** | mostSurprising, mostConfusing, strengthenSubmission | Free text |

### Key Design: Auto-Captured vs User-Entered

The schema mixes two data sources:
- **User-entered**: Demographics, Likert ratings, open-ended responses
- **Auto-captured by frontend**: All quantitative metrics (alpha, beta, efficiency scores, task lengths)

This prevents manual entry errors and ensures research data integrity.

---

## ExperimentResult

**File**: `server/infrastructure/database/models/ExperimentResult.js`  
**Role**: Pre-seeded offline benchmark results for comparison charts.

```javascript
const ExperimentResultSchema = new mongoose.Schema({
    dataset: { type: String, required: true },
    strategy: { type: String, required: true },
    totalCost: { type: Number, required: true },
    f1Score: { type: Number, required: true },
    accuracy: { type: Number },
    pValue: { type: Number },
    cohensD: { type: Number },
    tasksAnnotated: { type: Number },
    rounds: { type: Number, default: 10 },
    metadata: mongoose.Schema.Types.Mixed,      // Flexible bag for extras
    createdAt: { type: Date, default: Date.now }
});

// Compound index for sort-optimised queries
ExperimentResultSchema.index({ dataset: 1, strategy: 1 });
```

### Compound Index

The `{ dataset: 1, strategy: 1 }` index matches the sort order used in `GET /api/experiments`, allowing MongoDB to return results directly from the index without in-memory sorting.

### `Schema.Types.Mixed`

The `metadata` field accepts arbitrary key-value data without a fixed shape. This future-proofs the schema for additional experiment details without migration.
