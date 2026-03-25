import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupTestIds } from '../../lib/testIds';
import type {
  AuthMethod,
  CopilotAuthState,
  OfferConfig,
  ReceiveConfig,
  ValidationError,
} from '../../store/appStore';
import { ConnectionActions } from './ConnectionActions';

const setErrors = vi.fn();
const setConnecting = vi.fn();
const mockState: {
  offer: OfferConfig;
  receive: ReceiveConfig;
  authMethod: AuthMethod;
  apiKey: string;
  copilotAuth: CopilotAuthState;
  setErrors: typeof setErrors;
  setConnecting: typeof setConnecting;
  isConnecting: boolean;
  errors: ValidationError[];
} = {
  offer: { provider: 'openai', model: 'gpt-4o', tokens: 1000, inputTokens: 0, outputTokens: 0, advanced: false },
  receive: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  authMethod: 'api_key',
  apiKey: 'sk-test-valid-key',
  copilotAuth: { status: 'idle', deviceCode: '', userCode: '', verificationUri: '', error: '' },
  setErrors,
  setConnecting,
  isConnecting: false,
  errors: [],
};

vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => selector({
    ...mockState,
  })),
}));

describe('ConnectionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.offer = {
      provider: 'openai',
      model: 'gpt-4o',
      tokens: 1000,
      inputTokens: 0,
      outputTokens: 0,
      advanced: false,
    };
    mockState.receive = { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };
    mockState.authMethod = 'api_key';
    mockState.apiKey = 'sk-test-valid-key';
    mockState.copilotAuth = { status: 'idle', deviceCode: '', userCode: '', verificationUri: '', error: '' };
    mockState.isConnecting = false;
    mockState.errors = [];
    vi.mocked(window.lmbase.providers.validateKey).mockResolvedValue({ valid: true, message: 'OK' });
    vi.mocked(window.lmbase.session.start).mockResolvedValue({ success: true });
  });

  it('disables Find Match until the form is submittable', () => {
    mockState.offer.provider = null;
    render(<ConnectionActions />);

    expect(screen.getByTestId(setupTestIds.findMatchButton)).toBeDisabled();
  });

  it('disables Find Match when the offered tokens are below the minimum', () => {
    mockState.offer.tokens = 99;
    render(<ConnectionActions />);

    expect(screen.getByTestId(setupTestIds.findMatchButton)).toBeDisabled();
  });

  it('disables Find Match until both models are selected', () => {
    mockState.receive.model = '';
    render(<ConnectionActions />);

    expect(screen.getByTestId(setupTestIds.findMatchButton)).toBeDisabled();
  });

  it('disables Find Match until an API key is present for API-key auth', () => {
    mockState.apiKey = '';
    render(<ConnectionActions />);

    expect(screen.getByTestId(setupTestIds.findMatchButton)).toBeDisabled();
  });

  it('disables Find Match when the offered and requested provider-model pair is identical', () => {
    mockState.receive = { provider: 'openai', model: 'gpt-4o' };
    render(<ConnectionActions />);

    expect(screen.getByTestId(setupTestIds.findMatchButton)).toBeDisabled();
  });

  it('disables Find Match until Copilot authentication succeeds', () => {
    mockState.authMethod = 'copilot';
    mockState.apiKey = '';
    mockState.copilotAuth = {
      status: 'pending',
      deviceCode: 'device-code',
      userCode: 'user-code',
      verificationUri: 'https://github.com/login/device',
      error: '',
    };
    render(<ConnectionActions />);

    expect(screen.getByTestId(setupTestIds.findMatchButton)).toBeDisabled();
  });

  it('enables Find Match for a complete API-key setup', () => {
    render(<ConnectionActions />);

    expect(screen.getByTestId(setupTestIds.findMatchButton)).toBeEnabled();
  });

  it('validates key before starting session', async () => {
    render(<ConnectionActions />);
    fireEvent.click(screen.getByTestId(setupTestIds.findMatchButton));

    await waitFor(() => {
      expect(window.lmbase.providers.validateKey).toHaveBeenCalled();
      expect(window.lmbase.session.start).toHaveBeenCalled();
    });
  });

  it('stops when provider validation fails', async () => {
    vi.mocked(window.lmbase.providers.validateKey).mockResolvedValue({ valid: false, message: 'Invalid API key' });

    render(<ConnectionActions />);
    fireEvent.click(screen.getByTestId(setupTestIds.findMatchButton));

    await waitFor(() => expect(setErrors).toHaveBeenCalledWith([{ field: 'apiKey', message: 'Invalid API key' }]));
    expect(window.lmbase.session.start).not.toHaveBeenCalled();
  });
});
