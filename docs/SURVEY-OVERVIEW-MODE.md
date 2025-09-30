# Survey Overview Dashboard Mode

## Overview
When "All Surveys" is selected in the filter dropdown, the dashboard now enters a special **Overview Mode** that provides high-level insights across all survey submissions, rather than mixing incompatible metrics from different survey types.

## Problem Solved
Previously, when "All Surveys" was selected, the dashboard would attempt to show feedback-specific metrics (like average ratings) even when consent forms (which don't have ratings) were included. This resulted in confusing or meaningless data displays.

## Solution: Dedicated Overview Mode

### Design Philosophy
The overview mode focuses on **universal metrics** that apply to all survey types:
- **Submission trends over time**
- **Geographic distribution**
- **Survey breakdown** (which surveys are getting the most responses)
- **Time-based activity** (recent 7 days, 30 days)

### Key Differences from Survey-Specific Modes

| Feature | Feedback/Consent Mode | Overview Mode |
|---------|----------------------|---------------|
| **Metrics Cards** | Survey-specific (rating, contact %, etc.) | Universal (total, last 7d, last 30d, location) |
| **Sentiment/Preferences** | Shown (rating distribution or consent preferences) | Hidden (not applicable) |
| **Hospital Rankings** | Shown (top by rating or geographic dist.) | Hidden (varies by survey type) |
| **Charts** | Survey-specific (pain, wait time, SCD, etc.) | Universal (submissions, survey breakdown, geography) |
| **Dashboard Title** | "Feedback Dashboard" or "Consent Form Submissions" | "Survey Overview Dashboard" |
| **Description** | Survey-specific | "High-level insights across all survey submissions" |

## Implementation Details

### 1. Mode Detection
```typescript
const isAllSurveysMode = selectedSurvey === 'all'
```

### 2. Metrics Calculation
Overview mode calculates:
- **Total submissions** across all surveys
- **Survey breakdown**: Count per survey with percentages
- **Geographic distribution**: Aggregates from both hospital fields and city fields
- **Time-based metrics**: Last 7 days and last 30 days counts
- **Top location**: Most common location across all surveys

### 3. Metric Cards (4 cards)
1. **Total Submissions** - Same as before, shows total count
2. **Last 7 Days** - Recent activity indicator
3. **Top Location** - Most common location (hospital or city)
4. **Last 30 Days** - Monthly activity indicator

### 4. Available Charts
1. **Submissions Over Time** - Line chart showing all submissions trend
2. **Survey Breakdown** - Bar chart with color-coded submissions per survey
3. **Geographic Distribution** - Bar chart showing top 10 locations

### 5. Hidden Sections
In overview mode, these sections are automatically hidden:
- Sentiment Distribution / Consent Preferences cards
- Hospital Rankings / Top Locations cards
- Recent Feedback Trends / Recent Consent Submissions

## User Experience Benefits

### ✅ Clear Context
- Dashboard title changes to "Survey Overview Dashboard"
- Description explains it's high-level insights
- No confusing mixed metrics

### ✅ Actionable Insights
- See which surveys are most popular
- Identify geographic trends across all programs
- Monitor overall submission activity
- Spot time-based patterns

### ✅ Seamless Navigation
- Select individual surveys to drill down into specific metrics
- Auto-adapts UI when switching between modes
- Chart selection resets to appropriate defaults

## Use Cases

### 1. **Executive Overview**
Quick snapshot of all survey activity for leadership reports

### 2. **Resource Allocation**
Identify which surveys/locations need attention based on volume

### 3. **Trend Monitoring**
Track overall submission patterns over time

### 4. **Geographic Planning**
See which locations are most engaged across all programs

### 5. **Survey Performance**
Compare relative popularity of different surveys

## Technical Implementation

### Chart Data Processing
```typescript
if (isAllSurveysMode) {
  // Geographic distribution aggregates from multiple field types
  const location = (s as any).city?.selection || 
                  (s as any).primaryHospital?.selection || 
                  (s as any).hospital || 
                  (s as any)['hospital-on']?.selection || 
                  'Unknown'
  
  // Survey breakdown with human-readable titles
  surveyBreakdown: Array.from(bySurvey.entries())
    .map(([surveyId, count]) => ({
      surveyId,
      surveyTitle: surveyTitleMap.get(surveyId) || surveyId,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }))
}
```

### Conditional Rendering Pattern
```typescript
{isAllSurveysMode ? (
  // Overview-specific component
  <OverviewMetricCard />
) : isConsent ? (
  // Consent-specific component
  <ConsentMetricCard />
) : (
  // Feedback-specific component
  <FeedbackMetricCard />
)}
```

## Future Enhancements

### Potential Additions
1. **Survey comparison mode**: Compare two specific surveys side-by-side
2. **Completion rates**: Track partial vs complete submissions
3. **Time-of-day patterns**: When do most submissions occur
4. **Device breakdown**: Mobile vs desktop submissions
5. **Conversion funnel**: View → Start → Complete rates

### Advanced Analytics
1. **Heatmaps**: Geographic intensity visualization
2. **Cohort analysis**: Track submission patterns by time cohorts
3. **Retention metrics**: Repeat participant tracking
4. **A/B testing**: Compare survey variations

## Best Practices

### When to Use Overview Mode
✅ Executive reporting  
✅ Cross-program analysis  
✅ Resource planning  
✅ Initial data exploration  
✅ Identifying trends

### When to Use Specific Survey Mode
✅ Detailed analysis  
✅ Quality metrics review  
✅ Specific feedback review  
✅ Consent preference analysis  
✅ Individual submission review

## Related Documentation
- [Dashboard Enhancements](./DASHBOARD-ENHANCEMENTS.md)
- [Creating Surveys](./creating-surveys.md)
- [Digital Consent Form](./digital%20consent%20and%20info%20colelciton%20form.md)

---

**Implemented**: 2025-09-30  
**Version**: 1.0  
**Author**: SCAGO Development Team

