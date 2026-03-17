import { describe, expect, it } from 'vitest';
import { capOutputTokens, enforceModel, verifyTempKey, wantsStreaming } from './requestGuard';

describe('requestGuard', () => {
  it('verifies temp-key auth by provider', () => {
    expect(verifyTempKey('openai', 'tmp', { authorization: 'Bearer tmp' })).toBe(true);
    expect(verifyTempKey('anthropic', 'tmp', { 'x-api-key': 'tmp' })).toBe(true);
    expect(verifyTempKey('gemini', 'tmp', { 'x-goog-api-key': 'tmp' })).toBe(true);
    expect(verifyTempKey('github-copilot', 'tmp', { Authorization: 'Bearer tmp' })).toBe(true);
    expect(verifyTempKey('openai', 'tmp', { authorization: 'Bearer nope' })).toBe(false);
  });

  it('enforces single model access', () => {
    expect(enforceModel(JSON.stringify({ model: 'gpt-4o' }), 'gpt-4o')).toBe(true);
    expect(enforceModel(JSON.stringify({ model: 'gpt-4.1' }), 'gpt-4o')).toBe(false);
    expect(enforceModel('not-json', 'gpt-4o')).toBe(true);
  });

  it('caps output tokens per provider format', () => {
    expect(JSON.parse(capOutputTokens(JSON.stringify({ max_tokens: 500 }), 'openai', 200))).toEqual({
      max_completion_tokens: 200,
    });

    expect(JSON.parse(capOutputTokens(JSON.stringify({ max_tokens: 120 }), 'anthropic', 80))).toEqual({
      max_tokens: 80,
    });

    expect(
      JSON.parse(capOutputTokens(JSON.stringify({ generationConfig: { maxOutputTokens: 60 } }), 'gemini', 40)),
    ).toEqual({
      generationConfig: { maxOutputTokens: 40 },
    });
  });

  it('detects stream=true flag from body', () => {
    expect(wantsStreaming(JSON.stringify({ stream: true }))).toBe(true);
    expect(wantsStreaming(JSON.stringify({ stream: false }))).toBe(false);
    expect(wantsStreaming('not-json')).toBe(false);
  });
});
