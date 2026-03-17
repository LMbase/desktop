import Fastify from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createModelsRoute } from './modelsRoute';

describe('modelsRoute', () => {
  const app = Fastify();

  app.get(
    '/v1/models',
    createModelsRoute({
      provider: 'openai',
      model: 'gpt-4o-mini',
      tempKey: 'temp-key',
    }),
  );

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for invalid temp key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/models',
      headers: { Authorization: 'Bearer wrong' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns single allowed model', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/models',
      headers: { Authorization: 'Bearer temp-key' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      object: 'list',
      data: [{ id: 'gpt-4o-mini', object: 'model', owned_by: 'lmbase' }],
    });
  });
});
