/**
 * AI Flow Error Handling Utilities
 * Provides consistent error handling patterns for all AI flows
 */

export class AIFlowError extends Error {
  constructor(
    message: string,
    public readonly flowName: string,
    public readonly originalError?: unknown,
    public readonly inputData?: unknown
  ) {
    super(message);
    this.name = 'AIFlowError';
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIFlowError);
    }
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    return describeAIError(this.originalError ?? this, this.message);
  }
}

/**
 * Translate a raw provider/SDK error into something an admin can act on.
 *
 * The dashboard used to surface the raw exception text, so an expired key read
 * as `AI flow analyzeFeedbackFlow failed: [GoogleGenerativeAI Error]: ...` —
 * technically accurate, but it never told anyone the fix was to rotate the key.
 */
export function describeAIError(error: unknown, fallbackDetail?: string): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const message = raw.toLowerCase();

  // Configuration problems — the key itself is missing, revoked or wrong.
  if (message.includes('reported as leaked')) {
    return 'The Gemini API key has been disabled by Google because it was published somewhere public. Create a replacement key at https://aistudio.google.com/apikey and update GOOGLE_API_KEY.';
  }
  if (message.includes('api key not valid') || message.includes('api_key_invalid') || message.includes('invalid api key')) {
    return 'The Gemini API key is not valid. Check GOOGLE_API_KEY in the server environment.';
  }
  if (message.includes('google_api_key') || error instanceof Error && error.name === 'AIConfigurationError') {
    return raw;
  }
  if (message.includes('permission_denied') || message.includes('permission denied') || message.includes('403')) {
    return 'Google rejected the request for this API key (permission denied). Confirm the key is active and that the Generative Language API is enabled for its project.';
  }

  // The model id is gone or unavailable to this key.
  if (message.includes('not found') || message.includes('404')) {
    return 'The configured Gemini model is unavailable for this API key. It may have been retired — update the model id in src/ai/genkit.ts.';
  }

  // Quota: distinguish "wait a minute" from "you are out for the day", because
  // the Gemini free tier caps daily requests per model and waiting will not help.
  if (message.includes('perday') || message.includes('per day') || message.includes('free_tier') || message.includes('free tier')) {
    return 'The daily Gemini free-tier quota for this project is used up (about 20 report generations per day). It resets at midnight Pacific — or enable billing on the Google AI project to raise the limit.';
  }
  if (message.includes('rate limit') || message.includes('quota') || message.includes('429') || message.includes('resource_exhausted')) {
    return 'The AI service is rate limited right now. Please wait a moment and try again.';
  }
  if (message.includes('timeout') || message.includes('etimedout') || message.includes('503') || message.includes('unavailable')) {
    return 'The AI service did not respond in time. Please try again.';
  }
  if (message.includes('empty output') || message.includes('did not return')) {
    return 'The AI returned an empty response. Please try again — if it keeps happening, there may be too much data in the current selection.';
  }
  if (message.includes('fetch failed') || message.includes('econnrefused') || message.includes('enotfound') || message.includes('network')) {
    return 'Could not reach the AI service. Check the server\'s network connectivity and try again.';
  }

  return `AI analysis failed: ${fallbackDetail || raw || 'unknown error'}`;
}

/**
 * Handle AI flow errors with consistent logging and error formatting
 */
export function handleAIFlowError(
  flowName: string,
  error: unknown,
  input?: unknown
): never {
  // If it's already an AIFlowError, just rethrow
  if (error instanceof AIFlowError) {
    throw error;
  }
  
  const message = error instanceof Error 
    ? error.message 
    : 'Unknown AI flow error';
  
  // Log error details for debugging (sanitize input to avoid logging sensitive data)
  const sanitizedInput = input 
    ? JSON.stringify(input).slice(0, 500) 
    : undefined;
  
  console.error(`[${flowName}] AI Flow Error:`, {
    message,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    } : String(error),
    input: sanitizedInput,
    timestamp: new Date().toISOString(),
  });
  
  throw new AIFlowError(
    `AI flow ${flowName} failed: ${message}`,
    flowName,
    error,
    input
  );
}

/**
 * Failures that no amount of retrying will clear within a request.
 *
 * A daily quota is the important one: the Gemini free tier allows only ~20
 * requests per model per day, so retrying a daily-quota 429 three times turned
 * one user click into four billed requests and burned the allowance four times
 * faster — which is exactly how the AI features ended up permanently erroring.
 * Per-minute rate limits are still worth a short backoff.
 */
function isPermanentFailure(message: string): boolean {
  return (
    message.includes('perday') ||
    message.includes('per day') ||
    message.includes('free_tier') ||
    message.includes('free tier') ||
    message.includes('billing') ||
    message.includes('reported as leaked') ||
    message.includes('api key not valid') ||
    message.includes('permission_denied') ||
    message.includes('not found')
  );
}

/**
 * Check if an error is retryable (transient failure)
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  if (isPermanentFailure(message)) return false;

  const retryablePatterns = [
    'rate limit',
    'quota',
    'timeout',
    '503',
    '429',
    '500',
    '502',
    'network',
    'econnreset',
    'econnrefused',
    'etimedout',
  ];

  return retryablePatterns.some(pattern => message.includes(pattern));
}


