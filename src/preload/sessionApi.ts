import { ipcRenderer } from 'electron';
import {
  IpcChannels,
  activityLogEventSchema,
  ipcEventChannels,
  ipcSchemas,
  sessionUpdateEventSchema,
} from '../shared/contracts/ipc';
import type { ActivityEvent, ExchangeConfig, SessionSnapshot } from '../shared/contracts/session';

export interface SessionApi {
  start: (config: ExchangeConfig) => Promise<{ success: boolean; error?: string }>;
  stop: () => Promise<void>;
  getSnapshot: () => Promise<SessionSnapshot | null>;
  onSessionUpdate: (listener: (snapshot: SessionSnapshot | null) => void) => () => void;
  onActivityLog: (listener: (event: ActivityEvent) => void) => () => void;
}

export function createSessionApi(): SessionApi {
  return {
    start: async (config) => {
      const parsedRequest = ipcSchemas[IpcChannels.session.start].request.safeParse(config);
      if (!parsedRequest.success) {
        return { success: false, error: 'Invalid request payload' };
      }

      const response = await ipcRenderer.invoke(IpcChannels.session.start, parsedRequest.data);
      const parsedResponse = ipcSchemas[IpcChannels.session.start].response.safeParse(response);
      if (!parsedResponse.success) {
        return { success: false, error: 'Invalid IPC response payload' };
      }
      return parsedResponse.data;
    },

    stop: async () => {
      await ipcRenderer.invoke(IpcChannels.session.stop, {});
    },

    getSnapshot: async () => {
      const response = await ipcRenderer.invoke(IpcChannels.session.getSnapshot, {});
      const parsedResponse = ipcSchemas[IpcChannels.session.getSnapshot].response.safeParse(response);
      if (!parsedResponse.success) {
        return null;
      }
      return parsedResponse.data;
    },

    onSessionUpdate: (listener) => {
      const handler = (_event: unknown, payload: unknown) => {
        const parsed = sessionUpdateEventSchema.nullable().safeParse(payload);
        if (parsed.success) {
          listener(parsed.data);
        }
      };
      ipcRenderer.on(ipcEventChannels.sessionUpdate, handler);
      return () => {
        ipcRenderer.removeListener(ipcEventChannels.sessionUpdate, handler);
      };
    },

    onActivityLog: (listener) => {
      const handler = (_event: unknown, payload: unknown) => {
        const parsed = activityLogEventSchema.safeParse(payload);
        if (parsed.success) {
          listener(parsed.data);
        }
      };
      ipcRenderer.on(ipcEventChannels.activityLog, handler);
      return () => {
        ipcRenderer.removeListener(ipcEventChannels.activityLog, handler);
      };
    },
  };
}
