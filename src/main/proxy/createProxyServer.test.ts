import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProxyServer } from './createProxyServer';

function streamResponse(chunks: string[], status = 200, headers: Record<string, string> = {}): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status,
    headers,
  });
}

describe('createProxyServer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards non-streaming requests with header policy and capped output', async () => {
    const fetchImpl = vi.fn(async (...args: [string, RequestInit]) => {
      const [_url, init] = args;
      void init;
      return new Response(JSON.stringify({ usage: { prompt_tokens: 3, completion_tokens: 4 } }), {
        status: 200,
        headers: { 'content-type': 'application/json', connection: 'keep-alive' },
      });
    });

    const onTokensServed = vi.fn();
    const app = createProxyServer({
      provider: 'openai',
      model: 'gpt-4o-mini',
      tempKey: 'temp',
      apiKey: 'real',
      tokenBudget: 20,
      onTokensServed,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      headers: {
        Authorization: 'Bearer temp',
        'x-test-id': 'abc',
      },
      payload: { model: 'gpt-4o-mini', max_tokens: 200 },
    });

    expect(response.statusCode).toBe(200);
    expect(onTokensServed).toHaveBeenCalledWith(3, 4);

    const call = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe('https://api.openai.com/v1/chat/completions');
    expect((call[1].headers as Record<string, string>).Authorization).toBe('Bearer real');
    expect((call[1].headers as Record<string, string>)['x-test-id']).toBe('abc');

    const body = JSON.parse(String(call[1].body));
    expect(body.max_tokens).toBeUndefined();
    expect(body.max_completion_tokens).toBe(20);

    await app.close();
  });

  it('returns 429 when budget is exhausted', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ usage: { prompt_tokens: 3, completion_tokens: 4 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const app = createProxyServer({
      provider: 'openai',
      model: 'gpt-4o-mini',
      tempKey: 'temp',
      apiKey: 'real',
      tokenBudget: 5,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const first = await app.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      headers: { Authorization: 'Bearer temp' },
      payload: { model: 'gpt-4o-mini' },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      headers: { Authorization: 'Bearer temp' },
      payload: { model: 'gpt-4o-mini' },
    });
    expect(second.statusCode).toBe(429);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('parses SSE usage and closes stream when projected budget is reached', async () => {
    const fetchImpl = vi.fn(async () => {
      return streamResponse(
        [
          'data: {"usage":{"prompt_tokens":2,"completion_tokens":3}}\n\n',
          'data: {"usage":{"prompt_tokens":2,"completion_tokens":6}}\n\n',
        ],
        200,
        { 'content-type': 'text/event-stream' },
      );
    });

    const onTokensServed = vi.fn();
    const app = createProxyServer({
      provider: 'openai',
      model: 'gpt-4o-mini',
      tempKey: 'temp',
      apiKey: 'real',
      tokenBudget: 7,
      onTokensServed,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      headers: { Authorization: 'Bearer temp' },
      payload: { model: 'gpt-4o-mini', stream: true },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(onTokensServed).toHaveBeenCalledWith(2, 5);

    await app.close();
  });

  it('updates temp key and budgets after pairing configuration', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ usage: { prompt_tokens: 1, completion_tokens: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const app = createProxyServer({
      provider: 'openai',
      model: 'gpt-4o-mini',
      tempKey: '',
      apiKey: 'real',
      tokenBudget: 0,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    app.configurePairing({ tempKey: 'temp-new', tokenBudget: 4, inputBudget: 0, outputBudget: 0 });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      headers: { Authorization: 'Bearer temp-new' },
      payload: { model: 'gpt-4o-mini' },
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });
});
