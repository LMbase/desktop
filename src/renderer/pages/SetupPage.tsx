import React from 'react';
import { ExchangePanel } from '../components/setup/ExchangePanel';
import '../styles/tokens.css';
import '../styles/global.css';
import '../styles/components.css';

export function SetupPage() {
  return (
    <div className="screen active">
      <ExchangePanel />
    </div>
  );
}
