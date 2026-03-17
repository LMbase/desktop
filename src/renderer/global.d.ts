import type { FetchModelsResult, ValidateResult } from '../shared/contracts/providers';
import type { ExchangeConfig, SessionSnapshot, ActivityEvent } from '../shared/contracts/session';
import type { CopilotStatusEvent } from '../shared/contracts/ipc';

declare global {
  interface Window {
    tokenhub: {
      providers: {
        fetchModels: (request: { provider: string; apiKey?: string }) => Promise<FetchModelsResult>;
        validateKey: (request: { provider: string; apiKey: string }) => Promise<ValidateResult>;
      };
      auth: {
        startCopilotAuth: () => Promise<{ deviceCode: string; userCode: string; verificationUri: string }>;
        cancelCopilotAuth: () => Promise<void>;
        getCopilotAuthStatus: () => Promise<CopilotStatusEvent>;
        onCopilotStatus: (listener: (event: CopilotStatusEvent) => void) => () => void;
        openExternal: (url: string) => Promise<void>;
      };
      settings: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<void>;
      };
      session: {
        start: (config: ExchangeConfig) => Promise<{ success: boolean; error?: string }>;
        stop: () => Promise<void>;
        getSnapshot: () => Promise<SessionSnapshot | null>;
        onSessionUpdate: (callback: (snapshot: SessionSnapshot) => void) => () => void;
        onActivityLog: (callback: (event: ActivityEvent) => void) => () => void;
      };
    };
  }
}

export {};
