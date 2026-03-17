import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReceiveSummary } from './CalculationDisplay';

vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn(),
}));

import { useAppStore } from '../../store/appStore';

const estimateExchangeMock = vi.fn();

beforeEach(() => {
  estimateExchangeMock.mockReset();
  estimateExchangeMock.mockResolvedValue({ estimatedReceivedTokens: 7600, message: 'OK' });
  const globalWindow = window as unknown as {
    lmbase?: {
      providers?: {
        estimateExchange?: typeof estimateExchangeMock;
      };
    };
  };
  globalWindow.lmbase ??= {};
  globalWindow.lmbase.providers ??= {};
  globalWindow.lmbase.providers.estimateExchange = estimateExchangeMock;
});

describe('ReceiveSummary', () => {
  it('should display backend-estimated received tokens', async () => {
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        offer: {
          provider: 'openai',
          model: 'gpt-4.1',
          tokens: 10000,
          inputTokens: 0,
          outputTokens: 0,
          advanced: false,
        },
        receive: { provider: 'anthropic', model: 'claude-opus-4-6' },
      };
      return typeof selector === 'function' ? selector(state) : state;
    });

    render(<ReceiveSummary />);

    await waitFor(() => {
      const estimateValues = screen.getAllByText('7,600');
      expect(estimateValues.length).toBeGreaterThan(0);
    });
    expect(estimateExchangeMock).toHaveBeenCalled();
    expect(screen.getByText("tokens you'll receive")).toBeInTheDocument();
  });

  it('should display token breakdown', () => {
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        offer: { provider: 'openai', model: 'gpt-4.1', tokens: 10000, inputTokens: 0, outputTokens: 0, advanced: false },
        receive: { provider: null, model: '' },
      };
      return typeof selector === 'function' ? selector(state) : state;
    });

    render(<ReceiveSummary />);

    expect(screen.getByText('Your tokens')).toBeInTheDocument();
    const tokenValues = screen.getAllByText('10,000');
    expect(tokenValues.length).toBeGreaterThan(0);
    const receiveLabels = screen.getAllByText('You receive');
    expect(receiveLabels.length).toBeGreaterThan(0);
  });

  it('should show fair exchange indicator when provider and model selected', async () => {
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        offer: { provider: 'openai', model: 'gpt-4.1', tokens: 10000, inputTokens: 0, outputTokens: 0, advanced: false },
        receive: { provider: 'anthropic', model: 'claude-3-5-sonnet' },
      };
      return typeof selector === 'function' ? selector(state) : state;
    });

    render(<ReceiveSummary />);

    expect(screen.getByText('Fair exchange')).toBeInTheDocument();
    await waitFor(() => {
      expect(estimateExchangeMock).toHaveBeenCalled();
    });
  });

  it('should not show fair exchange indicator when not fully selected', () => {
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        offer: { provider: 'openai', model: 'gpt-4.1', tokens: 10000, inputTokens: 0, outputTokens: 0, advanced: false },
        receive: { provider: null, model: '' },
      };
      return typeof selector === 'function' ? selector(state) : state;
    });

    render(<ReceiveSummary />);

    expect(screen.queryByText('Fair exchange')).not.toBeInTheDocument();
  });
});
