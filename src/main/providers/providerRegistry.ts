import type {
  ExchangeEstimateResult,
  FetchModelsResult,
  Provider,
  ProviderConfig,
  ValidateResult,
} from '@shared/contracts/providers';
import { AnthropicClient } from './anthropicClient';
import { CopilotClient } from './copilotClient';
import type { ProviderClient } from './providerClient';
import { GeminiClient } from './geminiClient';
import { OpenAIClient } from './openaiClient';
import { fetchServerExchangeEstimate } from './serverModelCatalog';

type ClientMap = Partial<Record<string, ProviderClient>>;

export interface ProviderRegistry {
  fetchPublicProviderModels: (provider: string) => Promise<FetchModelsResult>;
  validateKey: (provider: string, apiKey: string) => Promise<ValidateResult>;
  fetchProviderModels: (provider: string, apiKey: string) => Promise<FetchModelsResult>;
  estimateExchange: (request: {
    offeredProvider: string;
    offeredModel: string;
    wantedProvider: string;
    wantedModel: string;
    offeredTokens?: number;
    offeredInputTokens?: number;
    offeredOutputTokens?: number;
  }) => Promise<ExchangeEstimateResult>;
  providerConfig: Record<string, ProviderConfig>;
}

export function createProviderRegistry(clients: ClientMap): ProviderRegistry {
  const providerConfig = Object.fromEntries(
    Object.entries(clients)
      .filter((entry): entry is [string, ProviderClient] => entry[1] !== undefined)
      .map(([name, client]) => [name, client.config]),
  );

  return {
    providerConfig,

    fetchPublicProviderModels: async (provider: string) => {
      const client = clients[provider];
      if (!client) {
        return { models: [], message: 'Public model fetch is only available for known providers' };
      }
      return client.fetchPublicProviderModels();
    },

    validateKey: async (provider: string, apiKey: string) => {
      const client = clients[provider];
      if (!client) {
        return { valid: false, message: `Validation failed (unknown provider: ${provider})` };
      }
      return client.validateKey(apiKey);
    },

    fetchProviderModels: async (provider: string, apiKey: string) => {
      const client = clients[provider];
      if (!client) {
        return { models: [], message: 'Live model fetch is only available for API key providers' };
      }
      return client.fetchProviderModels(apiKey);
    },

    estimateExchange: async (request) => {
      return fetchServerExchangeEstimate(request);
    },
  };
}

export async function createDefaultProviderClients(): Promise<Record<Provider, ProviderClient>> {
  return {
    openai: new OpenAIClient(),
    anthropic: new AnthropicClient(),
    gemini: new GeminiClient(),
    'github-copilot': new CopilotClient(),
  };
}

let defaultRegistry: ProviderRegistry | null = null;

async function getRegistry(): Promise<ProviderRegistry> {
  if (!defaultRegistry) {
    const clients = await createDefaultProviderClients();
    defaultRegistry = createProviderRegistry(clients);
  }
  return defaultRegistry;
}

export async function fetchPublicProviderModels(provider: string): Promise<FetchModelsResult> {
  const registry = await getRegistry();
  return registry.fetchPublicProviderModels(provider);
}

export async function validateKey(provider: string, apiKey: string): Promise<ValidateResult> {
  const registry = await getRegistry();
  return registry.validateKey(provider, apiKey);
}

export async function fetchProviderModels(provider: string, apiKey: string): Promise<FetchModelsResult> {
  const registry = await getRegistry();
  return registry.fetchProviderModels(provider, apiKey);
}

export async function getProviderConfig(): Promise<Record<string, ProviderConfig>> {
  const registry = await getRegistry();
  return registry.providerConfig;
}

export async function estimateExchange(request: {
  offeredProvider: string;
  offeredModel: string;
  wantedProvider: string;
  wantedModel: string;
  offeredTokens?: number;
  offeredInputTokens?: number;
  offeredOutputTokens?: number;
}): Promise<ExchangeEstimateResult> {
  const registry = await getRegistry();
  return registry.estimateExchange(request);
}
