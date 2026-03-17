import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionStatusColumn } from './ConnectionStatusColumn';
import type { SessionSnapshot } from '@shared/contracts/session';

const mockSession: SessionSnapshot = {
  status: 'paired',
  config: {
    provider: 'openai',
    model: 'gpt-4',
    tokensOffered: 10000,
    wantProvider: 'anthropic',
    wantModel: 'claude-3-5-sonnet-20241022',
    apiKey: 'test-key',
    authMethod: 'api_key',
    githubToken: '',
    inputTokensOffered: 7000,
    outputTokensOffered: 3000,
    advanced: false,
    proxyPort: 9100,
    proxyUrl: '',
  },
  pairing: {
    offerId: 'test-offer-id-12345',
    tempKey: 'temp-key',
    proxyKey: 'proxy-key-abc123xyz',
    peerUrl: 'https://tokenhub.ngrok.io',
    peerProvider: 'anthropic',
    peerModel: 'claude-3-5-sonnet-20241022',
    tokensGranted: 8333,
    tokensToServe: 10000,
    inputTokensGranted: 5833,
    outputTokensGranted: 2500,
    inputTokensToServe: 7000,
    outputTokensToServe: 3000,
    advanced: false,
  },
  tokensGrantedDone: 3850,
  tokensToServeDone: 4250,
  inputTokensGrantedDone: 2695,
  outputTokensGrantedDone: 1155,
  inputTokensToServeDone: 2975,
  outputTokensToServeDone: 1275,
  connectedAt: Date.now() - 2535000,
};

describe('ConnectionStatusColumn', () => {
  const mockOnDisconnect = vi.fn();

  beforeEach(() => {
    mockOnDisconnect.mockClear();
  });

  it('renders connection status correctly', () => {
    render(
      <ConnectionStatusColumn
        session={mockSession}
        onDisconnect={mockOnDisconnect}
        sessionStartTime={mockSession.connectedAt!}
      />
    );

    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('test-offer')).toBeInTheDocument();
  });

  it('displays peer information', () => {
    render(
      <ConnectionStatusColumn
        session={mockSession}
        onDisconnect={mockOnDisconnect}
        sessionStartTime={mockSession.connectedAt!}
      />
    );

    expect(screen.getByText('Your Peer')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('claude-3-5-sonnet-20241022')).toBeInTheDocument();
  });

  it('shows disconnect button', () => {
    render(
      <ConnectionStatusColumn
        session={mockSession}
        onDisconnect={mockOnDisconnect}
        sessionStartTime={mockSession.connectedAt!}
      />
    );

    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
    expect(disconnectBtn).toBeInTheDocument();
  });

  it('requires double-click to disconnect', () => {
    render(
      <ConnectionStatusColumn
        session={mockSession}
        onDisconnect={mockOnDisconnect}
        sessionStartTime={mockSession.connectedAt!}
      />
    );

    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);

    expect(mockOnDisconnect).not.toHaveBeenCalled();
    expect(screen.getByText(/click again/i)).toBeInTheDocument();

    fireEvent.click(disconnectBtn);
    expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
  });

  it('displays session timer', () => {
    const { container } = render(
      <ConnectionStatusColumn
        session={mockSession}
        onDisconnect={mockOnDisconnect}
        sessionStartTime={mockSession.connectedAt!}
      />
    );

    const timerDisplay = container.querySelector('.timer-display');
    expect(timerDisplay).toBeInTheDocument();
    expect(timerDisplay?.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('handles idle session status', () => {
    const idleSession = { ...mockSession, status: 'idle' as const, pairing: null };
    render(
      <ConnectionStatusColumn
        session={idleSession}
        onDisconnect={mockOnDisconnect}
        sessionStartTime={Date.now()}
      />
    );

    expect(screen.getByText('idle')).toBeInTheDocument();
  });
});