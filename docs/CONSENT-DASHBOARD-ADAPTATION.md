# Consent Dashboard Adaptation Guide

## Overview
This document outlines the comprehensive changes made to adapt the dashboard for digital consent forms vs hospital feedback surveys.

## Key Differences Between Survey Types

### Hospital Feedback Survey
- Has ratings (1-10 scale)
- Has hospital interaction descriptions
- Contains pain scores, wait times, length of stay
- Department satisfaction metrics
- NPS scoring

### Digital Consent Form
- No ratings
- Personal information (name, email, address)
- SCD connection types (checkbox: patient, caregiver, family member, healthcare provider, other)
- Contact preferences (may contact, mailing list, support groups, advocacy consent)
- Hospital care location
- Digital signature and date

## Implementation Status

### ✅ Completed
1. **Survey Type Detection** - `isConsentSurvey()` function checks for consent-specific fields
2. **Metrics Calculation** - Dual path: hospital feedback metrics vs consent metrics
3. **Chart Data** - Added consent-specific chart data (SCD connections, contact preferences, geography)
4. **Filtered Search** - Adapted to search consent fields (name, email, city) instead of hospital interaction

### 🔄 In Progress
5. **Quick Insight Cards** - Need to show different cards for consent surveys
6. **Filter Controls** - Hide rating filter for consent surveys

### ⏳ Pending
7. **Dashboard Title/Description** - Adapt based on survey type
8. **Chart Selection Dropdown** - Show consent charts when viewing consent data
9. **Chart Rendering** - Display consent-specific charts
10. **Submissions Table** - Show appropriate columns (name/email instead of rating/experience)
11. **Submission Detail Modal** - Format consent fields properly
12. **AI Analysis** - Adapt prompts for consent data
13. **PDF Generation** - Format consent submissions appropriately

## UI Components to Update

### Header Section
```typescript
// Current:
<h1>Feedback Dashboard</h1>
<p>Comprehensive hospital experience analytics</p>

// Should become (for consent):
<h1>Consent Form Submissions</h1>
<p>SCAGO Digital Consent & Information Collection</p>
```

### Filter Controls
- Hide "Rating Filter" dropdown when `isConsent === true`
- Keep: Survey selector, Date range, Hospital filter, Search

### Key Metrics Cards (4 cards)

#### Hospital Feedback Mode:
1. Total Submissions
2. Average Rating
3. Top Hospital (by rating)
4. Number of Surveys

#### Consent Mode:
1. Total Submissions
2. May Contact (% who said yes)
3. Top Location (most common city)
4. Number of Surveys

### Sentiment Distribution (3 cards below metrics)

#### Hospital Feedback Mode:
- Excellent Experience (8-10 rating) - Green
- Good Experience (5-7 rating) - Yellow  
- Needs Improvement (0-4 rating) - Red

#### Consent Mode:
- Contact Preferences (% opted in) - Blue
- Mailing List (% joined) - Purple
- Support Groups (% interested) - Green

### Charts Section

#### Hospital Feedback Charts:
- Rating Trends (line chart)
- Pain Scores (bar chart)
- Wait Times (pie chart)
- Length of Stay (pie chart)
- Department Satisfaction (bar chart)

#### Consent Charts:
- Submissions Over Time (line chart) - keep same
- SCD Connection Types (bar chart)
- Contact Preferences (bar chart)
- Geographic Distribution (bar chart showing top 10 cities)

### Submissions Table

#### Hospital Feedback Columns:
- Date
- Rating  
- Experience (hospitalInteraction field)
- View button

#### Consent Columns:
- Date
- Name (firstName + lastName)
- Email
- City
- View button

### Submission Detail Modal

#### Hospital Feedback:
- Show all hospital visit details
- Pain scores, wait times, etc.
- Generate AI analysis focused on care quality

#### Consent Mode:
- Show personal information section
- SCD connection details
- Contact preferences
- Care information
- Digital signature confirmation
- NO AI analysis button (not applicable)

## Code Pattern

Throughout the dashboard client, use this pattern:

```typescript
if (isConsent) {
  // Consent-specific rendering
} else {
  // Hospital feedback rendering
}
```

## Metrics Access Pattern

```typescript
// Hospital feedback
const avgRating = (metrics as any).avg
const excellent = (metrics as any).excellent

// Consent
const mayContactPercent = (metrics as any).consentMetrics?.mayContactPercent
const scdConnections = (metrics as any).consentMetrics?.scdConnectionCounts
```

## Next Steps
1. Update the quick insight cards section (lines ~547-597)
2. Update sentiment distribution cards (lines ~599-642)
3. Update chart selection dropdown (lines ~704-724)
4. Update chart rendering (lines ~768-930)
5. Update submissions table headers/cells (lines ~1009-1030)
6. Update submission modal display (lines ~1033-1506)
7. Create consent-specific AI analysis function
8. Update PDF generation for consent data
