import { useState, useEffect, useCallback } from 'react';
import type { Provider } from '../../shared/constants';

type LMbaseWindow = Window & {
  lmbase: {
    providers: {
      fetchModels: (request: { provider: string; apiKey?: string }) => Promise<{ models: string[]; message: string }>;
    };
  };
};

interface ModelInfo {
  id: string;
  name: string;
}

const FALLBACK_MODELS: Record<Provider, ModelInfo[]> = {
  openai: [
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
  ],
  gemini: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' },
  ],
  'github-copilot': [
    { id: 'copilot-chat', name: 'Copilot Chat' },
    { id: 'copilot-suggestions', name: 'Copilot Suggestions' },
  ],
};

interface UseAvailableModelsResult {
  models: ModelInfo[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  status: string | null;
  source: 'supported' | 'live' | 'fallback' | null;
  refetch: () => void;
  fetchLatest: (apiKey: string) => Promise<void>;
}

export function useAvailableModels(
  provider: Provider | null
): UseAvailableModelsResult {
  const lmbase = (window as unknown as LMbaseWindow).lmbase;
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [source, setSource] = useState<'supported' | 'live' | 'fallback' | null>(null);

  const applyModels = useCallback((nextModels: string[]) => {
    setModels(
      nextModels.map((id: string) => ({
        id,
        name: formatModelName(id),
      }))
    );
  }, []);

  const applyFallback = useCallback((providerId: Provider, message: string, asError = true) => {
    setModels(FALLBACK_MODELS[providerId] || []);
    setError(asError ? message : null);
    setStatus(message);
    setSource('fallback');
  }, []);

  const fetchModels = useCallback(async () => {
    if (!provider) {
      setModels([]);
      setStatus(null);
      setSource(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus('Loading server-supported models...');

    try {
      const result = await lmbase.providers.fetchModels({ provider });

      if (result.models && result.models.length > 0) {
        applyModels(result.models);
        setStatus(`Loaded ${result.models.length} server-supported models`);
        setSource('supported');
      } else {
        applyFallback(provider, result.message || 'Using cached model list', false);
      }
    } catch (err) {
      applyFallback(provider, 'Using cached model list', false);
    } finally {
      setIsLoading(false);
    }
  }, [applyFallback, applyModels, provider]);

  const fetchLatest = useCallback(async (apiKeyValue: string) => {
    if (!provider) {
      return;
    }
    if (!apiKeyValue.trim()) {
      setError('Enter API key to fetch live models');
      return;
    }

    setIsRefreshing(true);
    setError(null);
    setStatus('Fetching latest models...');

    try {
      const result = await lmbase.providers.fetchModels({ provider, apiKey: apiKeyValue });
      if (result.models.length > 0) {
        applyModels(result.models);
        setStatus(`Loaded ${result.models.length} live models`);
        setSource('live');
        return;
      }

      const fallback = await lmbase.providers.fetchModels({ provider });
      if (fallback.models.length > 0) {
        applyModels(fallback.models);
        setError(`${result.message}. Using server-supported model list.`);
        setStatus(`Loaded ${fallback.models.length} server-supported models`);
        setSource('supported');
        return;
      }

      applyFallback(provider, `${result.message}. Using cached model list.`);
    } catch {
      applyFallback(provider, 'Could not fetch live models. Using cached model list.');
    } finally {
      setIsRefreshing(false);
    }
  }, [applyFallback, applyModels, provider]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models,
    isLoading,
    isRefreshing,
    error,
    status,
    source,
    refetch: fetchModels,
    fetchLatest,
  };
}

function formatModelName(id: string): string {
  const parts = id.split('-').filter((part) => part.length > 0);
  if (parts.length === 0) {
    return id;
  }

  const [first, ...rest] = parts;
  const firstLower = first.toLowerCase();
  const firstFormatted = firstLower === 'gpt' ? 'GPT' : capitalizeWord(first);

  if (rest.length === 0) {
    return firstFormatted;
  }

  const formattedRest = rest.map((part) => capitalizeWord(part));
  if (firstLower === 'gpt') {
    return `${firstFormatted}-${formattedRest.join(' ')}`;
  }
  return `${firstFormatted} ${formattedRest.join(' ')}`;
}

function capitalizeWord(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export { FALLBACK_MODELS };
