# AI Context System for Survey Analysis

## Overview
The AI Context System provides survey-specific context and prompts to ensure AI analysis, chatbot interactions, and quick insight questions are always relevant to the selected survey type.

## Problem Solved
Previously, the AI system used generic feedback-focused prompts and questions regardless of survey type. When analyzing consent forms or overview data, the AI would receive inappropriate context (e.g., asking about "pain scores" when analyzing consent forms).

## Solution: Modular Survey Context Library

### Architecture

```
src/lib/survey-contexts.ts
├── Survey Type Detection
├── Context Definitions (Feedback, Consent, Overview)
├── Analysis Prompt Generation
└── Quick Insight Questions
```

### Key Components

#### 1. **Survey Context Interface**
```typescript
interface SurveyContext {
  type: SurveyType                    // 'feedback' | 'consent' | 'overview'
  title: string                       // Human-readable survey name
  description: string                 // Survey purpose
  keyFields: string[]                 // Important fields in this survey
  analysisPrompt: string              // AI analysis instructions
  quickInsightQuestions: string[]     // Predefined questions
}
```

#### 2. **Feedback Survey Context**
**Focus**: Patient experience and satisfaction
**Key Fields**:
- Rating (1-10 scale)
- Hospital, Department
- Pain scores
- Wait times
- Length of stay

**Quick Insights** (8 questions):
- Main pain points
- Department satisfaction
- Wait time reduction
- Patient appreciation
- Safety concerns
- Pain management trends
- Top performers
- High-impact improvements

#### 3. **Consent Survey Context**
**Focus**: Community engagement and demographic patterns
**Key Fields**:
- Personal information (name, email, phone)
- Demographics (DOB, address, city)
- Primary hospital
- SCD connection types
- Contact preferences

**Quick Insights** (8 questions):
- Geographic distribution
- SCD connection types
- Opt-in rates
- Communication preferences
- Support group engagement
- Hospital locations
- Underserved areas
- Demographic patterns

#### 4. **Overview Context**
**Focus**: Cross-survey trends and resource allocation
**Key Fields**:
- Survey ID and type
- Submission dates
- Locations
- Submission counts

**Quick Insights** (8 questions):
- Submission trends
- Survey popularity
- Geographic patterns
- Seasonal trends
- Location engagement
- Resource allocation
- Cross-program insights
- Strategic recommendations

## Implementation Details

### 1. Type Detection
```typescript
function detectSurveyType(submission: any): SurveyType {
  // Check for consent-specific fields
  if (submission.digitalSignature || submission.ageConfirmation) {
    return 'consent'
  }
  // Check for feedback-specific fields
  if (submission.rating !== undefined) {
    return 'feedback'
  }
  return 'feedback' // default
}
```

### 2. Context Retrieval
```typescript
function getSurveyContextFromId(surveyId: string, submissions: any[]): SurveyContext {
  if (surveyId === 'all') {
    return OVERVIEW_SURVEY_CONTEXT
  }
  const surveySubmissions = submissions.filter(s => s.surveyId === surveyId)
  const type = detectSurveyType(surveySubmissions[0])
  return getSurveyContext(type)
}
```

### 3. Analysis Prompt Generation
```typescript
function getAnalysisPrompt(context: SurveyContext, count: number, dateRange?: string): string {
  return `${context.analysisPrompt}

You are analyzing ${count} ${context.title} submission${count !== 1 ? 's' : ''}.

Key fields:
${context.keyFields.map(field => `- ${field}`).join('\n')}

Provide actionable insights.`
}
```

## Integration Points

### 1. **Dashboard Analysis** (`analyzeFeedbackForSurvey`)
```typescript
// Get survey-specific context
const surveyContext = getSurveyContextFromId(surveyId, allSubmissions);

// Build context-aware data summary
if (surveyContext.type === 'consent') {
  // Consent-specific metrics and data formatting
} else if (surveyContext.type === 'overview') {
  // Overview-specific cross-survey insights
} else {
  // Feedback-specific rating and satisfaction metrics
}

// Get context-aware prompt
const contextPrompt = getAnalysisPrompt(surveyContext, feedbackList.length);

// Run AI with proper context
const ai = await runAnalysisFlow({
  location: surveyContext.type === 'consent' ? 'SCAGO Community' : 'Various Hospitals',
  feedbackText: `${contextPrompt}\n\nData:\n${feedbackText}`
});
```

### 2. **AI Chat** (`chatWithFeedbackData`)
```typescript
// Get survey context
const surveyContext = getSurveyContextFromId(surveyId || 'all', allSubmissions);

// Contextualize user query
const contextualizedQuery = `Context: You are analyzing ${surveyContext.title}.

Key fields:
${surveyContext.keyFields.map(f => `- ${f}`).join('\n')}

