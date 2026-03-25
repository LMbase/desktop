import type { Provider } from '@shared/constants';
import { useAppStore } from '../../store/appStore';
import {
  getProviderDisplayName,
  getProviderModelsPreview,
  getProviderIconLetter,
  getProviderCssClass,
} from '../../lib/formMappers';
import { setupTestIds } from '../../lib/testIds';
import { CopilotIcon } from './CopilotIcon';

interface ProviderCardGridProps {
  side: 'offer' | 'receive';
}

export function ProviderCardGrid({ side }: ProviderCardGridProps) {
  const offer = useAppStore((state) => state.offer);
  const receive = useAppStore((state) => state.receive);
  const authMethod = useAppStore((state) => state.authMethod);
  const setOfferProvider = useAppStore((state) => state.setOfferProvider);
  const setReceiveProvider = useAppStore((state) => state.setReceiveProvider);

  const selectedProvider = side === 'offer' ? offer.provider : receive.provider;
  const setProvider = side === 'offer' ? setOfferProvider : setReceiveProvider;

  const providers: Provider[] =
    side === 'offer'
      ? authMethod === 'copilot'
        ? ['github-copilot']
        : ['openai', 'anthropic', 'gemini']
      : ['openai', 'anthropic', 'gemini', 'github-copilot'];

  return (
    <div className="provider-grid" data-testid={setupTestIds.providerGrid(side)}>
      {providers.map((provider) => (
        <button
          type="button"
          key={provider}
          className={`provider-btn ${selectedProvider === provider ? 'selected' : ''}`}
          data-testid={setupTestIds.providerCard(side, provider)}
          data-provider={provider}
          data-selected={selectedProvider === provider ? 'true' : 'false'}
          aria-pressed={selectedProvider === provider}
          onClick={() => setProvider(provider)}
        >
          <div className={`provider-icon ${getProviderCssClass(provider)}`}>
            {provider === 'github-copilot' ? <CopilotIcon /> : getProviderIconLetter(provider)}
          </div>
          <div className="provider-info">
            <div className="provider-name">{getProviderDisplayName(provider)}</div>
            <div className="provider-models">{getProviderModelsPreview(provider)}</div>
          </div>
          <div className="provider-check" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}
