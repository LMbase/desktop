import { describe, expect, it, vi } from 'vitest';
import { GeminiClient } from './geminiClient';

describe('geminiClient', () => {
  it('validates key with x-goog-api-key header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ models: [] }),
    });
    const client = new GeminiClient(fetchMock);

    await expect(client.validateKey('gm-test')).resolves.toEqual({ valid: true, message: 'OK' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models',
      expect.objectContaining({ headers: expect.objectContaining({ 'x-goog-api-key': 'gm-test' }) }),
    );
  });

  it('extracts models with generateContent support only', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        json: vi.fn().mockResolvedValue({
          models: [
            { name: 'models/gemini-1.5-pro', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/embed', supportedGenerationMethods: ['embedContent'] },
          ],
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: vi.fn().mockResolvedValue({ models: ['gemini-1.5-pro'] }),
      });

    const client = new GeminiClient(fetchMock);
    await expect(client.fetchProviderModels('gm-test')).resolves.toEqual({ models: ['gemini-1.5-pro'], message: 'OK' });
  });
});
