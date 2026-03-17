import type { ExchangeConfig } from '@shared/contracts/session';
import type { OfferConfig, ReceiveConfig, AuthMethod } from '../store/appStore';
import type { Provider } from '@shared/constants';

export function mapToExchangeConfig(
  offer: OfferConfig,
  receive: ReceiveConfig,
  authMethod: AuthMethod,
  apiKey: string,
  githubToken = ''
): ExchangeConfig {
  const provider = offer.provider as Provider;
  const wantProvider = receive.provider as Provider;

  const config: ExchangeConfig = {
    provider,
    model: offer.model,
    tokensOffered: offer.advanced
      ? offer.inputTokens + offer.outputTokens
      : offer.tokens,
    wantProvider,
    wantModel: receive.model,
    apiKey,
    authMethod,
    githubToken,
    inputTokensOffered: offer.advanced ? offer.inputTokens : 0,
    outputTokensOffered: offer.advanced ? offer.outputTokens : 0,
    advanced: offer.advanced,
    proxyPort: 9100,
    proxyUrl: '',
  };

  return config;
}

export function mapFromExchangeConfig(config: ExchangeConfig): {
  offer: OfferConfig;
  receive: ReceiveConfig;
  authMethod: AuthMethod;
  apiKey: string;
} {
  return {
    offer: {
      provider: config.provider,
      model: config.model,
      tokens: config.tokensOffered,
      inputTokens: config.inputTokensOffered,
      outputTokens: config.outputTokensOffered,
      advanced: config.advanced,
    },
    receive: {
      provider: config.wantProvider,
      model: config.wantModel,
    },
    authMethod: config.authMethod,
    apiKey: config.apiKey,
  };
}

export function getProviderDisplayName(provider: Provider): string {
  const names: Record<Provider, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Gemini',
    'github-copilot': 'Copilot',
  };
  return names[provider] || provider;
}

export function getProviderModelsPreview(provider: Provider): string {
  const previews: Record<Provider, string> = {
    openai: 'GPT-4.1, GPT-5, GPT-5.4',
    anthropic: 'Claude 4.6 Sonnet, Claude 4.6 Opus',
    gemini: 'Gemini 3.1 Pro, Flash',
    'github-copilot': 'GitHub Copilot Models',
  };
  return previews[provider] || '';
}

export function getProviderIconLetter(provider: Provider): string {
  const letters: Record<Provider, string> = {
    openai: 'O',
    anthropic: 'A',
    gemini: 'G',
    'github-copilot': 'C',
  };
  return letters[provider] || '?';
}

export function getProviderCssClass(provider: Provider): string {
  if (provider === 'github-copilot') {
    return 'copilot';
  }
  return provider.replace('-', '');
}
