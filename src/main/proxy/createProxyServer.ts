import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import type { Provider } from '../../shared/constants';
import { BudgetTracker } from './budgetTracker';
import { buildUpstreamHeaders, responseHeaders, withQueryParams } from './headerPolicy';
import { createModelsRoute } from './modelsRoute';
import { providerRouteMap, resolveUpstreamUrl } from './providerRouteMap';
import { capOutputTokens, enforceModel, verifyTempKey, wantsStreaming } from './requestGuard';
import { SseUsageAccumulator } from './sseUsageAccumulator';
import { extractUsage } from './usageExtractor';

export interface PairingRuntimeConfig {
  tempKey: string;
  tokenBudget: number;
  inputBudget?: number;
  outputBudget?: number;
}

export interface ConfigurableProxyServer extends FastifyInstance {
  configurePairing: (config: PairingRuntimeConfig) => void;
}

export interface CreateProxyServerOptions {
  provider: Provider;
  model: string;
  apiKey: string;
  tempKey: string;
  tokenBudget: number;
  inputBudget?: number;
  outputBudget?: number;
  onTokensServed?: (inputTokens: number, outputTokens: number) => Promise<void> | void;
  fetchImpl?: typeof fetch;
}

function serializeBody(body: unknown): string {
  if (typeof body === 'string') {
    return body;
  }
  if (body === undefined || body === null) {
    return '';
  }
  return JSON.stringify(body);
}

function writeStreamingResponseHeaders(reply: FastifyReply, upstreamResponse: Response): void {
  const headers = responseHeaders(upstreamResponse.headers);
  const contentType = headers['content-type'] ?? headers['Content-Type'] ?? '';
  if (contentType.startsWith('text/event-stream')) {
    if (!headers['Cache-Control']) {
      headers['Cache-Control'] = 'no-cache';
    }
    if (!headers.Connection) {
      headers.Connection = 'keep-alive';
    }
    if (!headers['X-Accel-Buffering']) {
      headers['X-Accel-Buffering'] = 'no';
    }
  }

  reply.hijack();
  reply.raw.writeHead(upstreamResponse.status, headers);
}

async function forwardStreamingResponse(options: {
  reply: FastifyReply;
  upstreamResponse: Response;
  provider: Provider;
  budgetTracker: BudgetTracker;
}): Promise<void> {
  const { reply, upstreamResponse, provider, budgetTracker } = options;
  writeStreamingResponseHeaders(reply, upstreamResponse);

  if (!upstreamResponse.body) {
    reply.raw.end();
    return;
  }

  const accumulator = new SseUsageAccumulator(provider);
  const base = budgetTracker.snapshot();
  const reader = upstreamResponse.body.getReader();

  let streamClosedEarly = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    if (value && value.length > 0) {
      reply.raw.write(Buffer.from(value));
      const totals = accumulator.pushChunk(value);
      if (budgetTracker.wouldExceed(base, totals) || budgetTracker.remainingBudget() <= 0) {
        streamClosedEarly = true;
        await reader.cancel();
        break;
      }
    }
  }

  if (!reply.raw.writableEnded) {
    reply.raw.end();
  }

  const clamped = budgetTracker.clampToRemaining(base, accumulator.getTotals());
  await budgetTracker.recordUsageCounts(clamped.inputTokens, clamped.outputTokens);

  if (streamClosedEarly) {
    return;
  }
}

async function handleProxyRequest(options: {
  request: FastifyRequest;
  reply: FastifyReply;
  provider: Provider;
  model: string;
  tempKey: string;
  apiKey: string;
  budgetTracker: BudgetTracker;
  fetchImpl: typeof fetch;
}): Promise<void> {
  const { request, reply, provider, model, tempKey, apiKey, budgetTracker, fetchImpl } = options;

  if (!verifyTempKey(provider, tempKey, request.headers as Record<string, unknown>)) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }

  if (budgetTracker.budgetExceeded()) {
    reply.code(429).send({ error: 'Token budget exhausted' });
    return;
  }

  const routeModel = (request.params as { model?: string } | undefined)?.model;
  if (provider === 'gemini' && routeModel && routeModel !== model) {
    reply.code(400).send({ error: `Only model '${model}' is available on this proxy` });
    return;
  }

  const body = serializeBody(request.body);
  if (!enforceModel(body, model)) {
    reply.code(400).send({ error: `Only model '${model}' is available on this proxy` });
    return;
  }

  const cappedBody = capOutputTokens(body, provider, budgetTracker.remainingOutputBudget());
  const upstreamUrl = withQueryParams(resolveUpstreamUrl(provider, model), request.query as Record<string, unknown>);
  const headers = buildUpstreamHeaders({
    requestHeaders: request.headers as Record<string, unknown>,
    provider,
    apiKey,
  });

  const upstreamResponse = await fetchImpl(upstreamUrl, {
    method: 'POST',
    headers,
    body: cappedBody,
  });

  if (wantsStreaming(cappedBody)) {
    await forwardStreamingResponse({
      reply,
      upstreamResponse,
      provider,
      budgetTracker,
    });
    return;
  }

  const responsePayload = Buffer.from(await upstreamResponse.arrayBuffer());
  try {
    const usagePayload = JSON.parse(responsePayload.toString('utf-8')) as unknown;
    const usage = extractUsage(usagePayload, provider);
    await budgetTracker.recordUsageCounts(usage.inputTokens, usage.outputTokens);
  } catch {
  }

  for (const [key, value] of Object.entries(responseHeaders(upstreamResponse.headers))) {
    reply.header(key, value);
  }
  reply.code(upstreamResponse.status).send(responsePayload);
}

export function createProxyServer(options: CreateProxyServerOptions): ConfigurableProxyServer {
  const server = Fastify({ logger: false });
  const fetchImpl = options.fetchImpl ?? fetch;

  let tempKey = options.tempKey;
  let budgetTracker = new BudgetTracker({
    tokenBudget: options.tokenBudget,
    inputBudget: options.inputBudget,
    outputBudget: options.outputBudget,
    onTokensServed: options.onTokensServed,
  });

  const modelHandler = createModelsRoute({
    provider: options.provider,
    model: options.model,
    tempKey: () => tempKey,
  });
  server.get('/v1/models', modelHandler);
  server.get('/models', modelHandler);

  const routeConfig = providerRouteMap(options.provider);
  for (const localPath of routeConfig.localPaths) {
    server.post(localPath, async (request, reply) => {
      await handleProxyRequest({
        request,
        reply,
        provider: options.provider,
        model: options.model,
        tempKey,
        apiKey: options.apiKey,
        budgetTracker,
        fetchImpl,
      });
    });
  }

  const configurable = server as unknown as ConfigurableProxyServer;
  configurable.configurePairing = (config) => {
    tempKey = config.tempKey;
    budgetTracker = new BudgetTracker({
      tokenBudget: config.tokenBudget,
      inputBudget: config.inputBudget,
      outputBudget: config.outputBudget,
      onTokensServed: options.onTokensServed,
    });
  };

  return configurable;
}
