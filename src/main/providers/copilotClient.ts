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

export interface CopilotToken {
  githubToken: string;
  copilotToken: string;
  expiresAt: number;
}

const GITHUB_COPILOT_TOKEN_URL = 'https://api.github.com/copilot_internal/v2/token';
const USER_AGENT = 'GithubCopilot/1.250.0';
const EDITOR_VERSION = 'vscode/1.95.0';
const EDITOR_PLUGIN_VERSION = 'copilot/1.250.0';

export async function parseTokenExpiry(token: string): Promise<number> {
  const match = token.match(/exp=(\d+)/);
  if (match?.[1]) {
    return Number(match[1]);
  }
  return Math.floor(Date.now() / 1000) + 1800;
}

export class CopilotClient implements ProviderClient {
  public readonly provider = 'github-copilot' as const;
  public readonly config = PROVIDER_CONFIG['github-copilot'];

  public constructor(private readonly fetchImpl: FetchLike = globalThis.fetch as FetchLike) {}

  public async fetchPublicProviderModels(): Promise<FetchModelsResult> {
    return fetchServerSupportedModels(this.provider, this.fetchImpl);
  }

  public async validateKey(apiKey: string): Promise<ValidateResult> {
    const headers = await buildAuthHeaders(this.config, apiKey);
    const result = await requestJson(`${this.config.baseUrl}/models`, { method: 'GET', headers }, this.fetchImpl, 10_000);
    if (result.status === 0) {
      return { valid: false, message: `Network error: ${result.error ?? 'unknown error'}` };
    }
    if (result.status === 200) {
      return { valid: true, message: 'OK' };
    }
    return { valid: false, message: `Validation failed (HTTP ${result.status})` };
  }

  public async exchangeForCopilotToken(githubToken: string): Promise<CopilotToken> {
    const response = await this.fetchImpl(GITHUB_COPILOT_TOKEN_URL, {
      method: 'GET',
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        'Editor-Version': EDITOR_VERSION,
        'Editor-Plugin-Version': EDITOR_PLUGIN_VERSION,
      },
    });

    if (response.status === 401) {
      throw new Error('GitHub token invalid or expired. Please re-authenticate.');
    }
    if (response.status !== 200) {
      const body = response.text ? await response.text() : '';
      throw new Error(`Copilot token exchange failed (HTTP ${response.status}): ${body}`);
    }

    const payload = await response.json();
    const token = (payload as { token?: unknown }).token;
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error("Copilot token response missing 'token' field");
    }

    return {
      githubToken,
      copilotToken: token,
      expiresAt: await parseTokenExpiry(token),
    };
  }

  public async refreshCopilotToken(githubToken: string): Promise<CopilotToken> {
    return this.exchangeForCopilotToken(githubToken);
  }

  public async fetchCopilotModels(copilotToken: string): Promise<string[]> {
    const result = await requestJson(
      `${this.config.baseUrl}/models`,
      {
        method: 'GET',
        headers: {
          ...this.config.extraHeaders,
          Authorization: `Bearer ${copilotToken}`,
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
          'Editor-Version': EDITOR_VERSION,
          'Editor-Plugin-Version': EDITOR_PLUGIN_VERSION,
        },
      },
      this.fetchImpl,
      15_000,
    );

    if (result.status === 0) {
      throw new Error(`Network error: ${result.error ?? 'unknown error'}`);
    }
    if (result.status !== 200) {
      throw new Error(`Model fetch failed (HTTP ${result.status})`);
    }
    if (result.error === 'invalid_json' || !result.data || typeof result.data !== 'object') {
      throw new Error('Model fetch failed (invalid JSON response)');
    }

    const models: string[] = [];
    const seen = new Set<string>();
    for (const model of ((result.data as { data?: unknown[] }).data ?? [])) {
      if (!model || typeof model !== 'object') {
        continue;
      }
      const capabilities = (model as { capabilities?: unknown }).capabilities;
      const modelId = (model as { id?: unknown }).id;
      const type = capabilities && typeof capabilities === 'object' ? (capabilities as { type?: unknown }).type : undefined;
      if (type === 'chat' && typeof modelId === 'string' && !seen.has(modelId)) {
        seen.add(modelId);
        models.push(modelId);
      }
    }
    return models;
  }

  public async fetchProviderModels(apiKey: string): Promise<FetchModelsResult> {
    try {
      const models = await this.fetchCopilotModels(apiKey);
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('HTTP 401') || message.includes('HTTP 403')) {
        return { models: [], message: 'API key rejected' };
      }
      if (message.startsWith('Network error:')) {
        return { models: [], message };
      }
      return { models: [], message };
    }
  }
}
