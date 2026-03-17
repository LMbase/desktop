export interface TunnelProvider {
  connect(port: number): Promise<string>;
  disconnect(): Promise<void>;
  getUrl(): string | null;
}

export interface TunnelConfig {
  authtoken?: string;
  region?: string;
}
