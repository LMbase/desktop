import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExchangePanel } from './ExchangePanel';

const useAppStoreMock = vi.fn();

vi.mock('../../store/appStore', () => ({
  useAppStore: (selector: (state: unknown) => unknown) => useAppStoreMock(selector),
}));

vi.mock('./ProviderCardGrid', () => ({
  ProviderCardGrid: ({ side }: { side: 'offer' | 'receive' }) => <div>{side}-providers</div>,
}));

vi.mock('./ModelSelect', () => ({
  ModelSelect: ({ side }: { side: 'offer' | 'receive' }) => <div>{side}-models</div>,
}));

vi.mock('./TokenBudgetSection', () => ({
  TokenBudgetSection: () => <div>token-budget</div>,
}));

vi.mock('./CalculationDisplay', () => ({
  ReceiveSummary: () => <div>receive-summary</div>,
}));

vi.mock('./AuthMethodSection', () => ({
  AuthMethodSection: ({ mode = 'credentials' }: { mode?: 'selector' | 'credentials' }) => <div>{`auth-${mode}`}</div>,
}));

vi.mock('./ConnectionActions', () => ({
  ConnectionActions: () => <div>connection-actions</div>,
}));

function mockState(partial?: Record<string, unknown>) {
  const state = {
    authMethod: 'api_key',
    apiKey: '',
    offer: { provider: null, model: '', tokens: 10000, inputTokens: 7000, outputTokens: 3000, advanced: false },
    receive: { provider: null, model: '' },
    copilotAuth: { status: 'idle', deviceCode: '', userCode: '', verificationUri: '', error: '' },
    ...partial,
  };

  useAppStoreMock.mockImplementation((selector: (value: typeof state) => unknown) => selector(state));
}

describe('ExchangePanel', () => {
  it('shows auth selector above offer provider selection', () => {
    mockState();
    render(<ExchangePanel />);

    const authSelector = screen.getByText('auth-selector');
    const offerProviders = screen.getByText('offer-providers');
    expect(authSelector.compareDocumentPosition(offerProviders) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows credentials after offer provider is selected', () => {
    mockState({ offer: { provider: 'openai', model: '', tokens: 10000, inputTokens: 7000, outputTokens: 3000, advanced: false } });
    render(<ExchangePanel />);

    expect(screen.getByText('auth-credentials')).toBeInTheDocument();
  });

  it('hides offer models until api key is entered', () => {
    mockState({ offer: { provider: 'openai', model: '', tokens: 10000, inputTokens: 7000, outputTokens: 3000, advanced: false }, apiKey: '' });
    render(<ExchangePanel />);

    expect(screen.queryByText('offer-models')).toBeNull();
    expect(screen.getByText('receive-models')).toBeInTheDocument();
  });

  it('shows offer models after api key is entered', () => {
    mockState({ offer: { provider: 'openai', model: '', tokens: 10000, inputTokens: 7000, outputTokens: 3000, advanced: false }, apiKey: 'sk-test-valid-key' });
    render(<ExchangePanel />);

    expect(screen.getByText('offer-models')).toBeInTheDocument();
  });

  it('shows offer models after oauth succeeds', () => {
    mockState({ authMethod: 'copilot', offer: { provider: 'github-copilot', model: '', tokens: 10000, inputTokens: 7000, outputTokens: 3000, advanced: false }, copilotAuth: { status: 'success', deviceCode: '', userCode: '', verificationUri: '', error: '' } });
    render(<ExchangePanel />);

    expect(screen.getByText('offer-models')).toBeInTheDocument();
  });
});
