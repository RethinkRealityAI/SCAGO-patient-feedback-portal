/**
 * Input sanitization utilities for prompt injection protection
 */

/**
 * Sanitize prompt input to prevent injection attacks
 */
export function sanitizePromptInput(input: string, maxLength = 10000): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input
    // Remove potential code injection attempts
    .replace(/```[\s\S]*?```/g, '[code block removed]')
    // Remove script tags
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Remove template syntax that could be used for injection
    .replace(/\{\{[\s\S]*?\}\}/g, '[template syntax removed]')
    // Remove potential command execution patterns
    .replace(/`[\s\S]*?`/g, '[backtick code removed]')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Limit length
    .slice(0, maxLength)
    .trim();
  
  return sanitized;
}

/**
 * Sanitize JSON input before parsing
 */
export function sanitizeJsonInput(input: string): string {
  // Remove potentially dangerous characters while preserving JSON structure
  return input
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/\\u0000/g, '') // Remove null unicode escapes
    .trim();
}

/**
 * Validate and sanitize feedback text input
 */
export function sanitizeFeedbackText(text: string): string {
  return sanitizePromptInput(text, 50000);
}

/**
 * Validate and sanitize query input for chat flows
 */
export function sanitizeQueryInput(query: string): string {
  return sanitizePromptInput(query, 5000);
}

/**
 * Estimate token count (rough approximation)
 * Note: This is an approximation. For accurate counts, use a tokenizer library.
 */
export function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  // This is a conservative estimate
  return Math.ceil(text.length / 4);
}

/**
 * Chunk large text input into smaller pieces
 */
export function chunkLargeInput(
  input: string,
  maxTokens = 8000
): string[] {
  const tokens = estimateTokens(input);
  
  if (tokens <= maxTokens) {
    return [input];
  }
  
  // Calculate chunk size in characters
  const chunkSize = Math.floor(input.length * (maxTokens / tokens));
  const chunks: string[] = [];
  
  // Try to split on sentence boundaries first
  const sentences = input.match(/[^.!?]+[.!?]+/g) || [input];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const testChunk = currentChunk + sentence;
    
    if (estimateTokens(testChunk) <= maxTokens) {
      currentChunk = testChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      // If single sentence is too large, split it
      if (estimateTokens(sentence) > maxTokens) {
        // Split by character limit
        for (let i = 0; i < sentence.length; i += chunkSize) {
          chunks.push(sentence.slice(i, i + chunkSize));
        }
        currentChunk = '';
      } else {
        currentChunk = sentence;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}


