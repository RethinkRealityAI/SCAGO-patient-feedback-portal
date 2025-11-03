/**
 * @fileOverview Genkit configuration and model setup
 * 
 * ⚠️ SERVER-ONLY MODULE
 * This module configures Google Genkit and must only be used in server-side code.
 * It imports server-only dependencies that cannot be bundled for the client.
 */
'use server';

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

// Base model - Using gemini-flash-latest which is the latest and cheapest Flash model
// This model is always up-to-date and cost-efficient, replacing the deprecated gemini-1.5-flash
// Model configuration (temperature, etc.) is applied at the prompt level via definePrompt config
export const geminiModel = (googleAIPlugin as any).model('gemini-flash-latest');

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
export const analysisModel = geminiModel;
export const chatModel = geminiModel;
export const reportModel = geminiModel;