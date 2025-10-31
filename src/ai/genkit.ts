import {genkit} from 'genkit';
import {googleAI, gemini15Flash} from '@genkit-ai/googleai';

// Validate API key exists but don't log it
if (!process.env.GOOGLE_API_KEY) {
  console.error('GOOGLE_API_KEY is not set in environment variables');
}

export const ai = genkit({
  plugins: [googleAI()],
  model: gemini15Flash,
});