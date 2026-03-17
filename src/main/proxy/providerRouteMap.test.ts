import { describe, expect, it } from 'vitest';
import { providerRouteMap, resolveUpstreamUrl } from './providerRouteMap';

describe('providerRouteMap', () => {
  it('returns local route mappings for all providers', () => {
    expect(providerRouteMap('openai').localPaths).toEqual(['/v1/chat/completions', '/chat/completions']);
    expect(providerRouteMap('anthropic').localPaths).toEqual(['/v1/messages', '/messages']);
    expect(providerRouteMap('gemini').localPaths).toEqual(['/v1beta/models/:model\\:generateContent']);
    expect(providerRouteMap('github-copilot').localPaths).toEqual(['/chat/completions', '/v1/chat/completions']);
  });

  it('builds provider upstream URLs', () => {
    expect(resolveUpstreamUrl('openai', 'gpt-4o')).toBe('https://api.openai.com/v1/chat/completions');
    expect(resolveUpstreamUrl('anthropic', 'claude-3-7-sonnet')).toBe('https://api.anthropic.com/v1/messages');
    expect(resolveUpstreamUrl('gemini', 'gemini-2.5-pro')).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
    );
    expect(resolveUpstreamUrl('github-copilot', 'gpt-4.1')).toBe('https://api.githubcopilot.com/chat/completions');
  });
});
