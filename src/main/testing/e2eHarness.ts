import electron from 'electron';
const { app } = electron;

import type { ExchangeEstimateResult } from '@shared/contracts/providers';
import type { ActivityEvent, ExchangeConfig, SessionSnapshot } from '@shared/contracts/session';
import type { Provider } from '@shared/constants';
import type { ProviderRegistry } from '../providers/providerRegistry';
import type { SessionController } from '../ipc/sessionHandlers';

const VALID_E2E_API_KEYS = new Set(['sk-test-valid-key', 'sk-live-e2e-valid-key']);

const E2E_PROVIDER_MODELS: Record<Provider, string[]> = {
  openai: ['gpt-4o', 'gpt-4.1-mini'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  'github-copilot': ['copilot-chat', 'copilot-suggestions'],
};

export function isE2EModeEnabled(): boolean {
  return process.env.LMBASE_E2E === '1' && !app.isPackaged;
}

export function createE2EProviderRegistry(): Pick<
  ProviderRegistry,
  'fetchProviderModels' | 'fetchPublicProviderModels' | 'validateKey' | 'estimateExchange'
> {
  return {
    fetchPublicProviderModels: async (provider) => {
      if (!(provider in E2E_PROVIDER_MODELS)) {
        return { models: [], message: `Unknown provider: ${provider}` };
      }
      return {
        models: E2E_PROVIDER_MODELS[provider as Provider],
        message: 'OK',
      };
    },
    fetchProviderModels: async (provider, apiKey) => {
      if (!VALID_E2E_API_KEYS.has(apiKey)) {
        return { models: [], message: 'Invalid API key for E2E stub' };
      }
      if (!(provider in E2E_PROVIDER_MODELS)) {
        return { models: [], message: `Unknown provider: ${provider}` };
      }

      return {
        models: E2E_PROVIDER_MODELS[provider as Provider],
        message: 'OK',
      };
    },
    validateKey: async (_provider, apiKey) => ({
      valid: VALID_E2E_API_KEYS.has(apiKey),
      message: VALID_E2E_API_KEYS.has(apiKey) ? 'OK' : 'Invalid API key for E2E stub',
    }),
    estimateExchange: async (request) => createExchangeEstimate(request),
  };
}

export function createE2ESessionController(): SessionController {
  const sessionListeners = new Set<(snapshot: SessionSnapshot | null) => void>();
  const activityListeners = new Set<(event: ActivityEvent) => void>();
  let snapshot: SessionSnapshot | null = null;

  const emitSessionUpdate = (nextSnapshot: SessionSnapshot | null) => {
    snapshot = nextSnapshot;
    for (const listener of sessionListeners) {
      listener(nextSnapshot);
    }
  };

  const emitActivity = (event: ActivityEvent) => {
    for (const listener of activityListeners) {
      listener(event);
    }
  };

  return {
    start: async (config: ExchangeConfig) => {
      const connectedAt = Date.now();
      emitSessionUpdate({
        status: 'paired',
        config: {
          ...config,
          proxyPort: config.proxyPort || 9100,
          proxyUrl: config.proxyUrl || 'https://e2e-proxy.lmbase.local',
        },
        pairing: {
          offerId: 'e2e-offer-id',
          tempKey: 'e2e-temp-key',
          proxyKey: 'e2e-proxy-key',
          peerUrl: 'https://peer.e2e.lmbase.local',
          peerProvider: config.wantProvider,
          peerModel: config.wantModel,
          tokensGranted: config.tokensOffered,
          tokensToServe: config.tokensOffered,
          inputTokensGranted: config.inputTokensOffered,
          outputTokensGranted: config.outputTokensOffered,
          inputTokensToServe: config.inputTokensOffered,
          outputTokensToServe: config.outputTokensOffered,
          advanced: config.advanced,
        },
        tokensGrantedDone: 0,
        tokensToServeDone: 0,
        inputTokensGrantedDone: 0,
        outputTokensGrantedDone: 0,
        inputTokensToServeDone: 0,
        outputTokensToServeDone: 0,
        connectedAt,
      });

      emitActivity({
        timestamp: connectedAt,
        type: 'success',
        message: `E2E matched ${config.provider}:${config.model} with ${config.wantProvider}:${config.wantModel}`,
      });
    },
    stop: async () => {
      emitSessionUpdate(null);
    },
    getSnapshot: async () => snapshot,
    onSessionUpdate: (listener) => {
      sessionListeners.add(listener);
      return () => {
        sessionListeners.delete(listener);
      };
    },
    onActivity: (listener) => {
      activityListeners.add(listener);
      return () => {
        activityListeners.delete(listener);
      };
    },
  };
}

function createExchangeEstimate(request: {
  offeredProvider: string;
  offeredModel: string;
  wantedProvider: string;
  wantedModel: string;
  offeredTokens?: number;
  offeredInputTokens?: number;
  offeredOutputTokens?: number;
}): ExchangeEstimateResult {
  const totalTokens =
    request.offeredTokens ?? (request.offeredInputTokens ?? 0) + (request.offeredOutputTokens ?? 0);

  return {
    estimatedReceivedTokens: Math.max(totalTokens, 100),
    message: 'OK',
  };
}
