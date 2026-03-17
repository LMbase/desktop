import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from './appStore';

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  describe('offer config', () => {
    it('should set offer provider', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setOfferProvider('openai');
      });
      
      expect(result.current.offer.provider).toBe('openai');
    });

    it('should set offer model', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setOfferModel('gpt-4');
      });
      
      expect(result.current.offer.model).toBe('gpt-4');
    });

    it('should set offer tokens', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setOfferTokens(10000);
      });
      
      expect(result.current.offer.tokens).toBe(10000);
    });

    it('should set input/output tokens in advanced mode', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setOfferInputTokens(7000);
        result.current.setOfferOutputTokens(3000);
      });
      
      expect(result.current.offer.inputTokens).toBe(7000);
      expect(result.current.offer.outputTokens).toBe(3000);
    });

    it('should clear model when provider changes', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setOfferProvider('openai');
        result.current.setOfferModel('gpt-4');
      });
      
      expect(result.current.offer.model).toBe('gpt-4');
      
      act(() => {
        result.current.setOfferProvider('anthropic');
      });
      
      expect(result.current.offer.model).toBe('');
    });
  });

  describe('receive config', () => {
    it('should set receive provider', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setReceiveProvider('anthropic');
      });
      
      expect(result.current.receive.provider).toBe('anthropic');
    });

    it('should set receive model', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setReceiveModel('claude-3-5-sonnet');
      });
      
      expect(result.current.receive.model).toBe('claude-3-5-sonnet');
    });
  });

  describe('auth config', () => {
    it('should set auth method', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setAuthMethod('copilot');
      });
      
      expect(result.current.authMethod).toBe('copilot');
    });

    it('should set api key', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setApiKey('sk-test-123');
      });
      
      expect(result.current.apiKey).toBe('sk-test-123');
    });
  });

  describe('copilot auth', () => {
    it('should update copilot auth state', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setCopilotAuth({
          status: 'pending',
          userCode: 'ABCD-1234',
          deviceCode: 'device-123',
          verificationUri: 'https://github.com/device',
        });
      });
      
      expect(result.current.copilotAuth.status).toBe('pending');
      expect(result.current.copilotAuth.userCode).toBe('ABCD-1234');
    });
  });

  describe('session', () => {
    it('should set session snapshot', () => {
      const { result } = renderHook(() => useAppStore());
      
      const snapshot = {
        status: 'paired' as const,
        config: null,
        pairing: null,
      };
      
      act(() => {
        result.current.setSession(snapshot);
      });
      
      expect(result.current.session).toEqual(snapshot);
    });

    it('should add activity events', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.addActivity({
          timestamp: Date.now(),
          type: 'info',
          message: 'Test event',
        });
      });
      
      expect(result.current.activityLog).toHaveLength(1);
      expect(result.current.activityLog[0].message).toBe('Test event');
    });

    it('should limit activity log to 100 items', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        for (let i = 0; i < 150; i++) {
          result.current.addActivity({
            timestamp: Date.now(),
            type: 'info',
            message: `Event ${i}`,
          });
        }
      });
      
      expect(result.current.activityLog.length).toBeLessThanOrEqual(100);
    });
  });

  describe('errors', () => {
    it('should set errors', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setErrors([
          { field: 'provider', message: 'Required' },
        ]);
      });
      
      expect(result.current.errors).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setOfferProvider('openai');
        result.current.setOfferModel('gpt-4');
        result.current.setOfferTokens(50000);
        result.current.setReceiveProvider('anthropic');
        result.current.setApiKey('test-key');
        result.current.setConnecting(true);
      });
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.offer.provider).toBeNull();
      expect(result.current.offer.model).toBe('');
      expect(result.current.offer.tokens).toBe(0);
      expect(result.current.receive.provider).toBeNull();
      expect(result.current.apiKey).toBe('');
      expect(result.current.isConnecting).toBe(false);
    });
  });
});
