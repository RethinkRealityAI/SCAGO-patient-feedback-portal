/**
 * @fileOverview A simple chat flow for React Server Components integration.
 */
'use server';

import { ai, chatModel, modelConfigs } from '@/ai/genkit';
import { z } from 'zod';
import {
  AIFlowError,
  handleAIFlowError,
  withRetry,
  trackAIPerformance,
} from '@/ai/utils';
import { sanitizeQueryInput } from '@/ai/utils/sanitization';

const RscChatInputSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt cannot be empty')
    .max(5000, 'Prompt is too long (max 5,000 characters)'),
});

const RscChatOutputSchema = z.object({
  response: z.string(),
});

// Preprocess input with sanitization
function preprocessRscInput(input: { prompt: string }): { prompt: string } {
  return {
    prompt: sanitizeQueryInput(input.prompt),
  };
}

const rscChatPrompt = ai.definePrompt({
  name: 'rscChatPrompt',
  model: chatModel,
  input: { schema: RscChatInputSchema },
  output: { schema: RscChatOutputSchema },
  config: {
    systemInstruction: `You are a concise, helpful assistant for the SCAGO Patient Feedback Portal.
Provide clear, helpful responses to user questions.
Keep responses concise and relevant.
If asked about features you don't know about, politely say so.`,
    ...modelConfigs.chat,
  },
  prompt: `You are a concise, helpful assistant for the SCAGO Patient Feedback Portal.
Provide a clear, short response to the user's message.

Message:
{{{prompt}}}`,
});

const rscChatFlow = ai.defineFlow(
  {
    name: 'rscChatFlow',
    inputSchema: RscChatInputSchema,
    outputSchema: RscChatOutputSchema,
  },
  async (input) => {
    return trackAIPerformance('rscChatFlow', async () => {
      try {
        // Preprocess and sanitize input
        const sanitizedInput = preprocessRscInput(input);
        
        const result = await withRetry(
          async () => {
            const { output } = await rscChatPrompt(sanitizedInput);
            if (!output) {
              throw new AIFlowError(
                'Model returned empty output',
                'rscChatFlow',
                undefined,
                { promptLength: sanitizedInput.prompt.length }
              );
            }
            return output;
          },
          {
            maxRetries: 3,
            initialDelayMs: 1000,
            onRetry: (attempt, error) => {
              console.warn(`[rscChatFlow] Retry attempt ${attempt}:`, error.message);
            },
          }
        );
        
        return result;
      } catch (error) {
        handleAIFlowError('rscChatFlow', error, { promptLength: input.prompt.length });
      }
    }, {
      flowName: 'rscChatFlow',
      inputSize: input.prompt.length,
    });
  }
);

export async function rscChat(prompt: string): Promise<string> {
  const result = await rscChatFlow({ prompt });
  return result.response;
}
