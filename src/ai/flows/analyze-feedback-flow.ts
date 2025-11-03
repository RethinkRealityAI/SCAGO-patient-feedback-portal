
/**
 * @fileOverview A feedback analysis AI agent.
 *
 * - analyzeFeedback - A function that handles the feedback analysis process.
 */
'use server';

import { ai, analysisModel, modelConfigs } from '@/ai/genkit';
import {
    FeedbackAnalysisInput,
    FeedbackAnalysisInputSchema,
    FeedbackAnalysisOutput,
    FeedbackAnalysisOutputSchema,
} from './types';
import {
  AIFlowError,
  handleAIFlowError,
  withRetry,
  trackAIPerformance,
} from '@/ai/utils';
import { sanitizeFeedbackText } from '@/ai/utils/sanitization';

// Preprocess input to sanitize feedback text
function preprocessInput(input: FeedbackAnalysisInput): FeedbackAnalysisInput {
  return {
    ...input,
    feedbackText: sanitizeFeedbackText(input.feedbackText),
    location: input.location.trim().slice(0, 200),
  };
}

const analyzeFeedbackPrompt = ai.definePrompt({
  name: 'analyzeFeedbackPrompt',
  model: analysisModel,
  input: { schema: FeedbackAnalysisInputSchema },
  output: { schema: FeedbackAnalysisOutputSchema },
  config: {
    ...modelConfigs.analysis,
  },
  prompt: `You are an expert healthcare analyst specializing in patient feedback for Sickle Cell Disease (SCD) care. Your task is to analyze the following patient feedback and provide a structured analysis.

Patient Feedback:
- Hospital: {{{location}}}
- Rating: {{{rating}}}/5
- Feedback Text: {{{feedbackText}}}

Based on the feedback, rating, and your knowledge of SCD care challenges, perform the following:
1. Determine the overall sentiment (Positive, Negative, or Neutral).
2. Provide a concise, objective summary of the patient's experience.
3. Identify the key topics or themes (e.g., "Pain Management", "Triage Wait Time", "Staff Empathy", "Medication Timeliness").
4. Suggest 1-3 actionable recommendations for the hospital to improve care based on this specific feedback.`,
});

const analyzeFeedbackFlow = ai.defineFlow(
  {
    name: 'analyzeFeedbackFlow',
    inputSchema: FeedbackAnalysisInputSchema,
    outputSchema: FeedbackAnalysisOutputSchema,
  },
  async (input) => {
    return trackAIPerformance('analyzeFeedbackFlow', async () => {
      try {
        // Preprocess and sanitize input
        const sanitizedInput = preprocessInput(input);
        
        const result = await withRetry(
          async () => {
            const { output } = await analyzeFeedbackPrompt(sanitizedInput);
            if (!output) {
              throw new AIFlowError(
                'Model returned empty output',
                'analyzeFeedbackFlow',
                undefined,
                sanitizedInput
              );
            }
            return output;
          },
          {
            maxRetries: 3,
            initialDelayMs: 1000,
            onRetry: (attempt, error) => {
              console.warn(`[analyzeFeedbackFlow] Retry attempt ${attempt}:`, error.message);
            },
          }
        );
        
        return result;
      } catch (error) {
        handleAIFlowError('analyzeFeedbackFlow', error, input);
      }
    }, {
      flowName: 'analyzeFeedbackFlow',
      inputSize: JSON.stringify(input).length,
    });
  }
);


export async function analyzeFeedback(
  input: FeedbackAnalysisInput
): Promise<FeedbackAnalysisOutput> {
  return analyzeFeedbackFlow(input);
}

    