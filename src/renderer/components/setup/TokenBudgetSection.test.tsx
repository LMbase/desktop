import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TokenBudgetSection } from './TokenBudgetSection';

vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn(),
}));

import { useAppStore } from '../../store/appStore';

describe('TokenBudgetSection', () => {
  const mockSetOfferTokens = vi.fn();
  const mockSetOfferInputTokens = vi.fn();
  const mockSetOfferOutputTokens = vi.fn();
  const mockToggleAdvanced = vi.fn();

  const createMockStore = (overrides = {}) => {
    const defaultState = {
      offer: {
        tokens: 10000,
        inputTokens: 7000,
        outputTokens: 3000,
        advanced: false,
      },
      showAdvanced: false,
      errors: [],
      setOfferTokens: mockSetOfferTokens,
      setOfferInputTokens: mockSetOfferInputTokens,
      setOfferOutputTokens: mockSetOfferOutputTokens,
      toggleAdvanced: mockToggleAdvanced,
      ...overrides,
    };
    
    return (selector: any) => {
      if (typeof selector === 'function') {
        return selector(defaultState);
      }
      return defaultState;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render token input field', () => {
    (useAppStore as any).mockImplementation(createMockStore());

    render(<TokenBudgetSection />);
    
    expect(screen.getByPlaceholderText('10,000')).toBeInTheDocument();
    expect(screen.getByText('tokens')).toBeInTheDocument();
  });

  it('should render advanced toggle link', () => {
    (useAppStore as any).mockImplementation(createMockStore());

    render(<TokenBudgetSection />);
    
    expect(screen.getByText(/Advanced.*input\/output split/)).toBeInTheDocument();
  });

  it('should call setOfferTokens when input changes', () => {
    (useAppStore as any).mockImplementation(createMockStore());

    render(<TokenBudgetSection />);
    
    const input = screen.getByPlaceholderText('10,000');
    fireEvent.change(input, { target: { value: '50000' } });
    
    expect(mockSetOfferTokens).toHaveBeenCalledWith(50000);
  });

  it('should toggle advanced fields when link clicked', () => {
    (useAppStore as any).mockImplementation(createMockStore());

    render(<TokenBudgetSection />);
    
    const link = screen.getByText(/Advanced.*input\/output split/);
    fireEvent.click(link);
    
    expect(mockToggleAdvanced).toHaveBeenCalled();
  });

  it('should show input/output fields when advanced mode is on', () => {
    (useAppStore as any).mockImplementation(createMockStore({
      showAdvanced: true,
    }));

    render(<TokenBudgetSection />);
    
    expect(screen.getByText('Input Tokens')).toBeInTheDocument();
    expect(screen.getByText('Output Tokens')).toBeInTheDocument();
  });
});