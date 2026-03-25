import { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { validateSetupForm } from '../../lib/validators';
import { mapToExchangeConfig } from '../../lib/formMappers';
import { setupTestIds } from '../../lib/testIds';

type LMbaseWindow = Window & {
  lmbase: {
    providers: {
      validateKey: (request: { provider: string; apiKey: string }) => Promise<{ valid: boolean; message: string }>;
    };
    session: {
      start: (config: ReturnType<typeof mapToExchangeConfig>) => Promise<{ success: boolean; error?: string }>;
    };
  };
};

export function ConnectionActions() {
  const lmbase = (window as unknown as LMbaseWindow).lmbase;
  const offer = useAppStore((state) => state.offer);
  const receive = useAppStore((state) => state.receive);
  const authMethod = useAppStore((state) => state.authMethod);
  const apiKey = useAppStore((state) => state.apiKey);
  const copilotAuth = useAppStore((state) => state.copilotAuth);
  const setErrors = useAppStore((state) => state.setErrors);
  const setConnecting = useAppStore((state) => state.setConnecting);
  const isConnecting = useAppStore((state) => state.isConnecting);

  const requiresCopilotAuth = authMethod === 'copilot' && copilotAuth.status !== 'success';

  // Publish all blocking errors reactively so the button stays visibly disabled without a click
  useEffect(() => {
    const validationErrors = validateSetupForm(offer, receive, authMethod, apiKey);

    if (requiresCopilotAuth) {
      setErrors([{ field: 'auth', message: 'Please complete Copilot authentication' }]);
      return;
    }

    setErrors(validationErrors);
  }, [offer, receive, authMethod, apiKey, setErrors, requiresCopilotAuth]);

  const validationErrors = validateSetupForm(offer, receive, authMethod, apiKey);
  const isSubmitReady = validationErrors.length === 0 && !requiresCopilotAuth;

  const isFormValid = () => {
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return false;
    }

    setErrors([]);
    return true;
  };

  const handleConnect = async () => {
    if (!isFormValid()) return;

    setConnecting(true);

    try {
      const config = mapToExchangeConfig(
        offer,
        receive,
        authMethod,
        apiKey,
        authMethod === 'copilot' ? copilotAuth.deviceCode : ''
      );

      if (authMethod === 'api_key' && offer.provider) {
        const validation = await lmbase.providers.validateKey({
          provider: offer.provider,
          apiKey,
        });

        if (!validation.valid) {
          setErrors([{ field: 'apiKey', message: validation.message }]);
          return;
        }
      }

      const result = await lmbase.session.start(config);

      if (!result.success) {
        setErrors([{ field: 'connection', message: result.error || 'Failed to start session' }]);
      }
    } catch (err) {
      setErrors([
        {
          field: 'connection',
          message: err instanceof Error ? err.message : 'Connection failed',
        },
      ]);
    } finally {
      setConnecting(false);
    }
  };

  const connectionError = useAppStore((state) =>
    state.errors.find((e) => e.field === 'connection')?.message
  );

  const authError = useAppStore((state) =>
    state.errors.find((e) => e.field === 'auth')?.message
  );

  return (
    <div className="cta-section">
      {connectionError && (
        <div className="connection-error" data-testid={setupTestIds.connectionError} role="alert">
          <div className="error-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <span>{connectionError}</span>
        </div>
      )}

      {authError && (
        <div className="connection-error" data-testid={setupTestIds.authError} role="alert">
          <div className="error-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <span>{authError}</span>
        </div>
      )}

      <button
        type="button"
        className={`btn-primary ${isConnecting ? 'loading' : ''}`}
        data-testid={setupTestIds.findMatchButton}
        onClick={handleConnect}
        disabled={isConnecting || !isSubmitReady}
      >
        {isConnecting ? 'Connecting...' : 'Find Match'}
      </button>

      {!isConnecting && (
        <p className="cta-microcopy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Connects you to a peer in seconds
        </p>
      )}

      <style>{`
        .connection-error {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: var(--error-bg);
          border: 1px solid var(--error-border);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-4);
          font-size: var(--text-sm);
          color: var(--error);
        }
        
        .error-icon {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
