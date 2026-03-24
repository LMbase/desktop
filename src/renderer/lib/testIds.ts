import type { Provider } from '../../shared/constants';

export type SetupSide = 'offer' | 'receive';

export const setupTestIds = {
  page: 'setup-page',
  panel: (side: SetupSide) => `${side}-exchange-panel`,
  providerGrid: (side: SetupSide) => `${side}-provider-grid`,
  providerCard: (side: SetupSide, provider: Provider) => `${side}-provider-card-${provider}`,
  authMethodSelector: 'auth-method-selector',
  authMethodTab: (method: 'api_key' | 'copilot') => `auth-method-${method}`,
  authCredentials: 'auth-credentials',
  apiKeyInput: 'auth-api-key-input',
  apiKeyVisibilityToggle: 'auth-api-key-visibility-toggle',
  apiKeyError: 'auth-api-key-error',
  tokenAmountInput: 'token-amount-input',
  modelSelect: (side: SetupSide) => `${side}-model-select`,
  modelStatus: (side: SetupSide) => `${side}-model-status`,
  modelError: (side: SetupSide) => `${side}-model-error`,
  findMatchButton: 'find-match-button',
  connectionError: 'connection-error',
  authError: 'auth-error',
} as const;

export const sessionTestIds = {
  page: 'session-page',
  tunnelStatus: 'session-tunnel-status',
  proxyStatus: 'session-proxy-status',
  websocketStatus: 'session-websocket-status',
} as const;
