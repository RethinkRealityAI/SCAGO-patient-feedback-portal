/**
 * Survey Context Library
 * 
 * Provides AI analysis with survey-specific context including questions,
 * field names, and relevant insights for each survey type.
 */

export type SurveyType = 'feedback' | 'consent' | 'overview'

export interface SurveyContext {
  type: SurveyType
  title: string
  description: string
  keyFields: string[]
  analysisPrompt: string
  quickInsightQuestions: string[]
}

/**
 * Hospital Feedback Survey Context
 */
export const FEEDBACK_SURVEY_CONTEXT: SurveyContext = {
  type: 'feedback',
  title: 'Hospital Feedback Survey',
  description: 'Patient experience and satisfaction survey for hospital visits',
  keyFields: [
    'rating (1-10 scale)',
    'hospital',
    'department',
    'hospitalInteraction',
    'visitReason',
    'painScore',
    'waitTime',
    'lengthOfStay',
    'timeToSeeDoctor',
    'timeToAnalgesia',
    'triageCategory'
  ],
  analysisPrompt: `You are analyzing hospital patient feedback submissions. Focus on:
- Overall patient satisfaction (rating 1-10)
- Wait times and efficiency metrics
- Pain management effectiveness
- Quality of care indicators
- Hospital and department-specific patterns
- Areas for improvement in patient experience
- Positive highlights and strengths

Provide actionable insights for healthcare administrators to improve patient care and experience.`,
  quickInsightQuestions: [
    'What are the main pain points in the patient experience?',
    'Which departments have the highest satisfaction?',
    'How can we reduce wait times?',
    'What do patients appreciate most?',
    'Are there any critical safety concerns?',
    'What trends do you see in pain management?',
    'Which hospitals are performing best?',
    'What improvements would have the biggest impact?'
  ]
}

/**
 * Digital Consent Form Context
 */
export const CONSENT_SURVEY_CONTEXT: SurveyContext = {
  type: 'consent',
  title: 'SCAGO Digital Consent Form',
  description: 'Digital consent and information collection for SCAGO (Sickle Cell Association of Grey Bruce Owen Sound)',
  keyFields: [
    'firstName',
    'lastName',
    'email',
    'phone',
    'dateOfBirth',
    'address',
    'city',
    'province',
    'postalCode',
    'primaryHospital',
    'scdConnection (array: self, family, friend, healthcare, educator, other)',
    'mayContact (yes/no)',
    'preferredContactMethod',
    'joinMailingList (yes/no)',
    'joinSupportGroups (yes/no)',
    'consentToAdvocacy (yes/no)',
    'ageConfirmation (boolean)',
    'digitalSignature'
  ],
  analysisPrompt: `You are analyzing digital consent form submissions for SCAGO (Sickle Cell Association of Grey Bruce Owen Sound). Focus on:
- Demographic patterns and geographic distribution
- Types of SCD connections (self, family, healthcare worker, etc.)
- Communication preferences and opt-in rates
- Engagement levels (mailing list, support groups, advocacy)
- Contact method preferences
- Primary hospital locations
- Community reach and diversity
- Opportunities for outreach and engagement

Provide insights to help SCAGO better serve the sickle cell community, plan outreach programs, and allocate resources effectively.`,
  quickInsightQuestions: [
    'What is the geographic distribution of participants?',
    'What types of SCD connections are most common?',
    'What percentage opted in for contact?',
    'Which communication methods are preferred?',
    'What is the engagement rate for support groups?',
    'Which hospitals serve the most participants?',
    'Are there underserved areas that need outreach?',
    'What demographic patterns emerge from the data?'
  ]
}

/**
 * Overview/All Surveys Context
 */
export const OVERVIEW_SURVEY_CONTEXT: SurveyContext = {
  type: 'overview',
  title: 'All Surveys Overview',
  description: 'High-level analysis across all survey submissions',
  keyFields: [
    'surveyId',
    'surveyType',
    'submittedAt',
    'location (hospital/city)',
    'submissionCount'
  ],
  analysisPrompt: `You are analyzing data across multiple survey types. Focus on:
- Overall submission trends and patterns
- Geographic distribution across all surveys
- Survey popularity and engagement rates
- Time-based patterns (peak submission times, seasonal trends)
- Cross-survey insights and correlations
- Resource allocation recommendations
- Program effectiveness indicators

Provide high-level strategic insights for administrators managing multiple survey programs.`,
  quickInsightQuestions: [
    'What are the overall submission trends?',
    'Which surveys are most popular?',
    'What geographic patterns do you see?',
    'Are there seasonal or time-based trends?',
    'Which locations show highest engagement?',
    'How should resources be allocated?',
    'What cross-program insights emerge?',
    'What strategic recommendations do you have?'
  ]
}

/**
 * Detect survey type from submission data
 */
export function detectSurveyType(submission: any): SurveyType {
  // Check for consent-specific fields
  if (submission.digitalSignature || submission.ageConfirmation || submission.scdConnection || submission.primaryHospital) {
    return 'consent'
  }
  // Check for feedback-specific fields
  if (submission.rating !== undefined || submission.hospitalInteraction) {
    return 'feedback'
  }
  // Default to feedback
  return 'feedback'
}

/**
 * Get survey context based on type
 */
export function getSurveyContext(type: SurveyType): SurveyContext {
  switch (type) {
    case 'consent':
      return CONSENT_SURVEY_CONTEXT
    case 'feedback':
      return FEEDBACK_SURVEY_CONTEXT
    case 'overview':
      return OVERVIEW_SURVEY_CONTEXT
    default:
      return FEEDBACK_SURVEY_CONTEXT
  }
}

/**
 * Get survey context from survey ID by checking submissions
 */
export function getSurveyContextFromId(surveyId: string, submissions: any[]): SurveyContext {
  if (surveyId === 'all') {
    return OVERVIEW_SURVEY_CONTEXT
  }
  
  // Find submissions for this survey
  const surveySubmissions = submissions.filter(s => s.surveyId === surveyId)
  if (surveySubmissions.length === 0) {
    return FEEDBACK_SURVEY_CONTEXT // Default
  }
  
  // Detect type from first submission
  const type = detectSurveyType(surveySubmissions[0])
  return getSurveyContext(type)
}

/**
 * Get survey-specific analysis prompt with data context
 */
export function getAnalysisPrompt(context: SurveyContext, submissionCount: number, dateRange?: string): string {
  const timeContext = dateRange && dateRange !== 'all' 
    ? ` from the ${dateRange === '7d' ? 'last 7 days' : dateRange === '30d' ? 'last 30 days' : 'last 90 days'}`
    : ''
  
  return `${context.analysisPrompt}

You are analyzing ${submissionCount} ${context.title} submission${submissionCount !== 1 ? 's' : ''}${timeContext}.

Key fields in this survey:
${context.keyFields.map(field => `- ${field}`).join('\n')}

Provide a comprehensive but concise analysis focusing on actionable insights.`
}

/**
 * Get quick insight questions for survey type
 */
export function getQuickInsightQuestions(context: SurveyContext): string[] {
  return context.quickInsightQuestions
}


