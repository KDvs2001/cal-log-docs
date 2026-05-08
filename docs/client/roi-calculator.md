---
sidebar_position: 5
title: ROI Calculator
---

# ROICalculator.jsx - Financial Impact Projection

**File**: `client/src/components/ROICalculator.jsx` (214 lines)  
**Role**: Interactive calculator that translates CAL-Log's time savings into projected financial savings for enterprise annotation campaigns.

## Purpose

The ROI Calculator serves a dual purpose:
1. **For evaluators**: Shows the real-world financial impact of the time savings they observe
2. **For viva defense**: Provides concrete dollar figures that make the research contribution tangible

## Empirical Constants

```javascript
const avgTimeRandom = 3.75;   // seconds per task (Random baseline)
const avgTimeCALLog = 2.47;   // seconds per task (CAL-Log)
```

These values are derived from the empirical study results. The 34% time reduction drives all ROI calculations.

## ROI Calculation

```javascript
const calculateROI = () => {
    // Convert total annotation time to hours, then to dollars
    const randomCost = (annotations * avgTimeRandom / 3600) * hourlyWage;
    const calLogCost = (annotations * avgTimeCALLog / 3600) * hourlyWage;
    const savings = randomCost - calLogCost;
    const savingsPercent = ((savings / randomCost) * 100).toFixed(1);
    const hoursSaved = (annotations * (avgTimeRandom - avgTimeCALLog) / 3600).toFixed(0);
    
    return { randomCost, calLogCost, savings, savingsPercent, hoursSaved };
};
```

### Example Calculations

| Scenario | Annotations | Hourly Wage | Random Cost | CAL-Log Cost | **Savings** |
|----------|-------------|-------------|-------------|--------------|-------------|
| Small Lab | 1,000 | $15/hr | $15.63 | $10.29 | **$5.33** |
| Startup | 10,000 | $25/hr | $260.42 | $171.53 | **$88.89** |
| Enterprise | 100,000 | $40/hr | $4,166.67 | $2,744.44 | **$1,422.22** |

## Preset Configurations

```javascript
const presets = [
    { name: "Small Lab",   icon: Users,     annotations: 1000,   wage: 15 },
    { name: "Startup",     icon: Briefcase, annotations: 10000,  wage: 25 },
    { name: "Enterprise",  icon: Building,  annotations: 100000, wage: 40 }
];
```

Presets provide one-click scenarios that demonstrate ROI at different scales.

## Recharts Bar Chart

```jsx
<BarChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
    <XAxis dataKey="name" stroke="#94a3b8" />
    <YAxis tickFormatter={(value) => `$${value}`} />
    <Tooltip
        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
        formatter={(value) => [`$${value.toLocaleString()}`, 'Cost']}
    />
    <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
        {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
    </Bar>
</BarChart>
```

The bar chart visually contrasts Random cost (red) vs CAL-Log cost (blue), making the savings immediately obvious.
