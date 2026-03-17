import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderCardGrid } from './ProviderCardGrid';

const mockSetOfferProvider = vi.fn();
const mockSetReceiveProvider = vi.fn();

vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      offer: { provider: null, model: '' },
      receive: { provider: null, model: '' },
      authMethod: 'api_key',
      setOfferProvider: mockSetOfferProvider,
      setReceiveProvider: mockSetReceiveProvider,
    };
    
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  }),
}));

describe('ProviderCardGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all four providers', () => {
    render(<ProviderCardGrid side="receive" />);
    
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('Gemini')).toBeInTheDocument();
    expect(screen.getByText('Copilot')).toBeInTheDocument();
  });

  it('should call setOfferProvider when provider clicked on offer side', () => {
    render(<ProviderCardGrid side="offer" />);
    
    fireEvent.click(screen.getByText('OpenAI').closest('button')!);
    
    expect(mockSetOfferProvider).toHaveBeenCalledWith('openai');
  });

  it('should call setReceiveProvider when provider clicked on receive side', () => {
    render(<ProviderCardGrid side="receive" />);
    
    fireEvent.click(screen.getByText('Anthropic').closest('button')!);
    
    expect(mockSetReceiveProvider).toHaveBeenCalledWith('anthropic');
  });

  it('should show selected state for selected provider', () => {
    vi.mock('../../store/appStore', () => ({
      useAppStore: vi.fn((selector) => {
        const state = {
          offer: { provider: 'openai', model: '' },
          receive: { provider: null, model: '' },
          authMethod: 'api_key',
          setOfferProvider: mockSetOfferProvider,
          setReceiveProvider: mockSetReceiveProvider,
        };
        
        if (typeof selector === 'function') {
          return selector(state);
        }
        return state;
      }),
    }));

    render(<ProviderCardGrid side="offer" />);
    
    const openaiButton = screen.getByText('OpenAI').closest('button')!;
    expect(openaiButton).toHaveClass('selected');
  });

  it('shows only API key providers on offer side for api_key auth', () => {
    render(<ProviderCardGrid side="offer" />);

    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('Gemini')).toBeInTheDocument();
    expect(screen.queryByText('Copilot')).toBeNull();
  });

  it('renders Copilot icon image for github-copilot provider', () => {
    render(<ProviderCardGrid side="receive" />);
    
    const copilotButton = screen.getByText('Copilot').closest('button')!;
    const copilotIcon = copilotButton.querySelector('.provider-icon img');
    
    expect(copilotIcon).toBeInTheDocument();
    expect(copilotIcon?.tagName.toLowerCase()).toBe('img');
    expect(copilotIcon?.getAttribute('src')).toContain('github-copilot.jpg');
  });

  it('renders letter icons for non-Copilot providers', () => {
    render(<ProviderCardGrid side="receive" />);
    
    const openaiButton = screen.getByText('OpenAI').closest('button')!;
    const openaiIcon = openaiButton.querySelector('.provider-icon');
    
    expect(openaiIcon?.textContent).toBe('O');
    expect(openaiIcon?.querySelector('img')).toBeNull();
    
    const anthropicButton = screen.getByText('Anthropic').closest('button')!;
    const anthropicIcon = anthropicButton.querySelector('.provider-icon');
    
    expect(anthropicIcon?.textContent).toBe('A');
    expect(anthropicIcon?.querySelector('img')).toBeNull();
  });

  it('Copilot icon has correct CSS class', () => {
    render(<ProviderCardGrid side="receive" />);
    
    const copilotButton = screen.getByText('Copilot').closest('button')!;
    const copilotIcon = copilotButton.querySelector('.provider-icon');
    
    expect(copilotIcon).toHaveClass('copilot');
  });
});
