---
sidebar_position: 3
title: TaskCard
---

# TaskCard.jsx - Annotation Interface

**File**: `client/src/components/workspace/TaskCard.jsx` (121 lines)  
**Role**: Core binary classification interface. Deliberately minimal to reduce cognitive load and preserve measurement accuracy.

## Design Philosophy

The TaskCard is intentionally **visually isolated** from the Spy Window analytics. This separation ensures:
1. **Clean time measurement**: Reading time reflects comprehension, not UI navigation
2. **Flow state preservation**: The evaluator focuses on text content, not mathematical readouts
3. **High signal-to-noise ratio**: Only the text and two buttons are prominently displayed

## Text Cleaning

```javascript
const cleanText = (text) => {
    if (!text) return "No Text Found";
    
    // Remove HTML tags: <br />, <br/>, <br>, and all other tags
    let cleaned = text.replace(/<br\s*\/?>/gi, ' ');
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    
    // Collapse multiple spaces into one
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Strip stray special characters but keep normal punctuation
    cleaned = cleaned.replace(/[^\w\s.,!?'-]/g, '');
    
    return cleaned;
};
```

**Why clean the text?** The raw dataset (`dataset.json`) contains HTML markup from web scraping. Without cleaning, the evaluator would see `<br />` tags and broken HTML, which would inflate reading time (measured by the cost model) without reflecting actual comprehension effort.

## Timer Display

```jsx
<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300">
    <Clock size={16} className="text-slate-600" />
    <span className="font-mono text-sm font-bold text-slate-700">
        {Math.floor(elapsedTime || 0)}s
    </span>
</div>
```

`Math.floor()` rounds down so the display doesn't flicker with decimal values. The timer shows elapsed seconds since the task appeared - this provides transparency to the evaluator about how long they've been reading.

## Annotation Buttons

```jsx
<div className="grid grid-cols-2 gap-4">
    <button
        onClick={() => onAnnotate('Negative')}
        disabled={submitting}
        className="p-4 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl ..."
    >
        <AlertCircle size={20} className="group-hover:scale-110 transition" />
        <span>Negative</span>
        <span className="text-xs opacity-70 ml-1">(Press 1)</span>
    </button>
    
    <button
        onClick={() => onAnnotate('Positive')}
        disabled={submitting}
        className="p-4 bg-green-100 hover:bg-green-200 text-green-700 font-bold rounded-xl ..."
    >
        <span>Positive</span>
        <span className="text-xs opacity-70 ml-1">(Press 2)</span>
        <CheckCircle size={20} className="group-hover:scale-110 transition" />
    </button>
</div>
```

**Key UX decisions**:
- `disabled={submitting}` prevents double-clicks
- Keyboard shortcuts (1, 2) shown as hints for power users
- `group-hover:scale-110` provides visual feedback on hover
- Red/green colour coding matches Negative/Positive semantics universally
