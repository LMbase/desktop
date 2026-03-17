import type { Provider } from '@shared/constants';
import { useAppStore } from '../../store/appStore';
import {
  getProviderDisplayName,
  getProviderModelsPreview,
  getProviderIconLetter,
  getProviderCssClass,
} from '../../lib/formMappers';
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
    <div className="provider-grid">
      {providers.map((provider) => (
        <button
          key={provider}
          className={`provider-btn ${selectedProvider === provider ? 'selected' : ''}`}
          onClick={() => setProvider(provider)}
        >
          <div className={`provider-icon ${getProviderCssClass(provider)}`}>
            {provider === 'github-copilot' ? <CopilotIcon /> : getProviderIconLetter(provider)}
          </div>
          <div className="provider-info">
            <div className="provider-name">{getProviderDisplayName(provider)}</div>
            <div className="provider-models">{getProviderModelsPreview(provider)}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
