import { describe, expect, it, vi } from 'vitest';
import { buildAuthHeaders, filterUniqueStrings, intersectPreservingOrder, requestJson } from './providerClient';

describe('providerClient', () => {
  it('builds auth headers from provider config', async () => {
    const headers = await buildAuthHeaders(
      {
        baseUrl: 'https://example.com',
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
        extraHeaders: { 'x-test': '1' },
      },
      'abc123',
    );

    expect(headers).toEqual({
      Authorization: 'Bearer abc123',
      'x-test': '1',
    });
  });

  it('filters and intersects models preserving source order', async () => {
    const models = await filterUniqueStrings(['gpt-4', 'gpt-4', '', 'gpt-4o']);
    const filtered = await intersectPreservingOrder(models, ['gpt-4o', 'gpt-4']);

    expect(models).toEqual(['gpt-4', 'gpt-4o']);
    expect(filtered).toEqual(['gpt-4', 'gpt-4o']);
  });

  it('returns status and payload for JSON request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });

    const result = await requestJson('https://example.com/v1/models', {}, fetchMock);
    expect(result).toEqual({ status: 200, data: { ok: true } });
  });
});
