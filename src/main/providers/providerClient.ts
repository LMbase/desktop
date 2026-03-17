import type {
  FetchModelsResult,
  Provider,
  ProviderConfig,
  ValidateResult,
} from '@shared/contracts/providers';

export type FetchLike = (input: string, init?: RequestInit) => Promise<ResponseLike>;

export interface ResponseLike {
  status: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
}

export interface ProviderClient {
  provider: Provider;
  config: ProviderConfig;
  validateKey: (apiKey: string) => Promise<ValidateResult>;
  fetchProviderModels: (apiKey: string) => Promise<FetchModelsResult>;
  fetchPublicProviderModels: () => Promise<FetchModelsResult>;
}

export async function buildAuthHeaders(config: ProviderConfig, apiKey: string): Promise<Record<string, string>> {
  return {
    [config.authHeader]: `${config.authPrefix}${apiKey}`,
    ...config.extraHeaders,
  };
}

export async function filterUniqueStrings(values: unknown[]): Promise<string[]> {
  const seen = new Set<string>();
  const filtered: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string' || value.length === 0 || seen.has(value)) {
      continue;
    }
    seen.add(value);
    filtered.push(value);
  }
  return filtered;
}

export async function intersectPreservingOrder(values: string[], allowed: string[]): Promise<string[]> {
  const allowedSet = new Set(allowed);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!allowedSet.has(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

export async function requestJson(
  url: string,
  init: RequestInit,
  fetchImpl: FetchLike = globalThis.fetch as FetchLike,
  timeoutMs = 10_000,
): Promise<{ status: number; data?: unknown; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    try {
      const data = await response.json();
      return { status: response.status, data };
    } catch {
      return { status: response.status, error: 'invalid_json' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 0, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
