import type { Provider } from '../../shared/constants';

function getHeader(headers: Record<string, unknown>, key: string): string {
  const direct = headers[key];
  if (typeof direct === 'string') {
    return direct;
  }

  const found = Object.entries(headers).find(([name]) => name.toLowerCase() === key.toLowerCase());
  if (!found) {
    return '';
  }

  const [, value] = found;
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return '';
}

function parseBody(body: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(body) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function toNullableInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

export function verifyTempKey(provider: Provider, tempKey: string, headers: Record<string, unknown>): boolean {
  if (provider === 'openai' || provider === 'github-copilot') {
    const auth = getHeader(headers, 'authorization');
    return auth.replace(/^Bearer\s+/, '') === tempKey;
  }
  if (provider === 'anthropic') {
    return getHeader(headers, 'x-api-key') === tempKey;
  }
  if (provider === 'gemini') {
    return getHeader(headers, 'x-goog-api-key') === tempKey;
  }
  return false;
}

export function enforceModel(body: string, model: string): boolean {
  const data = parseBody(body);
  if (!data) {
    return true;
  }
  const requestModel = typeof data.model === 'string' ? data.model : model;
  return requestModel === model;
}

export function capOutputTokens(body: string, provider: Provider, remainingOutputTokens: number): string {
  const data = parseBody(body);
  if (!data) {
    return body;
  }

  const remaining = Math.max(0, remainingOutputTokens);

  if (provider === 'openai' || provider === 'github-copilot') {
    const userMax = toNullableInt(data.max_completion_tokens) ?? toNullableInt(data.max_tokens);
    const cap = userMax !== undefined ? Math.min(userMax, remaining) : remaining;
    delete data.max_tokens;
    data.max_completion_tokens = cap;
    return JSON.stringify(data);
  }

  if (provider === 'anthropic') {
    const userMax = toNullableInt(data.max_tokens);
    data.max_tokens = userMax !== undefined ? Math.min(userMax, remaining) : remaining;
    return JSON.stringify(data);
  }

  if (provider === 'gemini') {
    const generationConfig =
      data.generationConfig && typeof data.generationConfig === 'object'
        ? (data.generationConfig as Record<string, unknown>)
        : {};
    const userMax = toNullableInt(generationConfig.maxOutputTokens);
    generationConfig.maxOutputTokens = userMax !== undefined ? Math.min(userMax, remaining) : remaining;
    data.generationConfig = generationConfig;
    return JSON.stringify(data);
  }

  return body;
}

export function wantsStreaming(body: string): boolean {
  const data = parseBody(body);
  return Boolean(data && data.stream === true);
}
