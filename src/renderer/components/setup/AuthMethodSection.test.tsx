import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupTestIds } from '../../lib/testIds';
import { AuthMethodSection } from './AuthMethodSection';

const startAuth = vi.fn();
const cancelAuth = vi.fn();
const openBrowser = vi.fn();

const baseState = {
  authMethod: 'api_key' as const,
  apiKey: '',
  errors: [],
  setAuthMethod: vi.fn(),
  setApiKey: vi.fn(),
};

vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => selector(baseState)),
}));

vi.mock('../../hooks/useCopilotAuth', () => ({
  useCopilotAuth: vi.fn(() => ({
    status: 'idle',
    deviceCode: '',
    userCode: '',
    verificationUri: '',
    error: '',
    startAuth,
    cancelAuth,
    openBrowser,
  })),
}));

describe('AuthMethodSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseState.authMethod = 'api_key';
    baseState.apiKey = '';
    baseState.errors = [];
  });

  it('renders deterministic auth mode selectors', () => {
    render(<AuthMethodSection mode="selector" />);

    expect(screen.getByTestId(setupTestIds.authMethodSelector)).toBeInTheDocument();
    expect(screen.getByTestId(setupTestIds.authMethodTab('api_key'))).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId(setupTestIds.authMethodTab('copilot'))).toHaveAttribute('data-selected', 'false');
  });

  it('renders deterministic API key controls', () => {
    baseState.apiKey = 'sk-test-valid-key';
    render(<AuthMethodSection mode="credentials" />);

    expect(screen.getByTestId(setupTestIds.authCredentials)).toBeInTheDocument();
    expect(screen.getByTestId(setupTestIds.apiKeyInput)).toHaveValue('sk-test-valid-key');
    expect(screen.getByTestId(setupTestIds.apiKeyVisibilityToggle)).toBeInTheDocument();
  });
});
