import { describe, expect, it } from 'vitest';
import type { ExchangeConfig } from '../../shared/contracts/session';
import { buildInitialRegisterMessage, buildRemainingRegisterMessage } from './registerMessage';

const baseConfig: ExchangeConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  tokensOffered: 1200,
  wantProvider: 'anthropic',
  wantModel: 'claude-3-5-haiku',
  apiKey: 'secret',
  authMethod: 'api_key',
  githubToken: '',
  inputTokensOffered: 0,
  outputTokensOffered: 0,
  advanced: false,
  proxyPort: 9100,
  proxyUrl: 'https://proxy.example',
};

describe('registerMessage', () => {
  it('builds first register message for simple mode', () => {
    expect(buildInitialRegisterMessage(baseConfig)).toEqual({
      type: 'register',
      provider: 'openai',
      model: 'gpt-4o-mini',
      tokens_offered: 1200,
      want_provider: 'anthropic',
      want_model: 'claude-3-5-haiku',
      proxy_url: 'https://proxy.example',
    });
  });

  it('builds advanced mode first and remaining register messages', () => {
    const config: ExchangeConfig = {
      ...baseConfig,
      advanced: true,
      inputTokensOffered: 700,
      outputTokensOffered: 300,
    };

    expect(buildInitialRegisterMessage(config)).toEqual({
      type: 'register',
      provider: 'openai',
      model: 'gpt-4o-mini',
      tokens_offered: 1000,
      want_provider: 'anthropic',
      want_model: 'claude-3-5-haiku',
      proxy_url: 'https://proxy.example',
      input_tokens_offered: 700,
      output_tokens_offered: 300,
    });

    expect(
      buildRemainingRegisterMessage(config, {
        tokensToServeRem: 180,
        inputTokensToServeRem: 120,
        outputTokensToServeRem: 60,
      }),
    ).toEqual({
      type: 'register',
      provider: 'openai',
      model: 'gpt-4o-mini',
      tokens_offered: 180,
      want_provider: 'anthropic',
      want_model: 'claude-3-5-haiku',
      proxy_url: 'https://proxy.example',
      input_tokens_offered: 120,
      output_tokens_offered: 60,
    });
  });
});
