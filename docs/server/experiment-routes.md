---
sidebar_position: 3
title: Experiment Routes
---

# Experiment Routes - Benchmark Data Management

**File**: `server/infrastructure/http/routes/experiment.js` (81 lines)  
**Role**: GET all benchmark results and POST seed data for the comparison charts.

## `GET /api/experiments`

Returns all experiment benchmark results, sorted by dataset then strategy:

```javascript
router.get('/', async (req, res) => {
    const results = await ExperimentResult.find().sort({ dataset: 1, strategy: 1 });
    res.json(results);
});
```

The `.sort({ dataset: 1, strategy: 1 })` matches the **compound index** defined on the model, so MongoDB can use the index directly without in-memory sorting.

## `POST /api/experiments/seed`

A development-only convenience route that wipes and re-inserts baseline benchmark data:

```javascript
router.post('/seed', async (req, res) => {
    await ExperimentResult.deleteMany({});

    const seedData = [
        {
            dataset: 'imdb',
            strategy: 'Random',
            totalCost: 18000,        // 18,000 seconds total annotation time
            f1Score: 0.82,
            accuracy: 0.82,
            tasksAnnotated: 800,
            pValue: 1.0,             // Baseline vs itself
            cohensD: 0.0
        },
        {
            dataset: 'imdb',
            strategy: 'CAL-Log',
            totalCost: 9500,         // 47% reduction
            f1Score: 0.84,
            accuracy: 0.84,
            tasksAnnotated: 450,     // 44% fewer tasks needed
            pValue: 0.001,           // Significant at α = 0.05
            cohensD: 0.92            // Large effect (> 0.8)
        },
        {
            dataset: 'imdb',
            strategy: 'BADGE',
            totalCost: 14000,
            f1Score: 0.83,
            accuracy: 0.83,
            tasksAnnotated: 600,
            pValue: 0.10,            // NOT significant at α = 0.05
            cohensD: 0.4             // Small-to-medium effect
        }
    ];

    await ExperimentResult.insertMany(seedData);
});
```

### Statistical Significance Fields

| Field | Meaning | CAL-Log Result |
|-------|---------|----------------|
| `pValue` | Mann-Whitney U test vs Random | 0.001 (highly significant) |
| `cohensD` | Effect size for practical significance | 0.92 (large effect, > 0.8 threshold) |

The `deleteMany` + `insertMany` pattern makes this endpoint **idempotent** - calling it 10 times produces the same 3 rows.
