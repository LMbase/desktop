import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionPage } from './SessionPage';
import type { SessionSnapshot } from '@shared/contracts/session';

const mockDisconnect = vi.fn();

const snapshot: SessionSnapshot = {
  status: 'paired',
  config: { provider: 'openai', model: 'gpt-4o', tokensOffered: 1000, wantProvider: 'anthropic', wantModel: 'claude-3-5-sonnet', apiKey: 'x', authMethod: 'api_key', githubToken: '', inputTokensOffered: 0, outputTokensOffered: 0, advanced: false, proxyPort: 9100, proxyUrl: 'https://lmbase.ngrok.io' },
  pairing: { offerId: 'offer-1', tempKey: 'temp', proxyKey: 'proxy', peerUrl: 'https://peer.ngrok.io', peerProvider: 'anthropic', peerModel: 'claude-3-5-sonnet', tokensGranted: 1000, tokensToServe: 1000, inputTokensGranted: 0, outputTokensGranted: 0, inputTokensToServe: 0, outputTokensToServe: 0, advanced: false },
  tokensGrantedDone: 10,
  tokensToServeDone: 20,
  inputTokensGrantedDone: 0,
  outputTokensGrantedDone: 0,
  inputTokensToServeDone: 0,
  outputTokensToServeDone: 0,
  connectedAt: 1,
};

describe('SessionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three-column layout', () => {
    render(<SessionPage snapshot={snapshot} />);

    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('Activity Log')).toBeInTheDocument();
  });

  it('renders status bar', () => {
    render(<SessionPage snapshot={snapshot} />);

    expect(screen.getByText(/Tunnel:/i)).toBeInTheDocument();
    expect(screen.getByText(/Proxy:/i)).toBeInTheDocument();
    expect(screen.getByText(/WebSocket:/i)).toBeInTheDocument();
  });

  it('sets up event listeners on mount', () => {
    render(<SessionPage snapshot={snapshot} />);

    expect(window.lmbase.session.onActivityLog).toHaveBeenCalled();
  });

  it('calls disconnect when triggered', () => {
    render(<SessionPage snapshot={snapshot} />);

    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);
    fireEvent.click(disconnectBtn);

    expect(window.lmbase.session.stop).toHaveBeenCalled();
  });

  it('renders usage cards', () => {
    render(<SessionPage snapshot={snapshot} />);

    expect(screen.getByText('Your API Being Used')).toBeInTheDocument();
    expect(screen.getByText('Peer API You Can Use')).toBeInTheDocument();
  });

  it('renders code block section', () => {
    render(<SessionPage snapshot={snapshot} />);

    expect(screen.getByText(/Copy-ready endpoint/i)).toBeInTheDocument();
  });

  it('does not render code block section while waiting for a match', () => {
    render(
      <SessionPage
        snapshot={{
          ...snapshot,
          status: 'connecting',
          pairing: null,
          config: {
            ...snapshot.config,
            proxyUrl: 'https://unpaired.ngrok-free.dev',
          },
        }}
      />
    );

    expect(screen.queryByText(/Copy-ready endpoint/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
  });

  it('handles missing snapshot gracefully', () => {
    expect(() => {
      render(<SessionPage />);
    }).not.toThrow();
  });
});
