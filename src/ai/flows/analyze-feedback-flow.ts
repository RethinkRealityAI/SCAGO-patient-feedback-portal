
/**
 * @fileOverview A feedback analysis AI agent.
 *
 * - analyzeFeedback - A function that handles the feedback analysis process.
 */
'use server';

import { ai, geminiModel } from '@/ai/genkit';
import {
    FeedbackAnalysisInput,
    FeedbackAnalysisInputSchema,
    FeedbackAnalysisOutput,
    FeedbackAnalysisOutputSchema,
} from './types';


const analyzeFeedbackPrompt = ai.definePrompt({
  name: 'analyzeFeedbackPrompt',
  model: geminiModel,
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

    