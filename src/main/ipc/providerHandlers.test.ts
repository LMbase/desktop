import { describe, expect, it, vi } from 'vitest';
import { IpcChannels } from '../../shared/contracts/ipc';
import { registerProviderHandlers } from './providerHandlers';

function createIpcHarness() {
  const handlers = new Map<string, (event: unknown, request: unknown) => Promise<unknown> | unknown>();
  return {
    handlers,
    ipcMainLike: {
      handle: vi.fn((channel: string, listener: (event: unknown, request: unknown) => Promise<unknown> | unknown) => {
        handlers.set(channel, listener);
      }),
      removeHandler: vi.fn((channel: string) => {
        handlers.delete(channel);
      }),
    },
  };
}

describe('providerHandlers', () => {
  it('registers expected channels and validates bad payloads', async () => {
    const harness = createIpcHarness();
    registerProviderHandlers({
      ipcMainLike: harness.ipcMainLike as never,
      providerRegistry: {
        fetchProviderModels: vi.fn(),
        fetchPublicProviderModels: vi.fn(),
        validateKey: vi.fn(),
        estimateExchange: vi.fn(),
      },
    });

    expect(harness.handlers.has(IpcChannels.providers.fetchModels)).toBe(true);
    expect(harness.handlers.has(IpcChannels.providers.validateKey)).toBe(true);
    expect(harness.handlers.has(IpcChannels.providers.estimateExchange)).toBe(true);

    await expect(harness.handlers.get(IpcChannels.providers.fetchModels)?.({}, null)).resolves.toEqual({
      models: [],
      message: 'Invalid request payload',
    });

    await expect(harness.handlers.get(IpcChannels.providers.validateKey)?.({}, { provider: 'openai' })).resolves.toEqual({
      valid: false,
      message: 'Invalid request payload',
    });

    await expect(
      harness.handlers.get(IpcChannels.providers.estimateExchange)?.({}, { offeredProvider: 'openai' }),
    ).resolves.toEqual({
      estimatedReceivedTokens: 0,
      message: 'Invalid request payload',
    });
  });

  it('delegates to provider registry and returns structured responses', async () => {
    const harness = createIpcHarness();
    const providerRegistry = {
      fetchPublicProviderModels: vi.fn(async () => ({ models: ['gpt-4o'], message: 'OK' })),
      fetchProviderModels: vi.fn(async () => ({ models: ['gpt-4.1'], message: 'OK' })),
      validateKey: vi.fn(async () => ({ valid: true, message: 'OK' })),
      estimateExchange: vi.fn(async () => ({ estimatedReceivedTokens: 7500, message: 'OK' })),
    };

    registerProviderHandlers({ ipcMainLike: harness.ipcMainLike as never, providerRegistry });

    await expect(harness.handlers.get(IpcChannels.providers.fetchModels)?.({}, { provider: 'openai' })).resolves.toEqual({
      models: ['gpt-4o'],
      message: 'OK',
    });
    await expect(
      harness.handlers.get(IpcChannels.providers.fetchModels)?.({}, { provider: 'openai', apiKey: 'k' }),
    ).resolves.toEqual({ models: ['gpt-4.1'], message: 'OK' });
    await expect(
      harness.handlers.get(IpcChannels.providers.validateKey)?.({}, { provider: 'openai', apiKey: 'k' }),
    ).resolves.toEqual({ valid: true, message: 'OK' });
    await expect(
      harness.handlers.get(IpcChannels.providers.estimateExchange)?.({}, {
        offeredProvider: 'openai',
        offeredModel: 'gpt-4.1',
        wantedProvider: 'anthropic',
        wantedModel: 'claude-opus-4-6',
        offeredTokens: 10000,
      }),
    ).resolves.toEqual({ estimatedReceivedTokens: 7500, message: 'OK' });

    expect(providerRegistry.fetchPublicProviderModels).toHaveBeenCalledWith('openai');
    expect(providerRegistry.fetchProviderModels).toHaveBeenCalledWith('openai', 'k');
    expect(providerRegistry.validateKey).toHaveBeenCalledWith('openai', 'k');
    expect(providerRegistry.estimateExchange).toHaveBeenCalledWith({
      offeredProvider: 'openai',
      offeredModel: 'gpt-4.1',
      wantedProvider: 'anthropic',
      wantedModel: 'claude-opus-4-6',
      offeredTokens: 10000,
    });
  });
});
