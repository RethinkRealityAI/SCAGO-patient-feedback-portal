/**
 * @fileOverview Genkit configuration and model setup
 *
 * This module is intended for server-side use only but does not export Server Actions.
 * Do not import this from client components. Server actions should dynamically import flows.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

/**
 * Thrown when the Gemini API key is missing or obviously malformed, so callers
 * can tell a configuration problem apart from a model/network failure and show
 * an admin something they can actually act on.
 */
export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIConfigurationError';
  }
}

const apiKey = process.env.GOOGLE_API_KEY;

/**
 * Whether AI features can run at all. Server actions call this before importing
 * a flow so a missing key surfaces as a clear message instead of an opaque
 * module-load crash.
 */
export function isAIConfigured(): boolean {
  return typeof apiKey === 'string' && apiKey.length >= 20;
}

if (!apiKey) {
  console.error('GOOGLE_API_KEY is not set — AI features are disabled.');
  throw new AIConfigurationError(
    'AI features are not configured: GOOGLE_API_KEY is missing. Add a Gemini API key from https://aistudio.google.com/apikey to the server environment.'
  );
}

// Validate API key format (basic validation)
if (apiKey.length < 20) {
  throw new AIConfigurationError(
    'AI features are not configured: GOOGLE_API_KEY appears invalid (too short). Replace it with a Gemini API key from https://aistudio.google.com/apikey.'
  );
}

// Configure Genkit with Google AI plugin
// Passing GOOGLE_API_KEY explicitly since plugin expects GEMINI_API_KEY by default
const googleAIPlugin = googleAI({ apiKey });
export const ai = genkit({
  plugins: [googleAIPlugin],
});

/**
 * Base model for every flow.
 *
 * This was pinned to `gemini-1.5-flash`, which Google has retired: any API key
 * issued after its cutoff gets `404 NOT_FOUND`, so every AI feature in the app
 * failed regardless of quota or billing. `gemini-2.5-flash` is closed to new
 * keys for the same reason — the API's own 404 for it points callers at
 * `gemini-3.6-flash`, which is what we pin here.
 *
 * When this model is eventually retired the symptom is the same 404, and
 * `describeAIError` in src/ai/utils/error-handler.ts says so explicitly. Check
 * https://ai.google.dev/gemini-api/docs/models for the current id.
 */
export const GEMINI_FLASH_LATEST_MODEL_ID = 'googleai/gemini-3.6-flash';

/**
 * Token budgets.
 *
 * Gemini 3.x reasons before answering and those thinking tokens come out of
 * `maxOutputTokens`. A short analysis here spends ~700 tokens thinking before
 * writing ~100 of JSON, so a tight budget can be consumed entirely by thinking
 * and return nothing — which surfaced as "Model returned empty output". The
 * budgets below leave ample room on top of that overhead.
 *
 * Note: `thinkingConfig: { thinkingBudget: 0 }` is NOT set. Gemini 2.5 accepted
 * it, but 3.x rejects it with `400 INVALID_ARGUMENT`. Headroom, not a disabled
 * budget, is what keeps these flows reliable.
 */
export const modelConfigs = {
  // Analysis flows: Lower temperature for consistency
  analysis: {
    temperature: 0.4,
    topP: 0.95,
    maxOutputTokens: 4096,
  },
  // Chat flows: Higher temperature for natural conversation
  chat: {
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
  // Report generation: Medium temperature for balanced creativity
  report: {
    temperature: 0.6,
    topP: 0.95,
    maxOutputTokens: 16384,
  },
} as const;

// Export model instances for convenience (same model, different configs used at prompt level)
export const analysisModel = GEMINI_FLASH_LATEST_MODEL_ID;
export const chatModel = GEMINI_FLASH_LATEST_MODEL_ID;
export const reportModel = GEMINI_FLASH_LATEST_MODEL_ID;
