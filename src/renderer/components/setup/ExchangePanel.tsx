import React from 'react';
import { ProviderCardGrid } from './ProviderCardGrid';
import { ModelSelect } from './ModelSelect';
import { TokenBudgetSection } from './TokenBudgetSection';
import { ReceiveSummary } from './CalculationDisplay';
import { AuthMethodSection } from './AuthMethodSection';
import { ConnectionActions } from './ConnectionActions';
import { useAppStore } from '../../store/appStore';
import { setupTestIds } from '../../lib/testIds';

export function ExchangePanel() {
  const authMethod = useAppStore((state) => state.authMethod);
  const offerProvider = useAppStore((state) => state.offer.provider);
  const apiKey = useAppStore((state) => state.apiKey);
  const copilotStatus = useAppStore((state) => state.copilotAuth.status);

  const offerAuthReady = authMethod === 'api_key' ? apiKey.trim().length > 0 : copilotStatus === 'success';

  return (
    <div className="exchange-layout">
      <div className="exchange-panel animate-slide-right" data-testid={setupTestIds.panel('offer')}>
        <div className="panel-header stagger-1">
          <div className="panel-label">Your Offer</div>
          <h1 className="panel-title offer">What are you sharing?</h1>
        </div>

        <div className="form-group stagger-2">
          <AuthMethodSection mode="selector" />
        </div>

        <div className="form-group stagger-3">
          <label className="form-label">Provider</label>
          <ProviderCardGrid side="offer" />
        </div>

        {offerProvider && <div className="stagger-4"><AuthMethodSection mode="credentials" /></div>}

        {offerProvider && offerAuthReady && <div className="stagger-5"><ModelSelect side="offer" /></div>}

        <div className="stagger-6">
          <TokenBudgetSection />
        </div>

        <div className="stagger-7">
          <ConnectionActions />
        </div>
      </div>

      <div className="swap-divider animate-scale-in">
        <div className="swap-icon-wrapper glow-pulse">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 10h14l-4-4" />
            <path d="M17 14H3l4 4" />
          </svg>
        </div>
      </div>

      <div className="exchange-panel receive-panel animate-slide-left" data-testid={setupTestIds.panel('receive')}>
        <div className="panel-header stagger-1">
          <div className="panel-label">You Receive</div>
          <h1 className="panel-title receive">What do you need?</h1>
        </div>

        <div className="form-group stagger-2">
          <label className="form-label">Provider</label>
          <ProviderCardGrid side="receive" />
        </div>

        <div className="stagger-3">
          <ModelSelect side="receive" />
        </div>

        <div className="stagger-4">
          <ReceiveSummary />
        </div>
      </div>
    </div>
  );
}
