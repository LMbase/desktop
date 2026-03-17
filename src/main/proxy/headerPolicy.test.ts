import { describe, expect, it } from 'vitest';
import { buildUpstreamHeaders, responseHeaders, withQueryParams } from './headerPolicy';

describe('headerPolicy', () => {
  it('strips hop-by-hop and incoming auth, then injects provider auth', () => {
    const headers = buildUpstreamHeaders({
      requestHeaders: {
        Authorization: 'Bearer temp-key',
        Host: 'localhost:9100',
        Connection: 'keep-alive',
        Accept: 'application/json',
        'x-trace-id': 'trace-1',
      },
      provider: 'openai',
      apiKey: 'real-key',
    });

    expect(headers.Authorization).toBe('Bearer real-key');
    expect(headers.Accept).toBe('application/json');
    expect(headers['x-trace-id']).toBe('trace-1');
    expect(headers.Host).toBeUndefined();
    expect(headers.Connection).toBeUndefined();
    expect(headers['Accept-Encoding']).toBe('identity');
  });

  it('strips hop-by-hop headers from upstream responses', () => {
    const headers = new Headers({
      'content-type': 'application/json',
      connection: 'keep-alive',
      'x-request-id': 'abc',
    });

    expect(responseHeaders(headers)).toEqual({
      'content-type': 'application/json',
      'x-request-id': 'abc',
    });
  });

  it('adds encoded query parameters to URL', () => {
    const url = withQueryParams('https://example.com/v1/chat/completions', {
      a: '1',
      b: 'hello world',
    });
    expect(url).toBe('https://example.com/v1/chat/completions?a=1&b=hello+world');
  });
});
