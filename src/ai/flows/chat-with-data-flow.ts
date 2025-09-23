/**
 * @fileOverview A flow for chatting with feedback data.
 *
 * - chatWithData - A function that takes a user query and a list of submissions and returns a text response.
 */
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { FeedbackSubmission } from '@/app/dashboard/types';

const ChatWithDataInputSchema = z.object({
  query: z.string().describe('The user\'s question about the feedback data.'),
  submissions: z
    .string()
    .describe('A JSON string representing all the feedback submissions.'),
});

const ChatWithDataOutputSchema = z.object({
  response: z
    .string()
    .describe('The AI-generated response to the user\'s query.'),
});

const chatWithDataPrompt = ai.definePrompt({
  name: 'chatWithDataPrompt',
  input: { schema: ChatWithDataInputSchema },
  output: { schema: ChatWithDataOutputSchema },
  prompt: `You are a helpful assistant for analyzing patient feedback data for Sickle Cell Disease (SCD) care.
  You will be given a user's query and a dataset of feedback submissions in JSON format.
  Your task is to answer the user's question based on the provided data.
  Provide clear, concise answers. If the data does not contain the answer, say so.

  User Query:
  {{{query}}}

  Feedback Data:
  {{{submissions}}}
  `,
});

const chatWithDataFlow = ai.defineFlow(
  {
    name: 'chatWithDataFlow',
    inputSchema: ChatWithDataInputSchema,
    outputSchema: ChatWithDataOutputSchema,
  },
  async (input) => {
    const { output } = await chatWithDataPrompt(input);
    if (!output) {
      throw new Error('Failed to get a structured response from the model.');
    }
    return output;
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
