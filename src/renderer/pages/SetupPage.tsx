import React from 'react';
import { ExchangePanel } from '../components/setup/ExchangePanel';
import { setupTestIds } from '../lib/testIds';
import '../styles/tokens.css';
import '../styles/design-system.css';
import '../styles/global.css';
import '../styles/components.css';

export function SetupPage() {
  return (
    <div className="screen active animate-fade" data-testid={setupTestIds.page}>
      <ExchangePanel />
    </div>
  );
}
