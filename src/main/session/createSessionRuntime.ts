import { createProxyServer, type ConfigurableProxyServer } from '../proxy/createProxyServer';
import { logger } from '../logging/logger';
import { TunnelManager } from '../tunnel/tunnelManager';
import { NgrokProvider } from '../tunnel/ngrokProvider';
import type { SessionRuntime } from './sessionController';

interface RuntimeOptions {
  createProxy?: typeof createProxyServer;
  createTunnelManager?: () => TunnelManager;
}

async function listenWithFallback(server: ConfigurableProxyServer, startingPort: number): Promise<number> {
  let port = startingPort;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await server.listen({ host: '127.0.0.1', port });
      return port;
    } catch (error) {
      port += 1;
      if (attempt === 9) {
        throw error;
      }
    }
  }
  throw new Error('Unable to start proxy server');
}

export function createSessionRuntime(options: RuntimeOptions = {}): SessionRuntime {
  const createProxy = options.createProxy ?? createProxyServer;
  const tunnelManager = options.createTunnelManager?.() ?? new TunnelManager(new NgrokProvider());

  let server: ConfigurableProxyServer | null = null;

  return {
    start: async (config, onTokensServed) => {
      server = createProxy({
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        tempKey: '',
        tokenBudget: 0,
        inputBudget: 0,
        outputBudget: 0,
        onTokensServed,
      });

      const port = await listenWithFallback(server, config.proxyPort);
      const proxyUrl = await tunnelManager.start(port);
      logger.info(`Session runtime ready on ${proxyUrl}`);
      return { proxyUrl };
    },

    configurePairing: async ({ tempKey, tokenBudget, inputBudget, outputBudget }) => {
      if (!server) {
        throw new Error('Proxy server is not running');
      }
      server.configurePairing({ tempKey, tokenBudget, inputBudget, outputBudget });
    },

    stop: async () => {
      await tunnelManager.stop();
      if (server) {
        await server.close();
        server = null;
      }
    },
  };
}
