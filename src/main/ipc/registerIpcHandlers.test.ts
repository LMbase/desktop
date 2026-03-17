import { describe, expect, it, vi } from 'vitest';
import { registerIpcHandlers } from './registerIpcHandlers';

describe('registerIpcHandlers', () => {
  it('registers all IPC groups and returns a cleanup function', async () => {
    const sessionController = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      getSnapshot: vi.fn(async () => null),
      onSessionUpdate: vi.fn(() => vi.fn()),
      onActivity: vi.fn(() => vi.fn()),
    };

    const cleanup = registerIpcHandlers({
      sessionController,
      auth: {
        deviceFlow: {
          requestDeviceCode: vi.fn(async () => ({
            deviceCode: 'device',
            userCode: 'ABCD',
            verificationUri: 'https://github.com/login/device',
            expiresIn: 900,
            interval: 5,
          })),
          pollForAccessToken: vi.fn(async () => 'token'),
        },
      },
    });

    expect(typeof cleanup).toBe('function');
    cleanup();
  });
});
