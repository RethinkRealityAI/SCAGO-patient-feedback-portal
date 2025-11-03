/**
 * Structured logging utilities for AI operations
 */

export interface AIOperationMetadata {
  flowName: string;
  inputSize?: number;
  outputSize?: number;
  duration?: number;
  success: boolean;
  error?: string;
  tokensUsed?: number;
  retryCount?: number;
}

/**
 * Log AI operation with structured metadata
 */
export function logAIOperation(
  operation: string,
  metadata: AIOperationMetadata
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'ai_operation',
    operation,
    ...metadata,
  };
  
  // Use structured logging format
  if (metadata.success) {
    console.log(JSON.stringify(logEntry));
  } else {
    console.error(JSON.stringify(logEntry));
  }
}

/**
 * Track AI performance metrics
 */
export async function trackAIPerformance<T>(
  flowName: string,
  fn: () => Promise<T>,
  metadata?: Partial<AIOperationMetadata>
): Promise<T> {
  const start = Date.now();
  let retryCount = 0;
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    // Estimate output size if result is serializable
    let outputSize: number | undefined;
    try {
      outputSize = JSON.stringify(result).length;
    } catch {
      // Result is not serializable, skip size calculation
    }
    
    logAIOperation('flow_execution', {
      flowName,
      duration,
      outputSize,
      success: true,
      ...metadata,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    logAIOperation('flow_execution', {
      flowName,
      duration,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      retryCount,
      ...metadata,
    });
    
    throw error;
  }
}

/**
 * Log input validation failure
 */
export function logValidationError(
  flowName: string,
  error: unknown,
  input?: unknown
): void {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    type: 'ai_validation_error',
    flowName,
    error: error instanceof Error ? error.message : String(error),
    input: input ? JSON.stringify(input).slice(0, 500) : undefined,
  }));
}

/**
 * Log token usage for cost tracking
 */
export function logTokenUsage(
  flowName: string,
  inputTokens: number,
  outputTokens: number,
  model: string = 'gemini-flash-latest'
): void {
  // Gemini Flash pricing: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
  const inputCost = (inputTokens / 1_000_000) * 0.075;
  const outputCost = (outputTokens / 1_000_000) * 0.30;
  const totalCost = inputCost + outputCost;
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    type: 'ai_token_usage',
    flowName,
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCostUSD: totalCost,
  }));
}


