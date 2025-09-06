'use server';
/**
 * @fileOverview Analyzes the sentiment of patient feedback using Genkit.
 *
 * - analyzePatientFeedbackSentiment - Analyzes patient feedback and returns a sentiment analysis.
 * - AnalyzePatientFeedbackSentimentInput - The input type for analyzePatientFeedbackSentiment.
 * - AnalyzePatientFeedbackSentimentOutput - The output type for analyzePatientFeedbackSentiment.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePatientFeedbackSentimentInputSchema = z.object({
  feedbackText: z
    .string()
    .describe('The text of the patient feedback to analyze.'),
});
export type AnalyzePatientFeedbackSentimentInput =
  z.infer<typeof AnalyzePatientFeedbackSentimentInputSchema>;

const AnalyzePatientFeedbackSentimentOutputSchema = z.object({
  sentiment: z
    .string()
    .describe(
      'The sentiment of the feedback, either positive, negative, or neutral.'
    ),
  summary: z
    .string()
    .describe('A short summary of the main topics and ideas in the feedback.'),
});
export type AnalyzePatientFeedbackSentimentOutput =
  z.infer<typeof AnalyzePatientFeedbackSentimentOutputSchema>;

export async function analyzePatientFeedbackSentiment(
  input: AnalyzePatientFeedbackSentimentInput
): Promise<AnalyzePatientFeedbackSentimentOutput> {
  return analyzePatientFeedbackSentimentFlow(input);
}

const analyzePatientFeedbackSentimentPrompt = ai.definePrompt({
  name: 'analyzePatientFeedbackSentimentPrompt',
  input: {schema: AnalyzePatientFeedbackSentimentInputSchema},
  output: {schema: AnalyzePatientFeedbackSentimentOutputSchema},
  prompt: `Analyze the following patient feedback and determine its sentiment (positive, negative, or neutral) and provide a short summary of the main topics and ideas in the feedback.

Feedback: {{{feedbackText}}}

Sentiment: 
Summary: `,
});

const analyzePatientFeedbackSentimentFlow = ai.defineFlow(
  {
    name: 'analyzePatientFeedbackSentimentFlow',
    inputSchema: AnalyzePatientFeedbackSentimentInputSchema,
    outputSchema: AnalyzePatientFeedbackSentimentOutputSchema,
  },
  async input => {
    const {output} = await analyzePatientFeedbackSentimentPrompt(input);
    return output!;
  }
);
