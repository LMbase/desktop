import { describe, expect, it, vi } from 'vitest';
import { IpcChannels } from '../../shared/contracts/ipc';
import { registerAuthHandlers } from './authHandlers';

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

describe('authHandlers', () => {
  it('rejects invalid payloads with structured fallbacks', async () => {
    const harness = createIpcHarness();
    const emitted: unknown[] = [];

    registerAuthHandlers({
      ipcMainLike: harness.ipcMainLike as never,
      deviceFlow: {
        requestDeviceCode: vi.fn(),
        pollForAccessToken: vi.fn(),
      },
      emitStatus: (payload) => emitted.push(payload),
    });

    await expect(harness.handlers.get(IpcChannels.auth.startCopilotAuth)?.({}, null)).resolves.toEqual({
      deviceCode: '',
      userCode: '',
      verificationUri: '',
    });

    await expect(harness.handlers.get(IpcChannels.auth.getCopilotAuthStatus)?.({}, null)).resolves.toEqual({
      status: 'error',
      error: 'Invalid request payload',
    });
    expect(emitted).toContainEqual({ status: 'error', error: 'Invalid request payload', token: undefined });
  });

  it('starts device flow and updates auth status', async () => {
    const harness = createIpcHarness();
    const emitted: Array<{ status: string; token?: string }> = [];

    registerAuthHandlers({
      ipcMainLike: harness.ipcMainLike as never,
      deviceFlow: {
        requestDeviceCode: vi.fn(async () => ({
          deviceCode: 'device',
          userCode: 'ABCD',
          verificationUri: 'https://github.com/login/device',
          expiresIn: 900,
          interval: 5,
        })),
        pollForAccessToken: vi.fn(async () => 'ghu_token'),
      },
      emitStatus: (payload) => emitted.push(payload),
    });

    await expect(harness.handlers.get(IpcChannels.auth.startCopilotAuth)?.({}, {})).resolves.toEqual({
      deviceCode: 'device',
      userCode: 'ABCD',
      verificationUri: 'https://github.com/login/device',
    });

    await Promise.resolve();

    await expect(harness.handlers.get(IpcChannels.auth.getCopilotAuthStatus)?.({}, {})).resolves.toEqual({
      status: 'success',
      token: 'ghu_token',
      error: undefined,
    });
    expect(emitted.some((event) => event.status === 'pending')).toBe(true);
    expect(emitted.some((event) => event.status === 'success' && event.token === 'ghu_token')).toBe(true);
  });

  it('cancels in-flight auth and reports cancelled state', async () => {
    const harness = createIpcHarness();
    const emitted: Array<{ status: string }> = [];

    registerAuthHandlers({
      ipcMainLike: harness.ipcMainLike as never,
      deviceFlow: {
        requestDeviceCode: vi.fn(async () => ({
          deviceCode: 'device',
          userCode: 'ABCD',
          verificationUri: 'https://github.com/login/device',
          expiresIn: 900,
          interval: 5,
        })),
        pollForAccessToken: vi.fn(
          async () =>
            await new Promise<string>((resolve) => {
              setTimeout(() => resolve('later-token'), 50);
            }),
        ),
      },
      emitStatus: (payload) => emitted.push(payload),
    });

    await harness.handlers.get(IpcChannels.auth.startCopilotAuth)?.({}, {});
    await harness.handlers.get(IpcChannels.auth.cancelCopilotAuth)?.({}, {});

    await expect(harness.handlers.get(IpcChannels.auth.getCopilotAuthStatus)?.({}, {})).resolves.toEqual({
      status: 'cancelled',
      token: undefined,
      error: undefined,
    });
    expect(emitted.some((event) => event.status === 'cancelled')).toBe(true);
  });
});
