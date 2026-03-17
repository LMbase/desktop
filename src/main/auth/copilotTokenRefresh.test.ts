import { describe, expect, it, vi } from 'vitest';
import { createCopilotTokenRefresh } from './copilotTokenRefresh';

describe('copilotTokenRefresh', () => {
  it('refreshes immediately when token is near expiry', async () => {
    const exchange = vi.fn(async () => ({
      githubToken: 'ghu_1',
      copilotToken: 'cp_2',
      expiresAt: 1000,
    }));

    const loop = createCopilotTokenRefresh({
      exchangeForCopilotToken: exchange,
      now: async () => 980,
      sleep: vi.fn(async () => undefined),
      refreshBufferSeconds: 60,
    });

    const updates: string[] = [];
    await loop.start(
      { githubToken: 'ghu_1', copilotToken: 'cp_1', expiresAt: 1000 },
      async (token) => {
        updates.push(token.copilotToken);
        await loop.stop();
      },
      async () => undefined,
    );

    expect(updates).toEqual(['cp_2']);
    expect(exchange).toHaveBeenCalledWith('ghu_1');
  });
});
