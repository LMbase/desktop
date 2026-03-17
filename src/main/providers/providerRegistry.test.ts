import { describe, expect, it, vi } from 'vitest';
import type { ProviderClient } from './providerClient';
import { createProviderRegistry } from './providerRegistry';

vi.mock('./serverModelCatalog', () => ({
  fetchServerExchangeEstimate: vi.fn(async () => ({ estimatedReceivedTokens: 8000, message: 'OK' })),
}));

describe('providerRegistry', () => {
  const fakeClient: ProviderClient = {
    provider: 'openai',
    config: {
      baseUrl: 'https://api.openai.com',
      authHeader: 'Authorization',
      authPrefix: 'Bearer ',
      extraHeaders: {},
    },
    validateKey: vi.fn(async () => ({ valid: true, message: 'OK' })),
    fetchProviderModels: vi.fn(async () => ({ models: ['gpt-4o'], message: 'OK' })),
    fetchPublicProviderModels: vi.fn(async () => ({ models: ['gpt-4o'], message: 'OK' })),
  };

  it('dispatches known provider calls', async () => {
    const registry = createProviderRegistry({ openai: fakeClient });
    await expect(registry.validateKey('openai', 'test')).resolves.toEqual({ valid: true, message: 'OK' });
    await expect(registry.fetchProviderModels('openai', 'test')).resolves.toEqual({ models: ['gpt-4o'], message: 'OK' });
    await expect(registry.fetchPublicProviderModels('openai')).resolves.toEqual({ models: ['gpt-4o'], message: 'OK' });
    await expect(
      registry.estimateExchange({
        offeredProvider: 'openai',
        offeredModel: 'gpt-4.1',
        wantedProvider: 'anthropic',
        wantedModel: 'claude-opus-4-6',
        offeredTokens: 10000,
      }),
    ).resolves.toEqual({ estimatedReceivedTokens: 8000, message: 'OK' });
  });

  it('returns exact unknown provider failures', async () => {
    const registry = createProviderRegistry({});
    await expect(registry.validateKey('unknown', 'test')).resolves.toEqual({
      valid: false,
      message: 'Validation failed (unknown provider: unknown)',
    });
    await expect(registry.fetchProviderModels('unknown', 'test')).resolves.toEqual({
      models: [],
      message: 'Live model fetch is only available for API key providers',
    });
    await expect(registry.fetchPublicProviderModels('unknown')).resolves.toEqual({
      models: [],
      message: 'Public model fetch is only available for known providers',
    });
  });
});
