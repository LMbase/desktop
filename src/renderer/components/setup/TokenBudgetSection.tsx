import React, { useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { formatTokenInput, parseTokenInput, hasFieldError } from '../../lib/validators';

export function TokenBudgetSection() {
  const offer = useAppStore((state) => state.offer);
  const setOfferTokens = useAppStore((state) => state.setOfferTokens);
  const setOfferInputTokens = useAppStore((state) => state.setOfferInputTokens);
  const setOfferOutputTokens = useAppStore((state) => state.setOfferOutputTokens);
  const showAdvanced = useAppStore((state) => state.showAdvanced);
  const toggleAdvanced = useAppStore((state) => state.toggleAdvanced);
  const errors = useAppStore((state) => state.errors);

  const [displayValue, setDisplayValue] = useState(
    offer.tokens > 0 ? offer.tokens.toLocaleString() : ''
  );
  const [inputDisplay, setInputDisplay] = useState(
    offer.inputTokens > 0 ? offer.inputTokens.toLocaleString() : ''
  );
  const [outputDisplay, setOutputDisplay] = useState(
    offer.outputTokens > 0 ? offer.outputTokens.toLocaleString() : ''
  );

  const handleTokensChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatTokenInput(e.target.value);
      setDisplayValue(formatted);
      setOfferTokens(parseTokenInput(e.target.value));
    },
    [setOfferTokens]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatTokenInput(e.target.value);
      setInputDisplay(formatted);
      setOfferInputTokens(parseTokenInput(e.target.value));
    },
    [setOfferInputTokens]
  );

  const handleOutputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatTokenInput(e.target.value);
      setOutputDisplay(formatted);
      setOfferOutputTokens(parseTokenInput(e.target.value));
    },
    [setOfferOutputTokens]
  );

  const tokensError = hasFieldError(errors, 'tokens');
  const inputTokensError = hasFieldError(errors, 'inputTokens');
  const outputTokensError = hasFieldError(errors, 'outputTokens');

  return (
    <div className="token-budget-section">
      <div className="token-input-section">
        <label className="form-label">Token Amount</label>
        <input
          type="text"
          className={`token-input-large ${tokensError ? 'error' : ''}`}
          value={displayValue}
          onChange={handleTokensChange}
          placeholder="10,000"
        />
        <div className="token-input-suffix">tokens</div>
      </div>

      <button
        className={`advanced-link ${showAdvanced ? 'expanded' : ''}`}
        onClick={toggleAdvanced}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span>{showAdvanced ? 'Hide advanced options' : 'Advanced: Set input/output split'}</span>
      </button>

      {showAdvanced && (
        <div className="advanced-fields visible">
          <div className="form-group">
            <label className="form-label">Input Tokens</label>
            <input
              type="text"
              className={`form-input ${inputTokensError ? 'error' : ''}`}
              value={inputDisplay}
              onChange={handleInputChange}
              placeholder="7,000"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Output Tokens</label>
            <input
              type="text"
              className={`form-input ${outputTokensError ? 'error' : ''}`}
              value={outputDisplay}
              onChange={handleOutputChange}
              placeholder="3,000"
            />
          </div>
        </div>
      )}
    </div>
  );
}