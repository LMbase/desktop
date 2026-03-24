import { describe, expect, it, vi } from 'vitest';
import { OpenAIClient } from './openaiClient';

describe('openaiClient', () => {
  it('validates api key using /v1/models bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ data: [] }),
    });

    const client = new OpenAIClient(fetchMock);
    await expect(client.validateKey('sk-test')).resolves.toEqual({ valid: true, message: 'OK' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }),
      }),
    );
  });

  it('fetches and filters provider models against server support', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        json: vi.fn().mockResolvedValue({ data: [{ id: 'gpt-4o' }, { id: 'gpt-4.1' }] }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: vi.fn().mockResolvedValue({ models: ['gpt-4.1'] }),
      });

    const client = new OpenAIClient(fetchMock);
    await expect(client.fetchProviderModels('sk-test')).resolves.toEqual({ models: ['gpt-4.1'], message: 'OK' });
  });

  it('preserves provider models when server support lookup is unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        json: vi.fn().mockResolvedValue({ data: [{ id: 'gpt-4o' }, { id: 'gpt-4.1' }] }),
      })
      .mockRejectedValueOnce(new Error('fetch failed'));

    const client = new OpenAIClient(fetchMock);
    await expect(client.fetchProviderModels('sk-test')).resolves.toEqual({
      models: ['gpt-4o', 'gpt-4.1'],
      message: 'Using provider models without server filtering: Network error: fetch failed',
    });
  });
});
