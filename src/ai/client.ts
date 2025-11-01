import { ai, geminiModel } from './genkit';
import { z } from 'zod';

export const virtualAssistant = ai.defineFlow(
  {
    name: 'virtualAssistant',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (prompt: string) => {
    const llmResponse = await ai.generate({
      model: geminiModel,
      prompt: `
    You are a virtual assistant for a survey application.
    Your goal is to help users understand their survey data.
    You can answer questions about survey results, sentiment analysis, and more.
    Be friendly, helpful, and concise in your responses.
    
    The user's question is: ${prompt}
  `,
    });

    return llmResponse.text;
  }
);
