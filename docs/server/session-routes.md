---
sidebar_position: 2
title: Session Routes
---

# Session Routes - Annotation Progress Management

**File**: `server/infrastructure/http/routes/session.js` (150 lines)  
**Role**: CRUD routes for annotation sessions. Each evaluator gets one session document keyed by their `contestantId`.

## `POST /api/session/save`

**Purpose**: Upsert (create or update) the evaluator's running session. Fires after each annotation so progress is never lost.

```javascript
router.post('/save', async (req, res) => {
    const { contestantId, annotationCount, labeledTaskIds, newAnnotation } = req.body;

    const updateOps = {
        annotationCount: annotationCount || 0,
        labeledTaskIds: labeledTaskIds || [],
        cumulativeTimeSaved: req.body.cumulativeTimeSaved || 0,
        cumulativeEntropyCost: req.body.cumulativeEntropyCost || 0,
        cumulativeRandomCost: req.body.cumulativeRandomCost || 0,
        cumulativeCalLogCost: req.body.cumulativeCalLogCost || 0,
        lastUpdated: Date.now()
    };

    const update = { $set: updateOps };
    if (newAnnotation) {
        update.$push = { annotations: newAnnotation };
    }

    const session = await AnnotationSession.findOneAndUpdate(
        { contestantId },
        update,
        { upsert: true, new: true }
    );
});
```

**Key design decisions**:

1. **`$set` + `$push` in one call**: Scalar fields are overwritten with `$set`; new annotations are appended with `$push`. Doing both in a single `findOneAndUpdate` makes it **atomic** - no race conditions from read-modify-write patterns.

2. **`upsert: true`**: Creates a new document if this contestantId hasn't saved before. Eliminates the need for a separate "create session" endpoint.

3. **`new: true`**: Returns the **updated** document, not the stale pre-update version. This lets the frontend verify the save succeeded.

## `GET /api/session/load/:contestantId`

**Purpose**: Load a previously saved session for resumption.

```javascript
router.get('/load/:contestantId', async (req, res) => {
    const session = await AnnotationSession.findOne({ contestantId });

    if (!session) {
        return res.json({ exists: false, session: null });
    }

    res.json({
        exists: true,
        session: {
            contestantId: session.contestantId,
            annotationCount: session.annotationCount,
            labeledTaskIds: session.labeledTaskIds,
            // ... cumulative costs, annotations, etc.
        }
    });
});
```

The `exists: false` response tells the frontend to show "Start Fresh" instead of "Resume" in the contestant ID modal.

## `POST /api/session/reset/:contestantId`

**Purpose**: Zero out all fields for a fresh start without deleting the document.

```javascript
router.post('/reset/:contestantId', async (req, res) => {
    await AnnotationSession.findOneAndUpdate(
        { contestantId },
        {
            $set: {
                annotationCount: 0,
                labeledTaskIds: [],
                cumulativeTimeSaved: 0,
                annotations: [],
                lastUpdated: Date.now()
            }
        },
        { upsert: true, new: true }
    );
});
```

**Why `$set` instead of `deleteOne`?** The document row is preserved so we can track which evaluator IDs actually participated in the study, even if they reset their session.
