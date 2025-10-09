import {genkit} from 'genkit';
import {googleAI, gemini25FlashLite} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  model: gemini25FlashLite,
});
