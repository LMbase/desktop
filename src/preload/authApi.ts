import { ipcRenderer } from 'electron';
import {
  IpcChannels,
  copilotStatusEventSchema,
  ipcEventChannels,
  ipcSchemas,
  type CopilotStatusEvent,
} from '../shared/contracts/ipc';

export interface AuthApi {
  startCopilotAuth: () => Promise<{ deviceCode: string; userCode: string; verificationUri: string }>;
  cancelCopilotAuth: () => Promise<void>;
  getCopilotAuthStatus: () => Promise<CopilotStatusEvent>;
  onCopilotStatus: (listener: (event: CopilotStatusEvent) => void) => () => void;
  openExternal: (url: string) => Promise<void>;
}

const DEFAULT_AUTH_STATUS: CopilotStatusEvent = { status: 'cancelled' };

export function createAuthApi(): AuthApi {
  return {
    startCopilotAuth: async () => {
      const response = await ipcRenderer.invoke(IpcChannels.auth.startCopilotAuth, {});
      const parsed = ipcSchemas[IpcChannels.auth.startCopilotAuth].response.safeParse(response);
      if (!parsed.success) {
        return { deviceCode: '', userCode: '', verificationUri: '' };
      }
      return parsed.data;
    },

    cancelCopilotAuth: async () => {
      await ipcRenderer.invoke(IpcChannels.auth.cancelCopilotAuth, {});
    },

    getCopilotAuthStatus: async () => {
      const response = await ipcRenderer.invoke(IpcChannels.auth.getCopilotAuthStatus, {});
      const parsed = ipcSchemas[IpcChannels.auth.getCopilotAuthStatus].response.safeParse(response);
      if (!parsed.success) {
        return DEFAULT_AUTH_STATUS;
      }
      return parsed.data;
    },

    onCopilotStatus: (listener) => {
      const handler = (_event: unknown, payload: unknown) => {
        const parsed = copilotStatusEventSchema.safeParse(payload);
        if (parsed.success) {
          listener(parsed.data);
        }
      };
      ipcRenderer.on(ipcEventChannels.copilotStatus, handler);
        return () => {
          ipcRenderer.removeListener(ipcEventChannels.copilotStatus, handler);
        };
      },

    openExternal: async (url) => {
      const { shell } = await import('electron');
      await shell.openExternal(url);
    },
  };
}
