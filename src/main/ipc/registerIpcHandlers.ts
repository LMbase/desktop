import { registerAuthHandlers, type CopilotDeviceFlow } from './authHandlers';
import { registerProviderHandlers } from './providerHandlers';
import { registerSessionHandlers, type SessionController } from './sessionHandlers';
import { registerSettingsHandlers } from './settingsHandlers';
import type { CopilotStatusEvent } from '../../shared/contracts/ipc';
import type { ActivityEvent, SessionSnapshot } from '../../shared/contracts/session';
import type { ProviderRegistry } from '../providers/providerRegistry';

interface RegisterIpcHandlersOptions {
  sessionController?: SessionController;
  providerRegistry?: Pick<
    ProviderRegistry,
    'fetchProviderModels' | 'fetchPublicProviderModels' | 'validateKey' | 'estimateExchange'
  >;
  auth?: {
    deviceFlow?: CopilotDeviceFlow;
    emitStatus?: (payload: CopilotStatusEvent) => void;
  };
  session?: {
    emitSessionUpdate?: (snapshot: SessionSnapshot | null) => void;
    emitActivity?: (event: ActivityEvent) => void;
  };
}

function createNoopSessionController(): SessionController {
  return {
    start: async () => {
      throw new Error('Session controller is not configured');
    },
    stop: async () => undefined,
    getSnapshot: async () => null,
    onSessionUpdate: () => () => undefined,
    onActivity: () => () => undefined,
  };
}

export function registerIpcHandlers(options: RegisterIpcHandlersOptions = {}): () => void {
  const sessionController = options.sessionController ?? createNoopSessionController();
  const unregisterProviderHandlers = registerProviderHandlers({
    providerRegistry: options.providerRegistry,
  });
  const unregisterAuthHandlers = registerAuthHandlers({
    deviceFlow: options.auth?.deviceFlow,
    emitStatus: options.auth?.emitStatus,
  });
  const unregisterSettingsHandlers = registerSettingsHandlers();
  const unregisterSessionHandlers = registerSessionHandlers({
    sessionController,
    emitSessionUpdate: options.session?.emitSessionUpdate,
    emitActivity: options.session?.emitActivity,
  });

  return () => {
    unregisterSessionHandlers();
    unregisterSettingsHandlers();
    unregisterAuthHandlers();
    unregisterProviderHandlers();
  };
}
