// 'use server'
// Implement a simple chat flow using Genkit gemini25FlashLite
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const RscChatInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty'),
});

const RscChatOutputSchema = z.object({
  response: z.string(),
});

const rscChatPrompt = ai.definePrompt({
  name: 'rscChatPrompt',
  input: { schema: RscChatInputSchema },
  output: { schema: RscChatOutputSchema },
  prompt: `You are a concise, helpful assistant for the SCAGO Patient Feedback Portal.
Provide a clear, short response to the user's message.

Message:
{{{prompt}}}
`,
});

const rscChatFlow = ai.defineFlow(
  {
    name: 'rscChatFlow',
    inputSchema: RscChatInputSchema,
    outputSchema: RscChatOutputSchema,
  },
  async (input) => {
    const { output } = await rscChatPrompt(input);
    if (!output) throw new Error('No response from model');
    return output;
  }
);

export async function rscChat(prompt: string): Promise<string> {
  const result = await rscChatFlow({ prompt });
  return result.response;
}
