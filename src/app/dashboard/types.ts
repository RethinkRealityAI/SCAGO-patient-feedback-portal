export interface FeedbackSubmission {
  id: string;
  rating: number;
  hospitalInteraction: string;
  submittedAt: Date;
  surveyId: string;
  sessionId?: string;  // Session ID to track related submissions from same browser session
}
