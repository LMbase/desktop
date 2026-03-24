import { PROVIDER_CONFIG } from '@shared/constants';
import type { FetchModelsResult, ValidateResult } from '@shared/contracts/providers';
import {
  buildAuthHeaders,
  filterUniqueStrings,
  type FetchLike,
  requestJson,
  type ProviderClient,
} from './providerClient';
import { fetchServerSupportedModels, filterProviderModelsByServerSupport } from './serverModelCatalog';

export class AnthropicClient implements ProviderClient {
  public readonly provider = 'anthropic' as const;
  public readonly config = PROVIDER_CONFIG.anthropic;

  public constructor(private readonly fetchImpl: FetchLike = globalThis.fetch as FetchLike) {}

  public async fetchPublicProviderModels(): Promise<FetchModelsResult> {
    return fetchServerSupportedModels(this.provider, this.fetchImpl);
  }

  public async validateKey(apiKey: string): Promise<ValidateResult> {
    const headers = {
      ...(await buildAuthHeaders(this.config, apiKey)),
      'Content-Type': 'application/json',
    };
    const body = JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1, messages: [] });
    const result = await requestJson(`${this.config.baseUrl}/v1/messages`, { method: 'POST', headers, body }, this.fetchImpl, 10_000);

    if (result.status === 0) {
      return { valid: false, message: `Network error: ${result.error ?? 'unknown error'}` };
    }
    if (result.status === 401) {
      return { valid: false, message: 'Invalid API key' };
    }
    return { valid: true, message: 'OK' };
  }

  public async fetchProviderModels(apiKey: string): Promise<FetchModelsResult> {
    const headers = await buildAuthHeaders(this.config, apiKey);
    const result = await requestJson(`${this.config.baseUrl}/v1/models`, { method: 'GET', headers }, this.fetchImpl, 15_000);

    if (result.status === 0) {
      return { models: [], message: `Network error: ${result.error ?? 'unknown error'}` };
    }
    if (result.status === 401 || result.status === 403) {
      return { models: [], message: 'API key rejected' };
    }
    if (result.status !== 200) {
      return { models: [], message: `Model fetch failed (HTTP ${result.status})` };
    }
    if (result.error === 'invalid_json' || !result.data || typeof result.data !== 'object') {
      return { models: [], message: 'Model fetch failed (invalid JSON response)' };
    }

    const data = (result.data as { data?: Array<{ id?: unknown }> }).data ?? [];
    const models = await filterUniqueStrings(data.map((item) => item?.id));
    if (models.length === 0) {
      return { models: [], message: 'No models returned by provider' };
    }

    return filterProviderModelsByServerSupport(this.provider, models, this.fetchImpl);
  }
}
