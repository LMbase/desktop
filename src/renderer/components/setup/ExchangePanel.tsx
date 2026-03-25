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

  const offerAuthReady = authMethod === 'api_key'
    ? apiKey.trim().length > 0
    : copilotStatus === 'success';

  return (
    <div className="exchange-layout">
      {/* Left: You Share */}
      <div
        className="exchange-panel offer animate-in delay-1"
        data-testid={setupTestIds.panel('offer')}
        style={{ opacity: 0 }}
      >
        <div className="panel-header">
          <div className="panel-label offer">You Share</div>
          <h1 className="panel-title offer">What are you sharing?</h1>
        </div>

        <div className="form-group">
          <AuthMethodSection mode="selector" />
        </div>

        <div className="form-group">
          <label className="form-label">Provider</label>
          <ProviderCardGrid side="offer" />
        </div>

        {offerProvider && <AuthMethodSection mode="credentials" />}
        {offerProvider && offerAuthReady && <ModelSelect side="offer" />}

        <TokenBudgetSection />

        <ConnectionActions />
      </div>

      {/* Center: Animated exchange divider */}
      <div className="exchange-divider animate-in delay-2" style={{ opacity: 0 }}>
        <div className="exchange-divider-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </div>
      </div>

      {/* Right: You Receive */}
      <div
        className="exchange-panel receive receive-panel animate-in delay-3"
        data-testid={setupTestIds.panel('receive')}
        style={{ opacity: 0 }}
      >
        <div className="panel-header">
          <div className="panel-label receive">You Receive</div>
          <h1 className="panel-title receive">What do you need?</h1>
        </div>

        <div className="form-group">
          <label className="form-label">Provider</label>
          <ProviderCardGrid side="receive" />
        </div>

        <ModelSelect side="receive" />

        <ReceiveSummary />
      </div>
    </div>
  );
}
