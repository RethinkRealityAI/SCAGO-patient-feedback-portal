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
    if (this.originalError instanceof Error) {
      // Check for specific error types
      if (this.originalError.message.includes('rate limit') || 
          this.originalError.message.includes('quota')) {
        return 'AI service is temporarily unavailable due to rate limits. Please try again in a moment.';
      }
      if (this.originalError.message.includes('permission') || 
          this.originalError.message.includes('403')) {
        return 'Permission denied. Please check your API key configuration.';
      }
      if (this.originalError.message.includes('timeout') || 
          this.originalError.message.includes('503')) {
        return 'AI service request timed out. Please try again.';
      }
    }
    return `AI analysis failed: ${this.message}`;
  }
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
 * Check if an error is retryable (transient failure)
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
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


