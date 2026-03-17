import { TunnelProvider } from './tunnelProvider';
import { logger } from '../logging/logger';

export class TunnelManager {
  private provider: TunnelProvider;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(provider: TunnelProvider) {
    this.provider = provider;
  }

  async start(port: number): Promise<string> {
    try {
      const url = await this.provider.connect(port);
      this.reconnectAttempts = 0;
      return url;
    } catch (error) {
      logger.error('Failed to start tunnel:', error);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        logger.info(`Retrying tunnel connection (attempt ${this.reconnectAttempts})...`);
        await new Promise(r => setTimeout(r, 2000));
        return this.start(port);
      }
      
      throw error;
    }
  }

  async stop(): Promise<void> {
    await this.provider.disconnect();
    this.reconnectAttempts = 0;
  }

  getUrl(): string | null {
    return this.provider.getUrl();
  }
}
