import { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useAvailableModels } from '../../hooks/useAvailableModels';
import { hasFieldError } from '../../lib/validators';
import { setupTestIds } from '../../lib/testIds';

interface ModelSelectProps {
  side: 'offer' | 'receive';
}

export function ModelSelect({ side }: ModelSelectProps) {
  const offer = useAppStore((state) => state.offer);
  const receive = useAppStore((state) => state.receive);
  const setOfferModel = useAppStore((state) => state.setOfferModel);
  const setReceiveModel = useAppStore((state) => state.setReceiveModel);
  const errors = useAppStore((state) => state.errors);
  const authMethod = useAppStore((state) => state.authMethod);
  const apiKey = useAppStore((state) => state.apiKey);

  const provider = side === 'offer' ? offer.provider : receive.provider;
  const selectedModel = side === 'offer' ? offer.model : receive.model;
  const setModel = side === 'offer' ? setOfferModel : setReceiveModel;
  const oppositeProvider = side === 'offer' ? receive.provider : offer.provider;
  const oppositeModel = side === 'offer' ? receive.model : offer.model;

  const { models, isLoading, isRefreshing, error, status, source, fetchLatest } = useAvailableModels(provider);
  const availableModels =
    provider && provider === oppositeProvider && oppositeModel
      ? models.filter((model) => model.id !== oppositeModel)
      : models;

  const hasError = hasFieldError(errors, 'model');
  const canFetchLatest = side === 'offer' && authMethod === 'api_key' && Boolean(provider);

  useEffect(() => {
    if (selectedModel && !availableModels.some((model) => model.id === selectedModel)) {
      setModel('');
    }
  }, [availableModels, selectedModel, setModel]);

  return (
    <div className="form-group">
      <label className="form-label">Model</label>
      {canFetchLatest && (
        <button
          type="button"
          className="advanced-link"
          onClick={() => void fetchLatest(apiKey)}
          disabled={isLoading || isRefreshing}
        >
          {isRefreshing ? 'Fetching latest models...' : 'Fetch Latest Models'}
        </button>
      )}
      <div className="select-wrapper">
        <select
          className={`form-select ${hasError ? 'error' : ''}`}
          data-testid={setupTestIds.modelSelect(side)}
          data-provider={provider ?? ''}
          data-side={side}
          value={selectedModel}
          onChange={(e) => setModel(e.target.value)}
          disabled={!provider || isLoading}
        >
          <option value="">
            {isLoading
              ? 'Loading models...'
              : !provider
                ? 'Select a provider first'
                : 'Select a model...'}
          </option>
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>
      {status && !error && (
        <div
          className="token-input-suffix"
          data-testid={setupTestIds.modelStatus(side)}
          data-source={source ?? 'unknown'}
          aria-live="polite"
        >
          {status}
        </div>
      )}
      {error && (
        <div
          className="form-error"
          data-testid={setupTestIds.modelError(side)}
          data-source={source ?? 'unknown'}
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}
