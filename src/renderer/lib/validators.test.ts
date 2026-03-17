import { describe, it, expect } from 'vitest';
import {
  validateProvider,
  validateModel,
  validateTokens,
  validateApiKey,
  validateOfferConfig,
  validateReceiveConfig,
  validateDistinctProviderModelPair,
  validateSetupForm,
  formatTokenInput,
  parseTokenInput,
  getFirstError,
  hasFieldError,
} from './validators';

describe('validators', () => {
  describe('validateProvider', () => {
    it('should return error for null provider', () => {
      const result = validateProvider(null);
      expect(result).not.toBeNull();
      expect(result?.message).toBe('Please select a provider');
    });

    it('should return error for invalid provider', () => {
      const result = validateProvider('invalid' as any);
      expect(result).not.toBeNull();
      expect(result?.message).toBe('Invalid provider selected');
    });

    it('should return null for valid provider', () => {
      expect(validateProvider('openai')).toBeNull();
      expect(validateProvider('anthropic')).toBeNull();
      expect(validateProvider('gemini')).toBeNull();
      expect(validateProvider('github-copilot')).toBeNull();
    });
  });

  describe('validateModel', () => {
    it('should return error for empty model', () => {
      const result = validateModel('');
      expect(result).not.toBeNull();
      expect(result?.message).toBe('Please select a model');
    });

    it('should return null for valid model', () => {
      expect(validateModel('gpt-4')).toBeNull();
      expect(validateModel('claude-3-5-sonnet')).toBeNull();
    });
  });

  describe('validateTokens', () => {
    it('should return error for tokens below minimum', () => {
      const result = validateTokens(50);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('Minimum');
    });

    it('should return error for tokens above maximum', () => {
      const result = validateTokens(20_000_000);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('Maximum');
    });

    it('should return null for valid tokens', () => {
      expect(validateTokens(10000)).toBeNull();
      expect(validateTokens(100)).toBeNull();
      expect(validateTokens(1000000)).toBeNull();
    });
  });

  describe('validateApiKey', () => {
    it('should return error for empty key', () => {
      const result = validateApiKey('');
      expect(result).not.toBeNull();
      expect(result?.message).toBe('API key is required');
    });

    it('should return error for short key', () => {
      const result = validateApiKey('short');
      expect(result).not.toBeNull();
      expect(result?.message).toBe('API key appears to be invalid');
    });

    it('should return null for valid key', () => {
      expect(validateApiKey('sk-valid-key-12345')).toBeNull();
    });
  });

  describe('validateOfferConfig', () => {
    it('should return errors for invalid config', () => {
      const errors = validateOfferConfig({
        provider: null,
        model: '',
        tokens: 50,
        inputTokens: 0,
        outputTokens: 0,
        advanced: false,
      });
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return no errors for valid config', () => {
      const errors = validateOfferConfig({
        provider: 'openai',
        model: 'gpt-4',
        tokens: 10000,
        inputTokens: 0,
        outputTokens: 0,
        advanced: false,
      });
      
      expect(errors).toHaveLength(0);
    });

    it('should validate input/output tokens in advanced mode', () => {
      const errors = validateOfferConfig({
        provider: 'openai',
        model: 'gpt-4',
        tokens: 0,
        inputTokens: 50,
        outputTokens: 50,
        advanced: true,
      });
      
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateReceiveConfig', () => {
    it('should return errors for invalid config', () => {
      const errors = validateReceiveConfig({
        provider: null,
        model: '',
      });
      
      expect(errors).toHaveLength(2);
    });

    it('should return no errors for valid config', () => {
      const errors = validateReceiveConfig({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
      });
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateSetupForm', () => {
    it('should validate all fields', () => {
      const errors = validateSetupForm(
        { provider: null, model: '', tokens: 50, inputTokens: 0, outputTokens: 0, advanced: false },
        { provider: null, model: '' },
        'api_key',
        ''
      );
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects identical offer and receive provider-model pairs', () => {
      const errors = validateSetupForm(
        {
          provider: 'openai',
          model: 'gpt-5.3-codex',
          tokens: 1000,
          inputTokens: 0,
          outputTokens: 0,
          advanced: false,
        },
        { provider: 'openai', model: 'gpt-5.3-codex' },
        'api_key',
        'sk-valid-key-12345'
      );

      expect(errors).toContainEqual({
        field: 'model',
        message: 'Share and want cannot use the same provider and model',
      });
    });

    it('allows same provider when models differ', () => {
      const errors = validateSetupForm(
        {
          provider: 'openai',
          model: 'gpt-5.3-codex',
          tokens: 1000,
          inputTokens: 0,
          outputTokens: 0,
          advanced: false,
        },
        { provider: 'openai', model: 'gpt-4.1' },
        'api_key',
        'sk-valid-key-12345'
      );

      expect(errors).toHaveLength(0);
    });
  });

  describe('validateDistinctProviderModelPair', () => {
    it('returns null when either side is incomplete', () => {
      expect(
        validateDistinctProviderModelPair(
          { provider: 'openai', model: '', tokens: 1000, inputTokens: 0, outputTokens: 0, advanced: false },
          { provider: 'openai', model: 'gpt-4.1' }
        )
      ).toBeNull();
    });
  });

  describe('formatTokenInput', () => {
    it('should format numbers with commas', () => {
      expect(formatTokenInput('10000')).toBe('10,000');
      expect(formatTokenInput('1000000')).toBe('1,000,000');
    });

    it('should return empty string for empty input', () => {
      expect(formatTokenInput('')).toBe('');
    });

    it('should strip non-numeric characters', () => {
      expect(formatTokenInput('10,000')).toBe('10,000');
      expect(formatTokenInput('abc10000')).toBe('10,000');
    });
  });

  describe('parseTokenInput', () => {
    it('should parse formatted numbers', () => {
      expect(parseTokenInput('10,000')).toBe(10000);
      expect(parseTokenInput('1,000,000')).toBe(1000000);
    });

    it('should return 0 for empty input', () => {
      expect(parseTokenInput('')).toBe(0);
    });

    it('should strip non-numeric characters', () => {
      expect(parseTokenInput('abc10000xyz')).toBe(10000);
    });
  });

  describe('getFirstError', () => {
    it('should return first error message for field', () => {
      const errors = [
        { field: 'provider', message: 'Required' },
        { field: 'model', message: 'Required' },
      ];
      
      expect(getFirstError(errors, 'provider')).toBe('Required');
      expect(getFirstError(errors, 'model')).toBe('Required');
    });

    it('should return null if no error for field', () => {
      const errors = [{ field: 'provider', message: 'Required' }];
      expect(getFirstError(errors, 'model')).toBeNull();
    });
  });

  describe('hasFieldError', () => {
    it('should return true if field has error', () => {
      const errors = [{ field: 'provider', message: 'Required' }];
      expect(hasFieldError(errors, 'provider')).toBe(true);
    });

    it('should return false if field has no error', () => {
      const errors = [{ field: 'provider', message: 'Required' }];
      expect(hasFieldError(errors, 'model')).toBe(false);
    });
  });
});
