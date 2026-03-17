import { PROVIDER_CONFIG, type Provider } from '../../shared/constants';

export const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

export const INCOMING_AUTH_HEADERS = new Set(['authorization', 'x-api-key', 'x-goog-api-key']);

type UnknownHeaders = Record<string, unknown>;

function firstHeaderValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}

export function withQueryParams(url: string, query: Record<string, unknown> | undefined): string {
  if (!query) {
    return url;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
      continue;
    }
    params.append(key, String(value));
  }

  const queryString = params.toString();
  if (!queryString) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${queryString}`;
}

export function buildUpstreamHeaders(options: {
  requestHeaders: UnknownHeaders;
  provider: Provider;
  apiKey: string;
  extraHeaders?: Record<string, string>;
}): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(options.requestHeaders)) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower) || INCOMING_AUTH_HEADERS.has(lower)) {
      continue;
    }
    const normalized = firstHeaderValue(value);
    if (normalized !== undefined) {
      headers[key] = normalized;
    }
  }

  const providerConfig = PROVIDER_CONFIG[options.provider];
  headers[providerConfig.authHeader] = `${providerConfig.authPrefix}${options.apiKey}`;

  for (const [key, value] of Object.entries(providerConfig.extraHeaders)) {
    headers[key] = value;
  }

  if (options.extraHeaders) {
    for (const [key, value] of Object.entries(options.extraHeaders)) {
      headers[key] = value;
    }
  }

  if (!Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }

  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'accept-encoding') {
      delete headers[key];
    }
  }
  headers['Accept-Encoding'] = 'identity';
  return headers;
}

export function responseHeaders(headers: Headers | Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};

  if (headers instanceof Headers) {
    for (const [key, value] of headers.entries()) {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        out[key] = value;
      }
    }
    return out;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      out[key] = value;
    }
  }

  return out;
}
