import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsageAndCodeColumn } from './UsageAndCodeColumn';
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
    offerId: 'test-offer-id',
    tempKey: 'temp-key',
    proxyKey: 'proxy-key',
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
  connectedAt: Date.now(),
};

describe('UsageAndCodeColumn', () => {
  it('renders both usage cards', () => {
    render(<UsageAndCodeColumn session={mockSession} />);

    expect(screen.getByText('Your API Being Used')).toBeInTheDocument();
    expect(screen.getByText('Peer API You Can Use')).toBeInTheDocument();
  });

  it('displays serving card with correct data', () => {
    render(<UsageAndCodeColumn session={mockSession} />);

    expect(screen.getByText('4,250 used')).toBeInTheDocument();
    expect(screen.getByText('10,000 limit')).toBeInTheDocument();
  });

  it('displays using card with correct data', () => {
    render(<UsageAndCodeColumn session={mockSession} />);

    expect(screen.getByText('3,850 used')).toBeInTheDocument();
    expect(screen.getByText('8,333 limit')).toBeInTheDocument();
  });

  it('renders endpoint code block', () => {
    render(<UsageAndCodeColumn session={mockSession} />);

    expect(screen.getByText(/Copy-ready endpoint/i)).toBeInTheDocument();
  });

  it('handles session without pairing', () => {
    const sessionNoPairing = {
      ...mockSession,
      pairing: null,
    };

    render(<UsageAndCodeColumn session={sessionNoPairing} />);

    expect(screen.getByText('Your API Being Used')).toBeInTheDocument();
    expect(screen.getByText('Peer API You Can Use')).toBeInTheDocument();
    expect(screen.queryByText(/Copy-ready endpoint/i)).not.toBeInTheDocument();
  });

  it('handles session without config', () => {
    const sessionNoConfig = {
      ...mockSession,
      config: null,
      pairing: null,
    };

    render(<UsageAndCodeColumn session={sessionNoConfig} />);

    expect(screen.getByText('Your API Being Used')).toBeInTheDocument();
    expect(screen.queryByText(/Copy-ready endpoint/i)).not.toBeInTheDocument();
  });

  it('does not render endpoint code block before pairing even if proxy URL exists', () => {
    const sessionWaitingForMatch: SessionSnapshot = {
      ...mockSession,
      status: 'connecting',
      pairing: null,
      config: {
        ...mockSession.config,
        proxyUrl: 'https://local-proxy.ngrok-free.dev',
      },
    };

    render(<UsageAndCodeColumn session={sessionWaitingForMatch} />);

    expect(screen.queryByText(/Copy-ready endpoint/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/local-proxy.ngrok-free.dev/i)).not.toBeInTheDocument();
  });
});
