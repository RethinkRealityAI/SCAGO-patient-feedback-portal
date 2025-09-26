export interface FeedbackSubmission {
  id: string;
  rating: number;
  hospitalInteraction: string;
  submittedAt: Date;
  surveyId: string;
}
