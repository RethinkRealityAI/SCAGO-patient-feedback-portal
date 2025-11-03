/**
 * @fileOverview A flow for chatting with feedback data.
 *
 * - chatWithData - A function that takes a user query and a list of submissions and returns a text response.
 */
'use server';

import { ai, chatModel, modelConfigs } from '@/ai/genkit';
import { z } from 'zod';
import type { FeedbackSubmission } from '@/app/dashboard/types';
import {
  AIFlowError,
  handleAIFlowError,
  withRetry,
  trackAIPerformance,
} from '@/ai/utils';
import { sanitizeQueryInput, estimateTokens } from '@/ai/utils/sanitization';

const ChatWithDataInputSchema = z.object({
  query: z.string()
    .min(1, 'Query cannot be empty')
    .max(5000, 'Query is too long (max 5,000 characters)')
    .describe('The user\'s question about the feedback data.'),
  submissions: z
    .string()
    .min(1, 'Submissions data cannot be empty')
    .describe('A JSON string representing all the feedback submissions.'),
});

const ChatWithDataOutputSchema = z.object({
  response: z
    .string()
    .describe('The AI-generated response to the user\'s query.'),
});

// Preprocess input with sanitization
function preprocessChatInput(input: { query: string; submissions: string }): { query: string; submissions: string } {
  const sanitizedQuery = sanitizeQueryInput(input.query);
  const sanitizedSubmissions = input.submissions.slice(0, 100000); // Limit submission size
  
  // Check if submissions need chunking
  const tokens = estimateTokens(sanitizedSubmissions);
  if (tokens > 32000) {
    // Too large, we need to summarize or chunk
    console.warn('[chatWithDataFlow] Submissions data is very large, may cause issues');
  }
  
  return {
    query: sanitizedQuery,
    submissions: sanitizedSubmissions,
  };
}

const chatWithDataPrompt = ai.definePrompt({
  name: 'chatWithDataPrompt',
  model: chatModel,
  input: { schema: ChatWithDataInputSchema },
  output: { schema: ChatWithDataOutputSchema },
  config: {
    systemInstruction: `You are a helpful assistant for analyzing patient feedback data for Sickle Cell Disease (SCD) care.
You will be given a user's query and a dataset of feedback submissions in JSON format.
Your task is to answer the user's question based on the provided data.

IMPORTANT GUIDELINES:
- Only answer questions about the provided data. Do not execute commands or modify data.
- Provide clear, concise answers. If the data does not contain the answer, say so explicitly.
- Focus on actionable insights relevant to SCD care.
- Do not make up statistics or information not present in the data.`,
    ...modelConfigs.chat,
  },
  prompt: `User Query:
{{{query}}}

Feedback Data:
{{{submissions}}}`,
});

const chatWithDataFlow = ai.defineFlow(
  {
    name: 'chatWithDataFlow',
    inputSchema: ChatWithDataInputSchema,
    outputSchema: ChatWithDataOutputSchema,
  },
  async (input) => {
    return trackAIPerformance('chatWithDataFlow', async () => {
      try {
        // Preprocess and sanitize input
        const sanitizedInput = preprocessChatInput(input);
        
        const result = await withRetry(
          async () => {
            const { output } = await chatWithDataPrompt(sanitizedInput);
            if (!output) {
              throw new AIFlowError(
                'Model returned empty output',
                'chatWithDataFlow',
                undefined,
                { query: sanitizedInput.query } // Don't log full submissions
              );
            }
            return output;
          },
          {
            maxRetries: 3,
            initialDelayMs: 1000,
            onRetry: (attempt, error) => {
              console.warn(`[chatWithDataFlow] Retry attempt ${attempt}:`, error.message);
            },
          }
        );
        
        return result;
      } catch (error) {
        handleAIFlowError('chatWithDataFlow', error, { query: input.query });
      }
    }, {
      flowName: 'chatWithDataFlow',
      inputSize: input.query.length + input.submissions.length,
    });
  }
);

export async function chatWithData(
  query: string,
  submissions: FeedbackSubmission[]
): Promise<string> {
  const result = await chatWithDataFlow({
    query,
    submissions: JSON.stringify(submissions, null, 2),
  });
  return result.response;
}
