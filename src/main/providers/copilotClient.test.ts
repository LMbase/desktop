import { describe, expect, it, vi } from 'vitest';
import { CopilotClient } from './copilotClient';

describe('copilotClient', () => {
  it('exchanges github token for copilot token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: vi.fn().mockResolvedValue(''),
      json: vi.fn().mockResolvedValue({ token: 'copilot-exp=2000000000' }),
    });
    const client = new CopilotClient(fetchMock);

    const token = await client.exchangeForCopilotToken('ghu_test');
    expect(token.githubToken).toBe('ghu_test');
    expect(token.copilotToken).toBe('copilot-exp=2000000000');
    expect(token.expiresAt).toBe(2000000000);
  });

  it('fetches chat models and filters by server support', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        json: vi.fn().mockResolvedValue({
          data: [
            { id: 'gpt-4o', capabilities: { type: 'chat' } },
            { id: 'text-embedding', capabilities: { type: 'embeddings' } },
          ],
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: vi.fn().mockResolvedValue({ models: ['gpt-4o'] }),
      });
    const client = new CopilotClient(fetchMock);

    await expect(client.fetchProviderModels('cp-token')).resolves.toEqual({ models: ['gpt-4o'], message: 'OK' });
  });
});
