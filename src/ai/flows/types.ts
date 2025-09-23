
import { z } from 'zod';

// Define the input schema for the feedback analysis flow
export const FeedbackAnalysisInputSchema = z.object({
  feedbackText: z.string().describe('The full text of the patient feedback.'),
  location: z.string().describe('The hospital or location where the experience occurred.'),
  rating: z.number().describe('The star rating given by the user (1-5).'),
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

    