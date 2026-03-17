import { describe, expect, it, vi } from 'vitest';
import {
  fetchServerExchangeEstimate,
  fetchServerSupportedModels,
  resolveServerHttpBaseUrl,
} from './serverModelCatalog';

describe('serverModelCatalog', () => {
  it('converts ws server URL to http', async () => {
    process.env.TOKENHUB_SERVER = 'ws://localhost:8080';
    await expect(resolveServerHttpBaseUrl()).resolves.toBe('http://localhost:8080');
  });

  it('returns filtered models for valid payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ models: ['gpt-4o', 'gpt-4o', '', 'gpt-4.1'] }),
    });

    const result = await fetchServerSupportedModels('openai', fetchMock);
    expect(result).toEqual({ models: ['gpt-4o', 'gpt-4.1'], message: 'OK' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/providers/models?provider=openai',
      expect.any(Object),
    );
  });

  it('returns error message for invalid payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ models: 'not-a-list' }),
    });

    const result = await fetchServerSupportedModels('openai', fetchMock);
    expect(result).toEqual({ models: [], message: 'Server model list fetch failed (invalid payload)' });
  });

  it('returns exchange estimate for valid payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ estimated_received_tokens: 8100 }),
    });

    const result = await fetchServerExchangeEstimate(
      {
        offeredProvider: 'openai',
        offeredModel: 'gpt-4.1',
        wantedProvider: 'anthropic',
        wantedModel: 'claude-opus-4-6',
        offeredTokens: 10000,
      },
      fetchMock,
    );

    expect(result).toEqual({ estimatedReceivedTokens: 8100, message: 'OK' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/exchange/estimate?'),
      expect.any(Object),
    );
  });
});
