import { describe, expect, it, vi } from 'vitest';
import type { ExchangeConfig } from '../../shared/contracts/session';
import { createSessionRuntime } from './createSessionRuntime';

const config: ExchangeConfig = {
  provider: 'openai',
  model: 'gpt-4o',
  tokensOffered: 1000,
  wantProvider: 'anthropic',
  wantModel: 'claude-3-5-sonnet-20241022',
  apiKey: 'sk-test',
  authMethod: 'api_key',
  githubToken: '',
  inputTokensOffered: 0,
  outputTokensOffered: 0,
  advanced: false,
  proxyPort: 9100,
  proxyUrl: '',
};

describe('createSessionRuntime', () => {
  it('starts proxy+tunnel and reconfigures pairing', async () => {
    const listen = vi.fn(async () => undefined);
    const close = vi.fn(async () => undefined);
    const configurePairing = vi.fn();
    const proxy = { listen, close, configurePairing } as unknown as ReturnType<typeof createSessionRuntime>;
    const tunnel = {
      start: vi.fn(async () => 'https://proxy.example'),
      stop: vi.fn(async () => undefined),
    };

    const runtime = createSessionRuntime({
      createProxy: vi.fn(() => proxy as never),
      createTunnelManager: () => tunnel as never,
    });

    const started = await runtime.start(config, async () => undefined);
    expect(started).toEqual({ proxyUrl: 'https://proxy.example' });
    expect(listen).toHaveBeenCalledWith({ host: '127.0.0.1', port: 9100 });
    expect(tunnel.start).toHaveBeenCalledWith(9100);

    await runtime.configurePairing({ tempKey: 'temp', tokenBudget: 20, inputBudget: 0, outputBudget: 0, advanced: false });
    expect(configurePairing).toHaveBeenCalledWith({ tempKey: 'temp', tokenBudget: 20, inputBudget: 0, outputBudget: 0 });

    await runtime.stop();
    expect(tunnel.stop).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});
