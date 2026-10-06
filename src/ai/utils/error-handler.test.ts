import { describe, it, expect } from 'vitest';
import { AIFlowError, describeAIError, isRetryableError } from './error-handler';

describe('describeAIError', () => {
  it('names key rotation as the fix when Google has disabled a leaked key', () => {
    const message = describeAIError(
      new Error('[GoogleGenerativeAI Error]: Your API key was reported as leaked. Please use another API key.')
    );
    expect(message).toContain('published somewhere public');
    expect(message).toContain('aistudio.google.com/apikey');
  });

  it('points at the model id when the configured model has been retired', () => {
    const message = describeAIError(
      new Error('[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta')
    );
    expect(message).toContain('model is unavailable');
    expect(message).toContain('src/ai/genkit.ts');
  });

  it('explains an invalid key without leaking the raw SDK text', () => {
    const message = describeAIError(new Error('API key not valid. Please pass a valid API key.'));
    expect(message).toContain('GOOGLE_API_KEY');
    expect(message).not.toContain('Please pass a valid API key');
  });

  it('tells the user to retry on a transient rate limit', () => {
    expect(describeAIError(new Error('429 RESOURCE_EXHAUSTED: quota exceeded')))
      .toContain('rate limited');
  });

  it('says the daily free-tier allowance is gone rather than "try again"', () => {
    const message = describeAIError(
      new Error(
        '[429 Too Many Requests] Quota exceeded for metric: generate_content_free_tier_requests, ' +
        'quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier, limit: 20'
      )
    );
    expect(message).toContain('daily');
    expect(message).not.toContain('Please wait a moment');
  });

  it('tells the user to retry on timeouts', () => {
    expect(describeAIError(new Error('503 Service Unavailable'))).toContain('did not respond in time');
  });

  it('explains an empty model response as retryable', () => {
    expect(describeAIError(new Error('Model returned empty output'))).toContain('empty response');
  });

  it('surfaces connectivity failures as a network problem', () => {
    expect(describeAIError(new TypeError('fetch failed'))).toContain('Could not reach the AI service');
  });

  it('passes an AIConfigurationError through verbatim so its instructions survive', () => {
    const configError = new Error(
      'AI features are not configured: GOOGLE_API_KEY is missing. Add a Gemini API key.'
    );
    configError.name = 'AIConfigurationError';
    expect(describeAIError(configError)).toBe(configError.message);
  });

  it('falls back to a readable message for an unrecognised failure', () => {
    expect(describeAIError(new Error('something odd happened'))).toBe('AI analysis failed: something odd happened');
  });

  it('handles a non-Error value without throwing', () => {
    expect(describeAIError('kaboom')).toBe('AI analysis failed: kaboom');
    expect(describeAIError(undefined)).toBe('AI analysis failed: unknown error');
  });
});

describe('AIFlowError.getUserMessage', () => {
  it('describes the underlying provider error rather than the wrapper text', () => {
    const error = new AIFlowError(
      'AI flow analyzeFeedbackFlow failed: 429 quota exceeded',
      'analyzeFeedbackFlow',
      new Error('429 RESOURCE_EXHAUSTED: quota exceeded')
    );
    expect(error.getUserMessage()).toContain('rate limited');
  });
});

describe('isRetryableError', () => {
  it('retries transient failures', () => {
    expect(isRetryableError(new Error('429 rate limit'))).toBe(true);
    expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
    expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true);
  });

  it('does not retry a rejected API key', () => {
    expect(isRetryableError(new Error('Your API key was reported as leaked.'))).toBe(false);
    expect(isRetryableError(new Error('API key not valid'))).toBe(false);
  });

  it('does not retry a daily quota exhaustion — retrying only burns it faster', () => {
    expect(
      isRetryableError(
        new Error('[429] Quota exceeded: GenerateRequestsPerDayPerProjectPerModel-FreeTier, limit: 20')
      )
    ).toBe(false);
  });

  it('does not retry a retired model', () => {
    expect(isRetryableError(new Error('404 models/gemini-1.5-flash is not found'))).toBe(false);
  });
});
