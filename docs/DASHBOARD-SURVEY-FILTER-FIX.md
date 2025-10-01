# Dashboard Survey Filter Fix

## Issue
The dashboard was showing outdated survey data including deleted surveys in the filter dropdown. Survey names were sometimes showing as IDs instead of titles, and deleted surveys were still appearing in the filter options.

## Root Cause
1. The `surveyOptions` was derived from all submission `surveyId` fields, including submissions from deleted surveys
2. The `surveyTitleMap` only contained active surveys, causing ID display for deleted surveys
3. No validation was in place to filter out submissions from deleted surveys
4. The selected survey wasn't reset when a survey was deleted

## Solution

### 1. Filter Survey Options to Active Surveys Only
**File**: `src/app/dashboard/client.tsx`

Updated `surveyOptions` to only include surveys that exist in the active surveys list:

```typescript
const surveyOptions = useMemo(() => {
  // Only include surveys that exist in the surveys list
  const existingSurveyIds = new Set(surveys.map(s => s.id))
  const submissionSurveyIds = Array.from(new Set(submissions.map(s => s.surveyId)))
  // Filter to only include IDs that have a corresponding survey
  const validSurveyIds = submissionSurveyIds.filter(id => existingSurveyIds.has(id))
  return ['all', ...validSurveyIds]
}, [submissions, surveys])
```

### 2. Auto-Reset Invalid Survey Selection
Added a `useEffect` to automatically reset the selected survey to "all" if the currently selected survey is deleted:

```typescript
// Reset selectedSurvey if it's no longer valid (e.g., survey was deleted)
useEffect(() => {
  if (selectedSurvey !== 'all' && !surveyOptions.includes(selectedSurvey)) {
    setSelectedSurvey('all')
  }
}, [selectedSurvey, surveyOptions])
```

### 3. Filter Submissions to Active Surveys Only
Updated the `filtered` memoization to exclude submissions from deleted surveys:

```typescript
const filtered = useMemo(() => {
  // First, filter to only include submissions from existing surveys
  const existingSurveyIds = new Set(surveys.map(s => s.id))
  let result = submissions.filter(s => existingSurveyIds.has(s.surveyId))
  
  // ... rest of filtering logic
}, [submissions, surveys, selectedSurvey, searchQuery, dateRange, ratingFilter, hospitalFilter, isConsent])
```

### 4. Update Metrics to Count Only Active Surveys
Updated the metrics calculation to only count active surveys:

```typescript
const metrics = useMemo(() => {
  const total = filtered.length
  // Count only surveys that exist in the surveys list
  const existingSurveyIds = new Set(surveys.map(s => s.id))
  const surveysCount = new Set(
    submissions
      .filter(s => existingSurveyIds.has(s.surveyId))
      .map(s => s.surveyId)
  ).size
  // ... rest of metrics
}, [filtered, submissions, surveys, isConsent, isAllSurveysMode, surveyTitleMap])
```

## Benefits

1. ✅ **No Outdated Data**: Dashboard only shows submissions from active surveys
2. ✅ **Proper Survey Names**: All surveys show their titles, never IDs
3. ✅ **Auto-Cleanup**: Deleting a survey automatically resets the filter if that survey was selected
4. ✅ **Accurate Metrics**: Survey counts and metrics only reflect active surveys
5. ✅ **Clean User Experience**: No confusion from seeing deleted survey references

## Edge Cases Handled

- ✅ User deletes the currently selected survey → auto-resets to "All Surveys"
- ✅ Submissions exist for deleted surveys → excluded from dashboard display
- ✅ Survey name changes → reflected immediately via the surveyTitleMap
- ✅ All surveys deleted → shows "All Surveys" with 0 count
- ✅ New survey created with existing submissions → appears immediately in filter

## Testing Checklist

- [ ] Create a survey and submit some feedback
- [ ] Verify survey appears in filter dropdown with proper name
- [ ] Select the survey in the filter
- [ ] Delete the survey from the editor page
- [ ] Return to dashboard and verify:
  - Filter automatically resets to "All Surveys"
  - Submissions from deleted survey are not shown
  - Survey count metric decreases appropriately
- [ ] Create multiple surveys and verify all show proper names
- [ ] Verify metrics calculations are accurate

## Files Modified

1. `src/app/dashboard/client.tsx` - Main dashboard component with filtering logic


