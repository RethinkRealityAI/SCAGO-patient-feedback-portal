/**
 * @fileOverview A feedback analysis AI agent.
 *
 * - analyzeFeedback - A function that handles the feedback analysis process.
 * - FeedbackAnalysisInput - The input type for the analyzeFeedback function.
 * - FeedbackAnalysisOutput - The return type for the analyzeFeedback function.
 */
'use server';

import { ai } from '@/ai/genkit';
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

const analyzeFeedbackPrompt = ai.definePrompt({
  name: 'analyzeFeedbackPrompt',
  input: { schema: FeedbackAnalysisInputSchema },
  output: { schema: FeedbackAnalysisOutputSchema },
  prompt: `You are an expert healthcare analyst specializing in patient feedback for Sickle Cell Disease (SCD) care. Your task is to analyze the following patient feedback and provide a structured analysis.

  Patient Feedback:
  - Hospital: {{{location}}}
  - Rating: {{{rating}}}/5
  - Feedback Text: {{{feedbackText}}}

  Based on the feedback, rating, and your knowledge of SCD care challenges, perform the following:
  1.  Determine the overall sentiment (Positive, Negative, or Neutral).
  2.  Provide a concise, objective summary of the patient's experience.
  3.  Identify the key topics or themes (e.g., "Pain Management", "Triage Wait Time", "Staff Empathy", "Medication Timeliness").
  4.  Suggest 1-3 actionable recommendations for the hospital to improve care based on this specific feedback.`,
});

const analyzeFeedbackFlow = ai.defineFlow(
  {
    name: 'analyzeFeedbackFlow',
    inputSchema: FeedbackAnalysisInputSchema,
    outputSchema: FeedbackAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeFeedbackPrompt(input);
    if (!output) {
      throw new Error('Failed to get a structured response from the model.');
    }
    return output;
  }
);


export async function analyzeFeedback(
  input: FeedbackAnalysisInput
): Promise<FeedbackAnalysisOutput> {
  return analyzeFeedbackFlow(input);
}
