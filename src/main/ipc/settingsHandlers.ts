import electron from 'electron';
const { ipcMain } = electron;
import { IpcChannels, ipcSchemas } from '../../shared/contracts/ipc';
import { createSecretStore, type SecretStore } from '../storage/secretStore';
import { createSettingsStore, type SettingsStore } from '../storage/settingsStore';

interface IpcMainHandleLike {
  handle: (
    channel: string,
    listener: (event: unknown, request: unknown) => Promise<unknown> | unknown,
  ) => void;
  removeHandler: (channel: string) => void;
}

interface RegisterSettingsHandlersOptions {
  ipcMainLike?: IpcMainHandleLike;
  settingsStore?: SettingsStore;
  secretStore?: SecretStore;
}

function isSecretKey(key: string): boolean {
  return /(secret|token|password|api[-_]?key)/i.test(key);
}

export function registerSettingsHandlers(options: RegisterSettingsHandlersOptions = {}): () => void {
  const ipcMainLike = options.ipcMainLike ?? ipcMain;
  const settingsStore = options.settingsStore ?? createSettingsStore();
  const secretStore = options.secretStore ?? createSecretStore();

  ipcMainLike.handle(IpcChannels.settings.get, async (_event, request) => {
    const parsed = ipcSchemas[IpcChannels.settings.get].request.safeParse(request);
    if (!parsed.success) {
      return null;
    }

    try {
      if (isSecretKey(parsed.data.key)) {
        return await secretStore.getSecret(parsed.data.key);
      }
      return await settingsStore.get(parsed.data.key);
    } catch {
      return null;
    }
  });

  ipcMainLike.handle(IpcChannels.settings.set, async (_event, request) => {
    const parsed = ipcSchemas[IpcChannels.settings.set].request.safeParse(request);
    if (!parsed.success) {
      return false;
    }

    try {
      if (isSecretKey(parsed.data.key)) {
        await secretStore.setSecret(parsed.data.key, parsed.data.value);
        return true;
      }
      return await settingsStore.set(parsed.data.key, parsed.data.value);
    } catch {
      return false;
    }
  });

  return () => {
    ipcMainLike.removeHandler(IpcChannels.settings.get);
    ipcMainLike.removeHandler(IpcChannels.settings.set);
  };
}
