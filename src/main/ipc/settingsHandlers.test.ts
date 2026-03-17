import { describe, expect, it, vi } from 'vitest';
import { IpcChannels } from '../../shared/contracts/ipc';
import { registerSettingsHandlers } from './settingsHandlers';

function createIpcHarness() {
  const handlers = new Map<string, (event: unknown, request: unknown) => Promise<unknown> | unknown>();
  return {
    handlers,
    ipcMainLike: {
      handle: vi.fn((channel: string, listener: (event: unknown, request: unknown) => Promise<unknown> | unknown) => {
        handlers.set(channel, listener);
      }),
      removeHandler: vi.fn((channel: string) => {
        handlers.delete(channel);
      }),
    },
  };
}

describe('settingsHandlers', () => {
  it('returns structured fallbacks for invalid payloads', async () => {
    const harness = createIpcHarness();
    registerSettingsHandlers({
      ipcMainLike: harness.ipcMainLike as never,
      settingsStore: { get: vi.fn(), set: vi.fn(), getAll: vi.fn() },
      secretStore: { getSecret: vi.fn(), setSecret: vi.fn(), deleteSecret: vi.fn() },
    });

    await expect(harness.handlers.get(IpcChannels.settings.get)?.({}, null)).resolves.toBeNull();
    await expect(harness.handlers.get(IpcChannels.settings.set)?.({}, null)).resolves.toBe(false);
  });

  it('uses secret storage for sensitive keys', async () => {
    const harness = createIpcHarness();
    const settingsStore = {
      get: vi.fn(async () => 'ws://localhost:8080'),
      set: vi.fn(async () => true),
      getAll: vi.fn(async () => ({})),
    };
    const secretStore = {
      getSecret: vi.fn(async () => 'secret'),
      setSecret: vi.fn(async () => undefined),
      deleteSecret: vi.fn(async () => undefined),
    };

    registerSettingsHandlers({
      ipcMainLike: harness.ipcMainLike as never,
      settingsStore,
      secretStore,
    });

    await expect(harness.handlers.get(IpcChannels.settings.get)?.({}, { key: 'openaiApiKey' })).resolves.toBe('secret');
    await expect(
      harness.handlers.get(IpcChannels.settings.get)?.({}, { key: 'serverUrl' }),
    ).resolves.toBe('ws://localhost:8080');
    await expect(
      harness.handlers.get(IpcChannels.settings.set)?.({}, { key: 'githubToken', value: 'ghu_123' }),
    ).resolves.toBe(true);

    expect(secretStore.getSecret).toHaveBeenCalledWith('openaiApiKey');
    expect(settingsStore.get).toHaveBeenCalledWith('serverUrl');
    expect(secretStore.setSecret).toHaveBeenCalledWith('githubToken', 'ghu_123');
  });
});
