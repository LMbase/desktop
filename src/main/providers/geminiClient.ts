import { PROVIDER_CONFIG } from '@shared/constants';
import type { FetchModelsResult, ValidateResult } from '@shared/contracts/providers';
import {
  buildAuthHeaders,
  intersectPreservingOrder,
  type FetchLike,
  requestJson,
  type ProviderClient,
} from './providerClient';
import { fetchServerSupportedModels } from './serverModelCatalog';

async function extractGeminiModels(payload: unknown): Promise<string[]> {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { models?: unknown }).models)) {
    return [];
  }

  const seen = new Set<string>();
  const models: string[] = [];
  for (const item of (payload as { models: unknown[] }).models) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const name = (item as { name?: unknown }).name;
    const methods = (item as { supportedGenerationMethods?: unknown }).supportedGenerationMethods;
    if (typeof name !== 'string' || !Array.isArray(methods) || !methods.includes('generateContent')) {
      continue;
    }
    const normalized = name.startsWith('models/') ? name.slice('models/'.length) : name;
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      models.push(normalized);
    }
  }
  return models;
}

export class GeminiClient implements ProviderClient {
  public readonly provider = 'gemini' as const;
  public readonly config = PROVIDER_CONFIG.gemini;

  public constructor(private readonly fetchImpl: FetchLike = globalThis.fetch as FetchLike) {}

  public async fetchPublicProviderModels(): Promise<FetchModelsResult> {
    return fetchServerSupportedModels(this.provider, this.fetchImpl);
  }

  public async validateKey(apiKey: string): Promise<ValidateResult> {
    const headers = await buildAuthHeaders(this.config, apiKey);
    const result = await requestJson(`${this.config.baseUrl}/v1beta/models`, { method: 'GET', headers }, this.fetchImpl, 10_000);
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
    const result = await requestJson(`${this.config.baseUrl}/v1beta/models`, { method: 'GET', headers }, this.fetchImpl, 15_000);

    if (result.status === 0) {
      return { models: [], message: `Network error: ${result.error ?? 'unknown error'}` };
    }
    if (result.status === 401 || result.status === 403) {
      return { models: [], message: 'API key rejected' };
    }
    if (result.status !== 200) {
      return { models: [], message: `Model fetch failed (HTTP ${result.status})` };
    }
    if (result.error === 'invalid_json') {
      return { models: [], message: 'Model fetch failed (invalid JSON response)' };
    }

    const models = await extractGeminiModels(result.data);
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