${surveyContext.analysisPrompt}

User question: ${query}`;

// AI now understands the survey type
const response = await chatWithData(contextualizedQuery, feedbackList);
```

### 3. **Quick Insight Questions** (AI Chat Interface)
```typescript
// Load survey-specific questions when survey changes
useEffect(() => {
  const context = getSurveyContextFromId(surveyId || '', []);
  const questions = getQuickInsightQuestions(context);
  setDynamicQuestions(questions);
}, [surveyId]);

// Display as clickable buttons above general questions
{dynamicQuestions.slice(0, 8).map((question, index) => (
  <button onClick={() => handlePredefinedQuery(question)}>
    {question}
  </button>
))}
```

## User Experience Improvements

### Before
❌ Consent form analysis asked about "pain scores"  
❌ Generic questions like "Which hospitals rated lowest?"  
❌ Confusing AI responses mixing contexts  
❌ No relevant quick insights for consent forms  

### After
✅ Consent analysis focuses on engagement & demographics  
✅ Survey-specific questions ("What SCD connections are most common?")  
✅ Contextually relevant AI responses  
✅ 8 quick insights tailored to each survey type  

## Adding New Survey Types

### Step 1: Define Context
```typescript
export const NEW_SURVEY_CONTEXT: SurveyContext = {
  type: 'new_type',
  title: 'New Survey Name',
  description: 'Purpose of this survey',
  keyFields: [
    'field1',
    'field2',
    // ... list all important fields
  ],
  analysisPrompt: `Instructions for AI on how to analyze this data...`,
  quickInsightQuestions: [
    'Question 1?',
    'Question 2?',
    // ... 8 questions total
  ]
}
```

### Step 2: Update Detection
```typescript
function detectSurveyType(submission: any): SurveyType {
  if (submission.newTypeField) {
    return 'new_type'
  }
  // ... existing checks
}
```

### Step 3: Update getSurveyContext
```typescript
function getSurveyContext(type: SurveyType): SurveyContext {
  switch (type) {
    case 'new_type':
      return NEW_SURVEY_CONTEXT
    // ... existing cases
  }
}
```

### Step 4: Update analyzeFeedbackForSurvey
Add data formatting logic for the new survey type:
```typescript
if (surveyContext.type === 'new_type') {
  // Extract and format new survey specific data
  metrics = { /* new survey metrics */ }
  feedbackText = /* formatted data for AI */
}
```

## Benefits

### For Users
- **Relevant Questions**: See questions that apply to their survey
- **Accurate Analysis**: AI understands what to look for
- **Faster Insights**: Pre-written questions for common needs
- **Better UX**: No confusion from irrelevant options

### For Developers
- **Maintainability**: All context in one file
- **Extensibility**: Easy to add new survey types
- **Consistency**: Single source of truth for survey definitions
- **Type Safety**: TypeScript interfaces prevent errors

### For AI
- **Better Context**: Understands survey purpose
- **Relevant Fields**: Knows which data to focus on
- **Appropriate Tone**: Adjusts language for audience
- **Actionable Output**: Provides survey-specific recommendations

## File Structure

```
src/lib/survey-contexts.ts               # Main library
├── FEEDBACK_SURVEY_CONTEXT
├── CONSENT_SURVEY_CONTEXT
├── OVERVIEW_SURVEY_CONTEXT
├── detectSurveyType()
├── getSurveyContext()
├── getSurveyContextFromId()
├── getAnalysisPrompt()
└── getQuickInsightQuestions()

src/app/dashboard/actions.ts             # Server actions
├── analyzeFeedbackForSurvey()           # Uses context for analysis
└── chatWithFeedbackData()               # Uses context for chat

src/components/ai-chat-interface.tsx     # Client component
└── Displays survey-specific quick questions
```

## Performance Considerations

- **Context Retrieval**: O(1) - Direct object access
- **Type Detection**: O(1) - Simple field checks
- **Question Loading**: Happens once per survey change
- **No API Calls**: All context is static configuration

## Testing Checklist

- [ ] Feedback survey shows feedback-specific questions
- [ ] Consent survey shows consent-specific questions
- [ ] Overview mode shows overview-specific questions
- [ ] AI analysis mentions appropriate fields
- [ ] Chat responses are contextually relevant
- [ ] Questions change when switching surveys
- [ ] New survey types can be added easily

## Related Documentation
- [Dashboard Enhancements](./DASHBOARD-ENHANCEMENTS.md)
- [Survey Overview Mode](./SURVEY-OVERVIEW-MODE.md)
- [Creating Surveys](./creating-surveys.md)

---

**Implemented**: 2025-09-30  
**Version**: 1.0  
**Author**: SCAGO Development Team

