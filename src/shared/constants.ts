export const PROVIDERS = ['openai', 'anthropic', 'gemini', 'github-copilot'] as const;
export type Provider = (typeof PROVIDERS)[number];

export const DEFAULT_PROXY_PORT = 9100;
export const DEFAULT_LMBASE_SERVER = 'ws://localhost:8080';

export const PROVIDER_CONFIG: Record<Provider, ProviderConfig> = {
  openai: {
    baseUrl: 'https://api.openai.com',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    extraHeaders: {},
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    authHeader: 'x-api-key',
    authPrefix: '',
    extraHeaders: { 'anthropic-version': '2023-06-01' },
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com',
    authHeader: 'x-goog-api-key',
    authPrefix: '',
    extraHeaders: {},
  },
  'github-copilot': {
    baseUrl: 'https://api.githubcopilot.com',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    extraHeaders: {
      'Editor-Version': 'vscode/1.95.0',
      'Editor-Plugin-Version': 'copilot/1.250.0',
      'User-Agent': 'GithubCopilot/1.250.0',
      'Copilot-Integration-Id': 'vscode-chat',
      'Openai-Organization': 'github-copilot',
    },
  },
};

export interface ProviderConfig {
  baseUrl: string;
  authHeader: string;
  authPrefix: string;
  extraHeaders: Record<string, string>;
}
