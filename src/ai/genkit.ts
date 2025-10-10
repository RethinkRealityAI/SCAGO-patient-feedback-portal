import {genkit} from 'genkit';
import {googleAI, gemini25FlashLite} from '@genkit-ai/googleai';

// Debug logging for environment variables
console.log('Genkit initialization - Environment check:');
console.log('GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);
console.log('GOOGLE_API_KEY length:', process.env.GOOGLE_API_KEY?.length || 0);
console.log('GOOGLE_API_KEY starts with AIza:', process.env.GOOGLE_API_KEY?.startsWith('AIza') || false);

export const ai = genkit({
  plugins: [googleAI()],
  model: gemini25FlashLite,
});
