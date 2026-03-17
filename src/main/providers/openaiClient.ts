import { PROVIDER_CONFIG } from '@shared/constants';
import type { FetchModelsResult, ValidateResult } from '@shared/contracts/providers';
import {
  buildAuthHeaders,
  filterUniqueStrings,
  intersectPreservingOrder,
  type FetchLike,
  requestJson,
  type ProviderClient,
} from './providerClient';
import { fetchServerSupportedModels } from './serverModelCatalog';

export class OpenAIClient implements ProviderClient {
  public readonly provider = 'openai' as const;
  public readonly config = PROVIDER_CONFIG.openai;

  public constructor(private readonly fetchImpl: FetchLike = globalThis.fetch as FetchLike) {}

  public async fetchPublicProviderModels(): Promise<FetchModelsResult> {
    return fetchServerSupportedModels(this.provider, this.fetchImpl);
  }

  public async validateKey(apiKey: string): Promise<ValidateResult> {
    const headers = await buildAuthHeaders(this.config, apiKey);
    const result = await requestJson(`${this.config.baseUrl}/v1/models`, { method: 'GET', headers }, this.fetchImpl, 10_000);
    if (result.status === 0) {
      return { valid: false, message: `Network error: ${result.error ?? 'unknown error'}` };
    }
    if (result.status === 200) {
      return { valid: true, message: 'OK' };
    }
    return { valid: false, message: `Validation failed (HTTP ${result.status})` };
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

    const supported = await fetchServerSupportedModels(this.provider, this.fetchImpl);
    if (supported.models.length === 0) {
      return supported;
    }

    const filtered = await intersectPreservingOrder(models, supported.models);
    if (filtered.length === 0) {
      return { models: [], message: 'No provider models supported by server' };
    }
    return { models: filtered, message: 'OK' };
  }
}
