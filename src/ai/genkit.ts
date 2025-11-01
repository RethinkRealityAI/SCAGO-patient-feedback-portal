import {genkit} from 'genkit';
import {googleAI, gemini15Flash} from '@genkit-ai/googleai';

// Validate API key exists but don't log it
if (!process.env.GOOGLE_API_KEY) {
  console.error('GOOGLE_API_KEY is not set in environment variables');
  throw new Error('GOOGLE_API_KEY environment variable is required');
}

// Configure Genkit with Google AI plugin
// The plugin automatically reads GOOGLE_API_KEY from environment variables
export const ai = genkit({
  plugins: [googleAI()],
});

// Export the model constant - Genkit should handle the API version automatically
// If you encounter API version errors, the model constant should resolve to the correct endpoint
export const geminiModel = gemini15Flash;