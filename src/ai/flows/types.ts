
import { z } from 'zod';

// Define the input schema for the feedback analysis flow with enhanced validation
export const FeedbackAnalysisInputSchema = z.object({
  feedbackText: z.string()
    .min(1, 'Feedback text cannot be empty')
    .max(50000, 'Feedback text is too long (max 50,000 characters)')
    .describe('The full text of the patient feedback.'),
  location: z.string()
    .min(1, 'Location cannot be empty')
    .max(200, 'Location name is too long (max 200 characters)')
    .describe('The hospital or location where the experience occurred.'),
  rating: z.number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5')
    .describe('The star rating given by the user (1-5).'),
});
export type FeedbackAnalysisInput = z.infer<typeof FeedbackAnalysisInputSchema>;


// Define the output schema for the feedback analysis flow
export const FeedbackAnalysisOutputSchema = z.object({
  sentiment: z
    .enum(['Positive', 'Negative', 'Neutral'])
    .describe('The overall sentiment of the feedback.'),
  summary: z.string().describe('A concise summary of the feedback provided.'),
  keyTopics: z
    .array(z.string())
    .describe(
      'A list of the key topics or themes mentioned in the feedback (e.g., "Wait Time", "Staff Attitude", "Pain Management").'
    ),
  suggestedActions: z
    .array(z.string())
    .describe(
      'A list of potential actions the hospital could take to address the feedback.'
    ),
});
export type FeedbackAnalysisOutput = z.infer<
  typeof FeedbackAnalysisOutputSchema
>;

    