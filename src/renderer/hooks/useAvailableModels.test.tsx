import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAvailableModels } from './useAvailableModels';

type TokenHubWindow = Window & {
  tokenhub: {
    providers: {
      fetchModels: (request: { provider: string; apiKey?: string }) => Promise<{ models: string[]; message: string }>;
    };
  };
};

const tokenhub = (window as unknown as TokenHubWindow).tokenhub;

describe('useAvailableModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads supported models on provider change', async () => {
    vi.mocked(tokenhub.providers.fetchModels).mockResolvedValueOnce({
      models: ['gpt-4o'],
      message: 'OK',
    });

    const { result } = renderHook(() => useAvailableModels('openai'));

    await waitFor(() => expect(result.current.models).toHaveLength(1));
    expect(tokenhub.providers.fetchModels).toHaveBeenCalledWith({ provider: 'openai' });
    expect(result.current.models[0]).toEqual({ id: 'gpt-4o', name: 'GPT-4o' });
    expect(result.current.source).toBe('supported');
  });

  it('formats GPT model labels with uppercase GPT prefix', async () => {
    vi.mocked(tokenhub.providers.fetchModels).mockResolvedValueOnce({
      models: ['gpt-4.1'],
      message: 'OK',
    });

    const { result } = renderHook(() => useAvailableModels('openai'));

    await waitFor(() => expect(result.current.models).toHaveLength(1));
    expect(result.current.models[0]).toEqual({ id: 'gpt-4.1', name: 'GPT-4.1' });
  });

  it('keeps non-GPT model normalization unchanged', async () => {
    vi.mocked(tokenhub.providers.fetchModels).mockResolvedValueOnce({
      models: ['claude-3-5-sonnet-20241022', 'gemini-1.5-pro'],
      message: 'OK',
    });

    const { result } = renderHook(() => useAvailableModels('anthropic'));

    await waitFor(() => expect(result.current.models).toHaveLength(2));
    expect(result.current.models[0]).toEqual({
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3 5 Sonnet 20241022',
    });
    expect(result.current.models[1]).toEqual({ id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' });
  });

  it('falls back to cached models without surfacing a hard error when server models are unreachable', async () => {
    vi.mocked(tokenhub.providers.fetchModels).mockResolvedValueOnce({
      models: [],
      message: 'Network error: fetch failed',
    });

    const { result } = renderHook(() => useAvailableModels('openai'));

    await waitFor(() => expect(result.current.models.length).toBeGreaterThan(0));
    expect(result.current.source).toBe('fallback');
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('Network error: fetch failed');
  });

  it('fetches live models explicitly and falls back to supported list', async () => {
    vi.mocked(tokenhub.providers.fetchModels)
      .mockResolvedValueOnce({ models: ['gpt-4o'], message: 'OK' })
      .mockResolvedValueOnce({ models: [], message: 'API key rejected' })
      .mockResolvedValueOnce({ models: ['gpt-4o-mini'], message: 'OK' });

    const { result } = renderHook(() => useAvailableModels('openai'));
    await waitFor(() => expect(result.current.models).toHaveLength(1));

    await act(async () => {
      await result.current.fetchLatest('sk-test');
    });

    expect(tokenhub.providers.fetchModels).toHaveBeenLastCalledWith({ provider: 'openai' });
    expect(result.current.models[0]?.id).toBe('gpt-4o-mini');
    expect(result.current.error).toContain('Using server-supported model list');
  });
});
