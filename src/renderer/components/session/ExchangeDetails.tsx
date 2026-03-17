import type { SessionSnapshot } from '@shared/contracts/session';
import './ExchangeDetails.css';

interface ExchangeDetailsProps {
  session: SessionSnapshot;
}

export function ExchangeDetails({ session }: ExchangeDetailsProps) {
  const config = session.config;
  const pairing = session.pairing;

  if (!config) {
    return null;
  }

  const showPeerInfo = Boolean(pairing);

  return (
    <div className="exchange-details">
      <div className="exchange-section-title">Exchange Details</div>
      
      <div className="exchange-grid">
        {/* Your Offer */}
        <div className="exchange-card offer">
          <div className="exchange-card-header">
            <span className="exchange-label">You Share</span>
            <span className="exchange-badge share">Offering</span>
          </div>
          
          <div className="exchange-provider">
            <span className={`provider-icon ${config.provider}`} />
            <span className="provider-name">{formatProvider(config.provider)}</span>
          </div>
          
          <div className="exchange-model">{config.model}</div>
          
          <div className="exchange-tokens">
            {config.advanced ? (
              <div className="token-breakdown">
                <div className="token-row">
                  <span className="token-label">Input:</span>
                  <span className="token-value">{config.inputTokensOffered.toLocaleString()}</span>
                </div>
                <div className="token-row">
                  <span className="token-label">Output:</span>
                  <span className="token-value">{config.outputTokensOffered.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="token-total">
                <span className="token-value">{config.tokensOffered.toLocaleString()}</span>
                <span className="token-unit">tokens</span>
              </div>
            )}
          </div>
        </div>

        {/* Exchange Arrow */}
        <div className="exchange-arrow">
          <div className="arrow-line" />
          <div className="arrow-icon">⇄</div>
          <div className="arrow-line" />
        </div>

        {/* Your Request */}
        <div className="exchange-card request">
          <div className="exchange-card-header">
            <span className="exchange-label">You Receive</span>
            <span className="exchange-badge receive">Requesting</span>
          </div>
          
          <div className="exchange-provider">
            <span className={`provider-icon ${config.wantProvider}`} />
            <span className="provider-name">{formatProvider(config.wantProvider)}</span>
          </div>
          
          <div className="exchange-model">{config.wantModel}</div>
          
          {showPeerInfo && (
            <div className="exchange-peer-info">
              <div className="peer-available">
                <span className="peer-icon">✓</span>
                <span className="peer-text">Available from peer</span>
              </div>
              <div className="peer-tokens">
                {pairing!.advanced ? (
                  <div className="token-breakdown">
                    <div className="token-row">
                      <span className="token-label">Input:</span>
                      <span className="token-value">{pairing!.inputTokensGranted.toLocaleString()}</span>
                    </div>
                    <div className="token-row">
                      <span className="token-label">Output:</span>
                      <span className="token-value">{pairing!.outputTokensGranted.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="token-total">
                    <span className="token-value">{pairing!.tokensGranted.toLocaleString()}</span>
                    <span className="token-unit">tokens granted</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatProvider(provider: string): string {
  const providerNames: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Gemini',
    'github-copilot': 'Copilot',
  };
  return providerNames[provider] || provider;
}
