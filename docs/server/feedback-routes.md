---
sidebar_position: 4
title: Feedback Routes
---

# Feedback Routes — Post-Session Survey

**File**: `server/infrastructure/http/routes/feedback.js` (39 lines)  
**Role**: Single POST endpoint for evaluator survey submission.

## `POST /api/feedback`

```javascript
router.post("/", async (req, res) => {
    const feedback = new EvaluatorFeedback(req.body);
    await feedback.save();
    res.status(201).json({ message: "Feedback submitted successfully.", feedback });
});
```

This is intentionally minimal:
- `req.body` goes directly into the Mongoose model constructor
- **Mongoose's schema validators** (enum, min/max, required) catch bad input automatically
- If validation fails, `.save()` throws a `ValidationError` caught by the `catch` block
- `201 Created` is the correct HTTP status for successful resource creation

### Why No Manual Validation?

The `EvaluatorFeedback` schema handles all validation:

```javascript
// Example: role must be one of these exact strings
role: { 
    type: String, 
    enum: ['Undergraduate student', 'Postgraduate / PhD student', ...], 
    required: true 
}

// Example: Likert scale constrained to 1-5
ratingDocumentSelection: { type: Number, min: 1, max: 5 }
```

Adding manual checks in the route handler would duplicate the schema validation and violate DRY. The schema is the single source of truth for data integrity.
