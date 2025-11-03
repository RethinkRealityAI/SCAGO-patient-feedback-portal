/**
 * Retry logic utilities for AI operations
 * Handles transient failures with exponential backoff
 */

import { isRetryableError } from './error-handler';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  onRetry: () => {},
};

/**
 * Execute a function with retry logic for transient failures
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  
  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === opts.maxRetries - 1) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelayMs
      );
      
      // Call retry callback
      if (error instanceof Error) {
        opts.onRetry(attempt + 1, error);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries exhausted
  throw lastError;
}

/**
 * Create a retry wrapper function with predefined options
 */
export function createRetryWrapper(options: RetryOptions) {
  return <T>(fn: () => Promise<T>) => withRetry(fn, options);
}


