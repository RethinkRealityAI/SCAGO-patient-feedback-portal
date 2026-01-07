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
  try {
    // 1. Simplify submissions to reduce payload size and token usage
    // We remove system fields that aren't relevant for analysis
    const simplified = submissions.map((s) => {
      // Create a clean object without system IDs
      const { id, surveyId, userId, sessionId, ...rest } = s as any;
      return rest;
    });

    // 2. Convert to JSON and enforce a hard character limit
    // 100k characters is approx 25k tokens, well within Gemini 1.5 Flash interaction limits
    // but prevents internal serialization/network timeouts
    let json = JSON.stringify(simplified, null, 2);
    if (json.length > 100000) {
      console.warn(`[chatWithData] Truncating submission data from ${json.length} chars to 100k`);
      json = json.slice(0, 100000) + '... (truncated)';
    }

    const result = await chatWithDataFlow({
      query,
      submissions: json,
    });

    if (!result || !result.response) {
      throw new Error('AI service returned an empty response');
    }

    return result.response;
  } catch (error) {
    console.error('[chatWithData] Error:', error);
    // Return a graceful fallback instead of crashing
    return "I apologize, but I'm having trouble analyzing the large volume of data right now. Could you try asking about a specific aspect or filter the data first?";
  }
}
