import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionActions } from './ConnectionActions';

const setErrors = vi.fn();
const setConnecting = vi.fn();

vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => selector({
    offer: { provider: 'openai', model: 'gpt-4o', tokens: 1000, inputTokens: 0, outputTokens: 0, advanced: false },
    receive: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
    authMethod: 'api_key',
    apiKey: 'sk-test-valid-key',
    copilotAuth: { status: 'idle', deviceCode: '', userCode: '', verificationUri: '', error: '' },
    setErrors,
    setConnecting,
    isConnecting: false,
    errors: [],
  })),
}));

describe('ConnectionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.tokenhub.providers.validateKey).mockResolvedValue({ valid: true, message: 'OK' });
    vi.mocked(window.tokenhub.session.start).mockResolvedValue({ success: true });
  });

  it('validates key before starting session', async () => {
    render(<ConnectionActions />);
    fireEvent.click(screen.getByRole('button', { name: /find match/i }));

    await waitFor(() => expect(window.tokenhub.providers.validateKey).toHaveBeenCalled());
    expect(window.tokenhub.session.start).toHaveBeenCalled();
  });

  it('stops when provider validation fails', async () => {
    vi.mocked(window.tokenhub.providers.validateKey).mockResolvedValue({ valid: false, message: 'Invalid API key' });

    render(<ConnectionActions />);
    fireEvent.click(screen.getByRole('button', { name: /find match/i }));

    await waitFor(() => expect(setErrors).toHaveBeenCalledWith([{ field: 'apiKey', message: 'Invalid API key' }]));
    expect(window.tokenhub.session.start).not.toHaveBeenCalled();
  });
});
