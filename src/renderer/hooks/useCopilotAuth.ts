import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import type { CopilotStatusEvent } from '@shared/contracts/ipc';

interface UseCopilotAuthResult {
  status: 'idle' | 'pending' | 'success' | 'error' | 'cancelled';
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  error: string;
  startAuth: () => Promise<void>;
  cancelAuth: () => Promise<void>;
  openBrowser: () => void;
}

export function useCopilotAuth(): UseCopilotAuthResult {
  const copilotAuth = useAppStore((state) => state.copilotAuth);
  const setCopilotAuth = useAppStore((state) => state.setCopilotAuth);

  let unsubscribeStatus: (() => void) | null = null;

  const clearSubscription = () => {
    if (unsubscribeStatus) {
      unsubscribeStatus();
      unsubscribeStatus = null;
    }
  };

  const startAuth = useCallback(async () => {
    setCopilotAuth({ status: 'pending', error: '' });

    try {
      const result = await window.lmbase.auth.startCopilotAuth();

      setCopilotAuth({
        status: 'pending',
        deviceCode: result.deviceCode,
        userCode: result.userCode,
        verificationUri: result.verificationUri,
      });

      clearSubscription();
      unsubscribeStatus = window.lmbase.auth.onCopilotStatus(handleStatusUpdate);
    } catch (err) {
      setCopilotAuth({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to start authentication',
      });
    }
  }, [setCopilotAuth]);

  const cancelAuth = useCallback(async () => {
    try {
      await window.lmbase.auth.cancelCopilotAuth();
      clearSubscription();
      setCopilotAuth({
        status: 'cancelled',
        deviceCode: '',
        userCode: '',
        verificationUri: '',
      });
    } catch (err) {
      console.error('Failed to cancel auth:', err);
    }
  }, [setCopilotAuth]);

  const openBrowser = useCallback(() => {
    if (copilotAuth.verificationUri) {
      void window.lmbase.auth.openExternal(copilotAuth.verificationUri);
    }
  }, [copilotAuth.verificationUri]);

  const handleStatusUpdate = useCallback(
    (statusEvent: CopilotStatusEvent) => {
      if (statusEvent.status === 'success' && statusEvent.token) {
        setCopilotAuth({
          status: 'success',
          deviceCode: '',
          userCode: '',
          verificationUri: '',
        });
        clearSubscription();
      } else if (statusEvent.status === 'error') {
        setCopilotAuth({
          status: 'error',
          error: statusEvent.error || 'Authentication failed',
        });
        clearSubscription();
      } else if (statusEvent.status === 'cancelled') {
        setCopilotAuth({
          status: 'cancelled',
          deviceCode: '',
          userCode: '',
          verificationUri: '',
        });
        clearSubscription();
      }
    },
    [setCopilotAuth]
  );

  return {
    status: copilotAuth.status,
    deviceCode: copilotAuth.deviceCode,
    userCode: copilotAuth.userCode,
    verificationUri: copilotAuth.verificationUri,
    error: copilotAuth.error,
    startAuth,
    cancelAuth,
    openBrowser,
  };
}
