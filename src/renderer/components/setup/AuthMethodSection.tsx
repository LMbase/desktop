import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { useCopilotAuth } from '../../hooks/useCopilotAuth';
import { setupTestIds } from '../../lib/testIds';

interface AuthMethodSectionProps {
  mode?: 'selector' | 'credentials';
}

export function AuthMethodSection({ mode = 'credentials' }: AuthMethodSectionProps) {
  const authMethod = useAppStore((state) => state.authMethod);
  const apiKey = useAppStore((state) => state.apiKey);
  const setAuthMethod = useAppStore((state) => state.setAuthMethod);
  const setApiKey = useAppStore((state) => state.setApiKey);
  const errors = useAppStore((state) => state.errors);

  const copilotAuth = useCopilotAuth();
  const [showKey, setShowKey] = useState(false);

  const apiKeyError = errors.find((e) => e.field === 'apiKey')?.message;

  return (
    <div className="auth-method-section">
      {mode === 'selector' && (
        <>
          <label className="form-label">Authentication</label>
          <div className="auth-tabs" data-testid={setupTestIds.authMethodSelector}>
            <button
              type="button"
              className={`auth-tab ${authMethod === 'api_key' ? 'active' : ''}`}
              data-testid={setupTestIds.authMethodTab('api_key')}
              data-selected={authMethod === 'api_key' ? 'true' : 'false'}
              aria-pressed={authMethod === 'api_key'}
              onClick={() => setAuthMethod('api_key')}
            >
              API Key
            </button>
            <button
              type="button"
              className={`auth-tab ${authMethod === 'copilot' ? 'active' : ''}`}
              data-testid={setupTestIds.authMethodTab('copilot')}
              data-selected={authMethod === 'copilot' ? 'true' : 'false'}
              aria-pressed={authMethod === 'copilot'}
              onClick={() => setAuthMethod('copilot')}
            >
              OAuth
            </button>
          </div>
        </>
      )}

      {mode === 'credentials' && <div className="form-label">{authMethod === 'api_key' ? 'Enter API Key' : 'OAuth Login'}</div>}

      {mode === 'credentials' && (
        <div className="auth-content" data-testid={setupTestIds.authCredentials}>
          {authMethod === 'api_key' ? (
            <div className="api-key-input">
              <div className="input-wrapper">
                <input
                  type={showKey ? 'text' : 'password'}
                  className={`form-input ${apiKeyError ? 'error' : ''}`}
                  data-testid={setupTestIds.apiKeyInput}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  data-testid={setupTestIds.apiKeyVisibilityToggle}
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              {apiKeyError && (
                <div className="form-error" data-testid={setupTestIds.apiKeyError} role="alert">
                  {apiKeyError}
                </div>
              )}
            </div>
          ) : (
            <div className="copilot-auth-flow">
              {copilotAuth.status === 'idle' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={copilotAuth.startAuth}
                >
                  Sign in with GitHub
                </button>
              )}

              {copilotAuth.status === 'pending' && (
                <>
                  <p className="copilot-instructions">
                    Enter this code on GitHub to authenticate:
                  </p>
                  <div className="copilot-code-display">{copilotAuth.userCode}</div>
                  <p className="copilot-instructions">
                    Or{' '}
                    <span
                      className="copilot-link"
                      onClick={copilotAuth.openBrowser}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          copilotAuth.openBrowser();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      open in browser
                    </span>
                  </p>
                  <div className="copilot-status pending">
                    <span className="dot pulse" />
                    Waiting for authentication...
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={copilotAuth.cancelAuth}
                  >
                    Cancel
                  </button>
                </>
              )}

              {copilotAuth.status === 'success' && (
                <div className="copilot-status success">
                  <span className="dot success" />
                  Authenticated successfully
                </div>
              )}

              {copilotAuth.status === 'error' && (
                <>
                  <div className="copilot-status error">
                    <span className="dot error" />
                    {copilotAuth.error}
                  </div>
                  <button type="button" className="btn-primary" onClick={copilotAuth.startAuth}>
                    Try Again
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .input-wrapper .form-input {
          padding-right: 60px;
        }
        
        .toggle-visibility {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-size: var(--text-sm);
          cursor: pointer;
          padding: 4px 8px;
        }
        
        .toggle-visibility:hover {
          color: var(--text-primary);
        }
        
        .btn-secondary {
          width: 100%;
          padding: var(--space-3) var(--space-4);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          cursor: pointer;
          margin-top: var(--space-3);
        }
        
        .btn-secondary:hover {
          background: var(--bg-elevated);
          border-color: var(--border-strong);
        }
      `}</style>
    </div>
  );
}
