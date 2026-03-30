import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CopilotStatusEvent } from '@shared/contracts/ipc';
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
      models: [...(MODEL_FIXTURES[provider as keyof typeof MODEL_FIXTURES] ?? [])],
      message: 'OK',
    }));
    vi.mocked(window.lmbase.auth.startCopilotAuth).mockResolvedValue({
      deviceCode: 'device-code-123',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
    });
    vi.mocked(window.lmbase.auth.onCopilotStatus).mockReturnValue(() => undefined);

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

  it('renders a fallback alert when the preload bridge is unavailable', () => {
    const originalLmbase = window.lmbase;

    Reflect.set(window, 'lmbase', undefined);

    try {
      render(<App />);

      expect(screen.getByRole('alert').textContent).toBe(
        'LMbase failed to initialize the desktop bridge. Restart the app.'
      );
    } finally {
      Reflect.set(window, 'lmbase', originalLmbase);
    }
  });

  it('keeps provider selection isolated between offer and receive panes', async () => {
    render(<App />);

    const user = userEvent.setup();

    const offerOpenAI = screen.getByTestId(setupTestIds.providerCard('offer', 'openai'));
    const offerAnthropic = screen.getByTestId(setupTestIds.providerCard('offer', 'anthropic'));
    const offerGemini = screen.getByTestId(setupTestIds.providerCard('offer', 'gemini'));
    const receiveOpenAI = screen.getByTestId(setupTestIds.providerCard('receive', 'openai'));
    const receiveAnthropic = screen.getByTestId(setupTestIds.providerCard('receive', 'anthropic'));
    const receiveGemini = screen.getByTestId(setupTestIds.providerCard('receive', 'gemini'));

    await user.click(offerOpenAI);

    expect(offerOpenAI).toHaveAttribute('data-selected', 'true');
    expect(offerAnthropic).toHaveAttribute('data-selected', 'false');
    expect(offerGemini).toHaveAttribute('data-selected', 'false');
    expect(receiveOpenAI).toHaveAttribute('data-selected', 'false');
    expect(receiveAnthropic).toHaveAttribute('data-selected', 'false');
    expect(receiveGemini).toHaveAttribute('data-selected', 'false');
    expect(useAppStore.getState().offer.provider).toBe('openai');
    expect(useAppStore.getState().receive.provider).toBeNull();

    await user.click(receiveAnthropic);

    expect(offerOpenAI).toHaveAttribute('data-selected', 'true');
    expect(offerAnthropic).toHaveAttribute('data-selected', 'false');
    expect(offerGemini).toHaveAttribute('data-selected', 'false');
    expect(receiveOpenAI).toHaveAttribute('data-selected', 'false');
    expect(receiveAnthropic).toHaveAttribute('data-selected', 'true');
    expect(receiveGemini).toHaveAttribute('data-selected', 'false');
    expect(useAppStore.getState().offer.provider).toBe('openai');
    expect(useAppStore.getState().receive.provider).toBe('anthropic');

    await user.click(offerGemini);

    expect(offerOpenAI).toHaveAttribute('data-selected', 'false');
    expect(offerAnthropic).toHaveAttribute('data-selected', 'false');
    expect(offerGemini).toHaveAttribute('data-selected', 'true');
    expect(receiveOpenAI).toHaveAttribute('data-selected', 'false');
    expect(receiveAnthropic).toHaveAttribute('data-selected', 'true');
    expect(receiveGemini).toHaveAttribute('data-selected', 'false');
    expect(useAppStore.getState().offer.provider).toBe('gemini');
    expect(useAppStore.getState().receive.provider).toBe('anthropic');
  });

  it('switches between API key and OAuth modes while preserving the API key and resetting incompatible offer providers', async () => {
    render(<App />);

    const user = userEvent.setup();

    await user.click(screen.getByTestId(setupTestIds.providerCard('offer', 'openai')));
    await user.type(screen.getByTestId(setupTestIds.apiKeyInput), 'sk-test-valid-key');

    await waitFor(() => expect(screen.getByTestId(setupTestIds.modelSelect('offer'))).toBeInTheDocument());

    await user.click(screen.getByTestId(setupTestIds.authMethodTab('copilot')));

    expect(screen.queryByTestId(setupTestIds.apiKeyInput)).not.toBeInTheDocument();
    expect(screen.queryByTestId(setupTestIds.providerCard('offer', 'openai'))).not.toBeInTheDocument();
    expect(screen.getByTestId(setupTestIds.providerCard('offer', 'github-copilot'))).toBeInTheDocument();
    expect(screen.queryByTestId(setupTestIds.authCredentials)).not.toBeInTheDocument();
    expect(screen.queryByTestId(setupTestIds.modelSelect('offer'))).not.toBeInTheDocument();

    await user.click(screen.getByTestId(setupTestIds.providerCard('offer', 'github-copilot')));

    expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeInTheDocument();
    expect(screen.queryByTestId(setupTestIds.modelSelect('offer'))).not.toBeInTheDocument();

    await user.click(screen.getByTestId(setupTestIds.authMethodTab('api_key')));

    expect(screen.queryByTestId(setupTestIds.providerCard('offer', 'github-copilot'))).not.toBeInTheDocument();
    expect(screen.getByTestId(setupTestIds.providerCard('offer', 'openai'))).toBeInTheDocument();
    expect(screen.queryByTestId(setupTestIds.authCredentials)).not.toBeInTheDocument();

    await user.click(screen.getByTestId(setupTestIds.providerCard('offer', 'openai')));

    expect(screen.getByTestId(setupTestIds.apiKeyInput)).toHaveValue('sk-test-valid-key');
    await waitFor(() => expect(screen.getByTestId(setupTestIds.modelSelect('offer'))).toBeInTheDocument());
  });

  it('requires a fresh OAuth login after leaving copilot mode', async () => {
    let emitCopilotStatus: ((event: CopilotStatusEvent) => void) | null = null;

    vi.mocked(window.lmbase.auth.onCopilotStatus).mockImplementation((listener) => {
      emitCopilotStatus = listener;
      return () => {
        if (emitCopilotStatus === listener) {
          emitCopilotStatus = null;
        }
      };
    });

    render(<App />);

    const user = userEvent.setup();

    await user.click(screen.getByTestId(setupTestIds.authMethodTab('copilot')));
    await user.click(screen.getByTestId(setupTestIds.providerCard('offer', 'github-copilot')));
    await user.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));

    await waitFor(() => expect(screen.getByText('ABCD-1234')).toBeInTheDocument());
    expect(screen.queryByTestId(setupTestIds.modelSelect('offer'))).not.toBeInTheDocument();

    act(() => {
      emitCopilotStatus?.({ status: 'success', token: 'ghu_test_token' });
    });

    await waitFor(() => expect(screen.getByText('Authenticated successfully')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId(setupTestIds.modelSelect('offer'))).toBeInTheDocument());

    await user.click(screen.getByTestId(setupTestIds.authMethodTab('api_key')));
    await user.click(screen.getByTestId(setupTestIds.authMethodTab('copilot')));
    await user.click(screen.getByTestId(setupTestIds.providerCard('offer', 'github-copilot')));

    expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeInTheDocument();
    expect(screen.queryByText('Authenticated successfully')).not.toBeInTheDocument();
    expect(screen.queryByTestId(setupTestIds.modelSelect('offer'))).not.toBeInTheDocument();
  });

  it('shows cached fallback models when the server-supported model list is unavailable', async () => {
    vi.mocked(window.lmbase.providers.fetchModels).mockImplementation(async ({ provider, apiKey }) => {
      if (provider === 'openai' && !apiKey) {
        return {
          models: [],
          message: 'Server unavailable. Using cached model list.',
        };
      }

      return {
        models: [...(MODEL_FIXTURES[provider as keyof typeof MODEL_FIXTURES] ?? [])],
        message: 'OK',
      };
    });

    render(<App />);

    const user = userEvent.setup();

    await user.click(screen.getByTestId(setupTestIds.providerCard('offer', 'openai')));
    await user.type(screen.getByTestId(setupTestIds.apiKeyInput), 'sk-test-valid-key');

    await waitFor(() =>
      expect(screen.getByTestId(setupTestIds.modelStatus('offer'))).toHaveAttribute('data-source', 'fallback')
    );

    expect(screen.getByTestId(setupTestIds.modelStatus('offer'))).toHaveTextContent(
      'Server unavailable. Using cached model list.'
    );
    expect(screen.getByRole('option', { name: 'GPT-4o' })).toBeInTheDocument();
  });

  it('falls back to the supported model list when a live refresh is unavailable', async () => {
    vi.mocked(window.lmbase.providers.fetchModels).mockImplementation(async ({ provider, apiKey }) => {
      if (provider === 'openai' && apiKey) {
        return {
          models: [],
          message: 'Server unavailable',
        };
      }

      return {
        models: [...(MODEL_FIXTURES[provider as keyof typeof MODEL_FIXTURES] ?? [])],
        message: 'OK',
      };
    });

    render(<App />);

    const user = userEvent.setup();

    await user.click(screen.getByTestId(setupTestIds.providerCard('offer', 'openai')));
    await user.type(screen.getByTestId(setupTestIds.apiKeyInput), 'sk-test-valid-key');

    await waitFor(() =>
      expect(screen.getByTestId(setupTestIds.modelStatus('offer'))).toHaveAttribute('data-source', 'supported')
    );

    await user.click(screen.getByRole('button', { name: /fetch latest models/i }));

    await waitFor(() =>
      expect(screen.getByTestId(setupTestIds.modelError('offer'))).toHaveAttribute('data-source', 'supported')
    );

    expect(screen.getByTestId(setupTestIds.modelError('offer'))).toHaveTextContent(
      'Server unavailable. Using server-supported model list.'
    );
    expect(screen.getByTestId(setupTestIds.modelSelect('offer'))).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'GPT-4o' })).toBeInTheDocument();
  });
});
