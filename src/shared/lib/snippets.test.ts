import { describe, it, expect } from 'vitest';
import { generateCodeSnippet } from './snippets';
import type { PairingInfo } from '../contracts/session';

describe('snippets', () => {
  it('generates OpenAI snippet', () => {
    const pairing: PairingInfo = {
      offerId: 'test',
      tempKey: 'temp',
      proxyKey: 'key123',
      peerUrl: 'https://example.com',
      peerProvider: 'openai',
      peerModel: 'gpt-4',
      tokensGranted: 1000,
      tokensToServe: 1000,
    };

    const snippet = generateCodeSnippet(pairing);

    expect(snippet).toContain('requests.post');
    expect(snippet).toContain('Bearer key123');
    expect(snippet).toContain('gpt-4');
    expect(snippet).toContain('https://example.com/v1/chat/completions');
  });

  it('generates Anthropic snippet', () => {
    const pairing: PairingInfo = {
      offerId: 'test',
      tempKey: 'temp',
      proxyKey: 'key123',
      peerUrl: 'https://example.com',
      peerProvider: 'anthropic',
      peerModel: 'claude-3',
      tokensGranted: 1000,
      tokensToServe: 1000,
    };

    const snippet = generateCodeSnippet(pairing);

    expect(snippet).toContain('x-api-key');
    expect(snippet).toContain('/v1/messages');
    expect(snippet).toContain('claude-3');
  });

  it('generates Gemini snippet', () => {
    const pairing: PairingInfo = {
      offerId: 'test',
      tempKey: 'temp',
      proxyKey: 'key123',
      peerUrl: 'https://example.com',
      peerProvider: 'gemini',
      peerModel: 'gemini-pro',
      tokensGranted: 1000,
      tokensToServe: 1000,
    };

    const snippet = generateCodeSnippet(pairing);

    expect(snippet).toContain('x-goog-api-key');
    expect(snippet).toContain('gemini-pro:generateContent');
  });
});
