import { describe, it, expect } from 'vitest';
import {
  mapToExchangeConfig,
  mapFromExchangeConfig,
  getProviderDisplayName,
  getProviderModelsPreview,
  getProviderIconLetter,
  getProviderCssClass,
} from './formMappers';

describe('formMappers', () => {
  describe('mapToExchangeConfig', () => {
    it('should map offer config to exchange config', () => {
      const offer = {
        provider: 'openai' as const,
        model: 'gpt-4',
        tokens: 10000,
        inputTokens: 0,
        outputTokens: 0,
        advanced: false,
      };
      
      const receive = {
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet',
      };
      
      const config = mapToExchangeConfig(offer, receive, 'api_key', 'sk-test');
      
      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4');
      expect(config.tokensOffered).toBe(10000);
      expect(config.wantProvider).toBe('anthropic');
      expect(config.wantModel).toBe('claude-3-5-sonnet');
      expect(config.apiKey).toBe('sk-test');
      expect(config.authMethod).toBe('api_key');
    });

    it('should handle advanced mode with input/output split', () => {
      const offer = {
        provider: 'openai' as const,
        model: 'gpt-4',
        tokens: 0,
        inputTokens: 7000,
        outputTokens: 3000,
        advanced: true,
      };
      
      const receive = {
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet',
      };
      
      const config = mapToExchangeConfig(offer, receive, 'api_key', 'sk-test');
      
      expect(config.tokensOffered).toBe(10000);
      expect(config.inputTokensOffered).toBe(7000);
      expect(config.outputTokensOffered).toBe(3000);
      expect(config.advanced).toBe(true);
    });

    it('should handle copilot auth method', () => {
      const offer = {
        provider: 'github-copilot' as const,
        model: 'copilot-chat',
        tokens: 10000,
        inputTokens: 0,
        outputTokens: 0,
        advanced: false,
      };
      
      const receive = {
        provider: 'openai' as const,
        model: 'gpt-4',
      };
      
      const config = mapToExchangeConfig(offer, receive, 'copilot', '', 'device-code-123');
      
      expect(config.authMethod).toBe('copilot');
      expect(config.githubToken).toBe('device-code-123');
    });
  });

  describe('mapFromExchangeConfig', () => {
    it('should map exchange config to offer/receive config', () => {
      const config = {
        provider: 'openai' as const,
        model: 'gpt-4',
        tokensOffered: 10000,
        wantProvider: 'anthropic' as const,
        wantModel: 'claude-3-5-sonnet',
        apiKey: 'sk-test',
        authMethod: 'api_key' as const,
        githubToken: '',
        inputTokensOffered: 0,
        outputTokensOffered: 0,
        advanced: false,
        proxyPort: 9100,
        proxyUrl: '',
      };
      
      const result = mapFromExchangeConfig(config);
      
      expect(result.offer.provider).toBe('openai');
      expect(result.offer.model).toBe('gpt-4');
      expect(result.offer.tokens).toBe(10000);
      expect(result.receive.provider).toBe('anthropic');
      expect(result.receive.model).toBe('claude-3-5-sonnet');
      expect(result.authMethod).toBe('api_key');
      expect(result.apiKey).toBe('sk-test');
    });
  });

  describe('getProviderDisplayName', () => {
    it('should return display names for providers', () => {
      expect(getProviderDisplayName('openai')).toBe('OpenAI');
      expect(getProviderDisplayName('anthropic')).toBe('Anthropic');
      expect(getProviderDisplayName('gemini')).toBe('Gemini');
      expect(getProviderDisplayName('github-copilot')).toBe('Copilot');
    });
  });

  describe('getProviderModelsPreview', () => {
    it('should return model preview strings', () => {
      expect(getProviderModelsPreview('openai')).toBe('GPT-4.1, GPT-5, GPT-5.4');
      expect(getProviderModelsPreview('anthropic')).toBe('Claude 4.6 Sonnet, Claude 4.6 Opus');
      expect(getProviderModelsPreview('gemini')).toBe('Gemini 3.1 Pro, Flash');
      expect(getProviderModelsPreview('github-copilot')).toBe('GitHub Copilot Models');
    });
  });

  describe('getProviderIconLetter', () => {
    it('should return icon letters for providers', () => {
      expect(getProviderIconLetter('openai')).toBe('O');
      expect(getProviderIconLetter('anthropic')).toBe('A');
      expect(getProviderIconLetter('gemini')).toBe('G');
      expect(getProviderIconLetter('github-copilot')).toBe('C');
    });
  });

  describe('getProviderCssClass', () => {
    it('should return CSS class names for providers', () => {
      expect(getProviderCssClass('openai')).toBe('openai');
      expect(getProviderCssClass('anthropic')).toBe('anthropic');
      expect(getProviderCssClass('gemini')).toBe('gemini');
      expect(getProviderCssClass('github-copilot')).toBe('copilot');
    });
  });
});
