import { describe, expect, it } from 'vitest';
import { extractUsage } from './usageExtractor';

describe('usageExtractor', () => {
  it('extracts OpenAI and Copilot usage', () => {
    const payload = { usage: { prompt_tokens: 10, completion_tokens: 5 } };
    expect(extractUsage(payload, 'openai')).toEqual({ inputTokens: 10, outputTokens: 5 });
    expect(extractUsage(payload, 'github-copilot')).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it('extracts Anthropic usage', () => {
    expect(extractUsage({ usage: { input_tokens: '12', output_tokens: 7 } }, 'anthropic')).toEqual({
      inputTokens: 12,
      outputTokens: 7,
    });
  });

  it('extracts Gemini usage', () => {
    expect(extractUsage({ usageMetadata: { promptTokenCount: 4, candidatesTokenCount: '9' } }, 'gemini')).toEqual({
      inputTokens: 4,
      outputTokens: 9,
    });
  });

  it('returns zeroes for malformed payloads', () => {
    expect(extractUsage({}, 'openai')).toEqual({ inputTokens: 0, outputTokens: 0 });
    expect(extractUsage({ usage: null }, 'anthropic')).toEqual({ inputTokens: 0, outputTokens: 0 });
  });
});
