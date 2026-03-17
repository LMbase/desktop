import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Provider } from '../../shared/constants';
import { verifyTempKey } from './requestGuard';

export interface ModelsRouteOptions {
  provider: Provider;
  model: string;
  tempKey: string | (() => string);
}

export function createModelsRoute(options: ModelsRouteOptions) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const tempKey = typeof options.tempKey === 'function' ? options.tempKey() : options.tempKey;
    if (!verifyTempKey(options.provider, tempKey, request.headers as Record<string, unknown>)) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    reply.send({
      object: 'list',
      data: [
        {
          id: options.model,
          object: 'model',
          owned_by: 'tokenhub',
        },
      ],
    });
  };
}
