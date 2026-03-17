import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelSelect } from './ModelSelect';

const fetchLatest = vi.fn(async () => undefined);
const setOfferModel = vi.fn();
const setReceiveModel = vi.fn();
const mockState = {
  offer: { provider: 'openai', model: '', tokens: 1000, inputTokens: 0, outputTokens: 0, advanced: false },
  receive: { provider: 'anthropic', model: '' },
  errors: [],
  authMethod: 'api_key',
  apiKey: 'sk-test',
};

vi.mock('../../hooks/useAvailableModels', () => ({
  useAvailableModels: vi.fn(() => ({
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex' },
    ],
    isLoading: false,
    isRefreshing: false,
    error: null,
    status: 'Loaded 1 server-supported models',
    source: 'supported',
    refetch: vi.fn(),
    fetchLatest,
  })),
}));

vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => selector({
    ...mockState,
    setOfferModel,
    setReceiveModel,
  })),
}));

describe('ModelSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.offer = { provider: 'openai', model: '', tokens: 1000, inputTokens: 0, outputTokens: 0, advanced: false };
    mockState.receive = { provider: 'anthropic', model: '' };
  });

  it('shows fetch latest button only on offer side', () => {
    const { rerender } = render(<ModelSelect side="offer" />);
    expect(screen.getByRole('button', { name: /fetch latest models/i })).toBeInTheDocument();

    rerender(<ModelSelect side="receive" />);
    expect(screen.queryByRole('button', { name: /fetch latest models/i })).toBeNull();
  });

  it('triggers live model fetch from offer side', async () => {
    render(<ModelSelect side="offer" />);
    fireEvent.click(screen.getByRole('button', { name: /fetch latest models/i }));
    await waitFor(() => expect(fetchLatest).toHaveBeenCalledWith('sk-test'));
  });

  it('filters out the same model when both sides use the same provider', () => {
    mockState.offer.provider = 'openai';
    mockState.receive = { provider: 'openai', model: 'gpt-5.3-codex' };

    render(<ModelSelect side="offer" />);

    expect(screen.queryByRole('option', { name: 'GPT-5.3 Codex' })).toBeNull();
    expect(screen.getByRole('option', { name: 'GPT-4o' })).toBeInTheDocument();
  });

  it('clears the selected model when it becomes the same provider-model pair', () => {
    mockState.offer = {
      provider: 'openai',
      model: 'gpt-5.3-codex',
      tokens: 1000,
      inputTokens: 0,
      outputTokens: 0,
      advanced: false,
    };
    mockState.receive = { provider: 'openai', model: 'gpt-5.3-codex' };

    render(<ModelSelect side="offer" />);

    expect(setOfferModel).toHaveBeenCalledWith('');
  });

  it('keeps the selected model when the other side uses a different model', () => {
    mockState.offer = {
      provider: 'openai',
      model: 'gpt-5.3-codex',
      tokens: 1000,
      inputTokens: 0,
      outputTokens: 0,
      advanced: false,
    };
    mockState.receive = { provider: 'openai', model: 'gpt-4o' };

    render(<ModelSelect side="offer" />);

    expect(setOfferModel).not.toHaveBeenCalledWith('');
    expect(screen.getByRole('option', { name: 'GPT-5.3 Codex' })).toBeInTheDocument();
  });
});
