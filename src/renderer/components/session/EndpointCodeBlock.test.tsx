import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EndpointCodeBlock } from './EndpointCodeBlock';
import type { PairingInfo } from '@shared/contracts/session';

const anthropicPairing: PairingInfo = {
  offerId: 'offer-1',
  tempKey: 'temp-key',
  proxyKey: 'th_key_abc123xyz',
  peerUrl: 'https://tokenhub.ngrok.io',
  peerProvider: 'anthropic',
  peerModel: 'claude-3-5-sonnet-20241022',
  tokensGranted: 1000,
  tokensToServe: 1000,
  inputTokensGranted: 0,
  outputTokensGranted: 0,
  inputTokensToServe: 0,
  outputTokensToServe: 0,
  advanced: false,
};

describe('EndpointCodeBlock', () => {
  const mockWriteText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
    mockWriteText.mockClear();
  });

  it('renders code block with endpoint info', () => {
    render(<EndpointCodeBlock pairing={anthropicPairing} />);

    expect(screen.getByText(/Copy-ready endpoint/i)).toBeInTheDocument();
    expect(screen.getByText(/tokenhub.ngrok.io/i)).toBeInTheDocument();
    expect(screen.getByText(/th_key_abc123xyz/i)).toBeInTheDocument();
    expect(screen.getByText(/claude-3-5-sonnet-20241022/i)).toBeInTheDocument();
    expect(screen.getByText(/v1\/messages/i)).toBeInTheDocument();
  });

  it('renders copy button', () => {
    render(<EndpointCodeBlock pairing={anthropicPairing} />);

    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('copies code to clipboard when clicked', async () => {
    render(<EndpointCodeBlock pairing={anthropicPairing} />);

    const copyBtn = screen.getByRole('button', { name: /copy/i });
    
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(mockWriteText).toHaveBeenCalledTimes(1);
    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('import requests'));
  });

  it('shows copied state after click', async () => {
    render(<EndpointCodeBlock pairing={anthropicPairing} />);

    const copyBtn = screen.getByRole('button', { name: /copy/i });
    
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    const button = screen.getByRole('button');
    expect(button.textContent).toMatch(/copied!/i);
  });

  it('renders provider-specific OpenAI route instead of the anthropic route', () => {
    render(
      <EndpointCodeBlock
        pairing={{
          ...anthropicPairing,
          peerProvider: 'openai',
          peerModel: 'gpt-4o',
        }}
      />
    );

    expect(screen.getByText(/v1\/chat\/completions/i)).toBeInTheDocument();
    expect(screen.queryByText(/v1\/messages/i)).not.toBeInTheDocument();
  });
});
