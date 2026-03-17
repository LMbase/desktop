import type { ExchangeEstimateResult, FetchModelsResult } from '@shared/contracts/providers';
import { filterUniqueStrings, type FetchLike, requestJson } from './providerClient';

export async function resolveServerHttpBaseUrl(): Promise<string> {
  const serverUrl = (process.env.LMBASE_SERVER ?? 'ws://localhost:8080').trim();
  if (serverUrl.startsWith('ws://')) {
    return `http://${serverUrl.slice('ws://'.length).replace(/\/+$/, '')}`;
  }
  if (serverUrl.startsWith('wss://')) {
    return `https://${serverUrl.slice('wss://'.length).replace(/\/+$/, '')}`;
  }
  return serverUrl.replace(/\/+$/, '');
}

export async function fetchServerSupportedModels(
  provider: string,
  fetchImpl: FetchLike = globalThis.fetch as FetchLike,
): Promise<FetchModelsResult> {
  if (!provider) {
    return { models: [], message: 'Provider is required' };
  }

  const base = await resolveServerHttpBaseUrl();
  const url = `${base}/providers/models?provider=${encodeURIComponent(provider)}`;
  const result = await requestJson(url, { method: 'GET' }, fetchImpl, 10_000);

  if (result.status === 0) {
    return { models: [], message: `Network error: ${result.error ?? 'unknown error'}` };
  }
  if (result.status !== 200) {
    return { models: [], message: `Server model list fetch failed (HTTP ${result.status})` };
  }
  if (result.error === 'invalid_json') {
    return { models: [], message: 'Server model list fetch failed (invalid JSON response)' };
  }
  if (!result.data || typeof result.data !== 'object' || !Array.isArray((result.data as { models?: unknown }).models)) {
    return { models: [], message: 'Server model list fetch failed (invalid payload)' };
  }

  const models = await filterUniqueStrings((result.data as { models: unknown[] }).models);
  if (models.length === 0) {
    return { models: [], message: `No supported models configured on server for ${provider}` };
  }
  return { models, message: 'OK' };
}

interface ExchangeEstimateRequest {
  offeredProvider: string;
  offeredModel: string;
  wantedProvider: string;
  wantedModel: string;
  offeredTokens?: number;
  offeredInputTokens?: number;
  offeredOutputTokens?: number;
}

export async function fetchServerExchangeEstimate(
  request: ExchangeEstimateRequest,
  fetchImpl: FetchLike = globalThis.fetch as FetchLike,
): Promise<ExchangeEstimateResult> {
  const {
    offeredProvider,
    offeredModel,
    wantedProvider,
    wantedModel,
    offeredTokens,
    offeredInputTokens,
    offeredOutputTokens,
  } = request;

  if (!offeredProvider || !offeredModel || !wantedProvider || !wantedModel) {
    return { estimatedReceivedTokens: 0, message: 'Invalid request payload' };
  }

  const params = new URLSearchParams({
    offered_provider: offeredProvider,
    offered_model: offeredModel,
    wanted_provider: wantedProvider,
    wanted_model: wantedModel,
  });

  if ((offeredInputTokens ?? 0) > 0 && (offeredOutputTokens ?? 0) > 0) {
    params.set('offered_input_tokens', String(offeredInputTokens));
    params.set('offered_output_tokens', String(offeredOutputTokens));
  } else if ((offeredTokens ?? 0) > 0) {
    params.set('offered_tokens', String(offeredTokens));
  } else {
    return { estimatedReceivedTokens: 0, message: 'Invalid token amount' };
  }

  const base = await resolveServerHttpBaseUrl();
  const url = `${base}/exchange/estimate?${params.toString()}`;
  const result = await requestJson(url, { method: 'GET' }, fetchImpl, 10_000);

  if (result.status === 0) {
    return { estimatedReceivedTokens: 0, message: `Network error: ${result.error ?? 'unknown error'}` };
  }
  if (result.status !== 200) {
    return { estimatedReceivedTokens: 0, message: `Exchange estimate failed (HTTP ${result.status})` };
  }
  if (result.error === 'invalid_json') {
    return { estimatedReceivedTokens: 0, message: 'Exchange estimate failed (invalid JSON response)' };
  }

  if (!result.data || typeof result.data !== 'object') {
    return { estimatedReceivedTokens: 0, message: 'Exchange estimate failed (invalid payload)' };
  }

  const received = (result.data as { estimated_received_tokens?: unknown }).estimated_received_tokens;
  if (!Number.isInteger(received) || (received as number) < 0) {
    return { estimatedReceivedTokens: 0, message: 'Exchange estimate failed (invalid payload)' };
  }

  return { estimatedReceivedTokens: received as number, message: 'OK' };
}
