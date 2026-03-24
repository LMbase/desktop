import { describe, expect, it, vi } from 'vitest';
import { AnthropicClient } from './anthropicClient';

describe('anthropicClient', () => {
  it('validates key with minimal /v1/messages payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({}),
    });
    const client = new AnthropicClient(fetchMock);

    await expect(client.validateKey('ak-test')).resolves.toEqual({ valid: true, message: 'OK' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-api-key': 'ak-test' }),
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1,
          messages: [],
        }),
      }),
    );
  });

  it('returns invalid key for HTTP 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 401,
      json: vi.fn().mockResolvedValue({}),
    });
    const client = new AnthropicClient(fetchMock);
    await expect(client.validateKey('bad')).resolves.toEqual({ valid: false, message: 'Invalid API key' });
  });

  it('preserves provider models when server support lookup is unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        json: vi.fn().mockResolvedValue({ data: [{ id: 'claude-sonnet-4-6' }] }),
      })
      .mockRejectedValueOnce(new Error('fetch failed'));

    const client = new AnthropicClient(fetchMock);
    await expect(client.fetchProviderModels('ak-test')).resolves.toEqual({
      models: ['claude-sonnet-4-6'],
      message: 'Using provider models without server filtering: Network error: fetch failed',
    });
  });
});
