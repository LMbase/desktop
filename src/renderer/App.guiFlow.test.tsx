import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from '@shared/contracts/session';
import { App } from './App';
import { sessionTestIds, setupTestIds } from './lib/testIds';
import { useAppStore } from './store/appStore';

const MODEL_FIXTURES = {
  openai: ['gpt-4o', 'gpt-4.1-mini'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  'github-copilot': ['copilot-chat', 'copilot-suggestions'],
} as const;

describe('App GUI flow', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    vi.clearAllMocks();

    vi.mocked(window.lmbase.session.getSnapshot).mockResolvedValue(null);
    vi.mocked(window.lmbase.session.onActivityLog).mockReturnValue(() => undefined);
    vi.mocked(window.lmbase.providers.validateKey).mockResolvedValue({ valid: true, message: 'OK' });
    vi.mocked(window.lmbase.providers.fetchModels).mockImplementation(async ({ provider }) => ({
      models: MODEL_FIXTURES[provider as keyof typeof MODEL_FIXTURES] ?? [],
      message: 'OK',
    }));

    window.lmbase.providers.estimateExchange = vi.fn(async (request) => ({
      estimatedReceivedTokens:
        request.offeredTokens ?? (request.offeredInputTokens ?? 0) + (request.offeredOutputTokens ?? 0),
      message: 'OK',
    }));
  });

  it('completes a setup flow using stable test IDs and transitions to session view', async () => {
    let emitSessionUpdate: ((snapshot: SessionSnapshot | null) => void) | null = null;

    vi.mocked(window.lmbase.session.onSessionUpdate).mockImplementation((listener) => {
      emitSessionUpdate = listener;
      return () => undefined;
    });

    vi.mocked(window.lmbase.session.start).mockImplementation(async (config) => {
      emitSessionUpdate?.({
        status: 'paired',
        config: {
          ...config,
          proxyPort: config.proxyPort || 9100,
          proxyUrl: 'https://proxy.gui-flow.test',
        },
        pairing: {
          offerId: 'gui-flow-offer',
          tempKey: 'temp-key',
          proxyKey: 'proxy-key',
          peerUrl: 'https://peer.gui-flow.test',
          peerProvider: config.wantProvider,
          peerModel: config.wantModel,
          tokensGranted: config.tokensOffered,
          tokensToServe: config.tokensOffered,
          inputTokensGranted: config.inputTokensOffered,
          outputTokensGranted: config.outputTokensOffered,
          inputTokensToServe: config.inputTokensOffered,
          outputTokensToServe: config.outputTokensOffered,
          advanced: config.advanced,
        },
        tokensGrantedDone: 0,
        tokensToServeDone: 0,
        inputTokensGrantedDone: 0,
        outputTokensGrantedDone: 0,
        inputTokensToServeDone: 0,
        outputTokensToServeDone: 0,
        connectedAt: Date.now(),
      });

      return { success: true };
    });

    render(<App />);

    const user = userEvent.setup();

    await expect(screen.getByTestId(setupTestIds.page)).toBeInTheDocument();

    await user.click(screen.getByTestId(setupTestIds.providerCard('offer', 'openai')));
    await user.type(screen.getByTestId(setupTestIds.apiKeyInput), 'sk-test-valid-key');
    await user.clear(screen.getByTestId(setupTestIds.tokenAmountInput));
    await user.type(screen.getByTestId(setupTestIds.tokenAmountInput), '1000');

    await waitFor(() => expect(screen.getByTestId(setupTestIds.modelStatus('offer'))).toBeInTheDocument());
    await user.selectOptions(screen.getByTestId(setupTestIds.modelSelect('offer')), 'gpt-4o');

    await user.click(screen.getByTestId(setupTestIds.providerCard('receive', 'anthropic')));
    await waitFor(() => expect(screen.getByTestId(setupTestIds.modelStatus('receive'))).toBeInTheDocument());
    await user.selectOptions(
      screen.getByTestId(setupTestIds.modelSelect('receive')),
      'claude-3-5-sonnet-20241022'
    );

    await user.click(screen.getByTestId(setupTestIds.findMatchButton));

    await waitFor(() => expect(screen.getByTestId(sessionTestIds.page)).toBeInTheDocument());
    expect(screen.getByTestId(sessionTestIds.websocketStatus)).toHaveTextContent('Connected');
    expect(screen.getByTestId(sessionTestIds.tunnelStatus)).toHaveTextContent('https://peer.gui-flow.test');
  });
});
