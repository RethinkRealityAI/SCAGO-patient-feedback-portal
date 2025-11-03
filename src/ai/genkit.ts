/**
 * @fileOverview Genkit configuration and model setup
 * 
 * This module is intended for server-side use only but does not export Server Actions.
 * Do not import this from client components. Server actions should dynamically import flows.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Validate API key exists but don't log it
if (!process.env.GOOGLE_API_KEY) {
  console.error('GOOGLE_API_KEY is not set in environment variables');
  throw new Error('GOOGLE_API_KEY environment variable is required');
}

// Validate API key format (basic validation)
if (process.env.GOOGLE_API_KEY.length < 20) {
  throw new Error('GOOGLE_API_KEY appears invalid (too short)');
}

// Configure Genkit with Google AI plugin
// The plugin automatically reads GOOGLE_API_KEY from environment variables
const googleAIPlugin = googleAI();
export const ai = genkit({
  plugins: [googleAIPlugin],
});

// Base model identifier to use in prompts
// Configuration (temperature, topP, etc.) is applied per-prompt via the config object
export const GEMINI_FLASH_LATEST_MODEL_ID = 'googleai/gemini-2.5-flash-lite';

// Export model configurations for use in prompt config
// These are passed to definePrompt's config parameter
export const modelConfigs = {
  // Analysis flows: Lower temperature for consistency
  analysis: {
    temperature: 0.4,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048,
  },
  // Chat flows: Higher temperature for natural conversation
  chat: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 4096,
  },
  // Report generation: Medium temperature for balanced creativity
  report: {
    temperature: 0.6,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  },
} as const;

// Export model instances for convenience (same model, different configs used at prompt level)
export const analysisModel = GEMINI_FLASH_LATEST_MODEL_ID;
export const chatModel = GEMINI_FLASH_LATEST_MODEL_ID;
export const reportModel = GEMINI_FLASH_LATEST_MODEL_ID;