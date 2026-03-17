import { ipcRenderer } from 'electron';
import { IpcChannels, ipcSchemas } from '../shared/contracts/ipc';

export interface SettingsApi {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<boolean>;
}

export function createSettingsApi(): SettingsApi {
  return {
    get: async (key) => {
      const parsedRequest = ipcSchemas[IpcChannels.settings.get].request.safeParse({ key });
      if (!parsedRequest.success) {
        return null;
      }

      const response = await ipcRenderer.invoke(IpcChannels.settings.get, parsedRequest.data);
      const parsedResponse = ipcSchemas[IpcChannels.settings.get].response.safeParse(response);
      if (!parsedResponse.success) {
        return null;
      }
      return parsedResponse.data;
    },

    set: async (key, value) => {
      const parsedRequest = ipcSchemas[IpcChannels.settings.set].request.safeParse({ key, value });
      if (!parsedRequest.success) {
        return false;
      }

      const response = await ipcRenderer.invoke(IpcChannels.settings.set, parsedRequest.data);
      const parsedResponse = ipcSchemas[IpcChannels.settings.set].response.safeParse(response);
      if (!parsedResponse.success) {
        return false;
      }
      return parsedResponse.data;
    },
  };
}
