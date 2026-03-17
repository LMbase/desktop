import { describe, expect, it, vi } from 'vitest';
import { createBeforeQuitCleanup } from './beforeQuitCleanup';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('beforeQuitCleanup', () => {
  it('stops the active session before quitting the app', async () => {
    const app = { quit: vi.fn() };
    const sessionController = { stop: vi.fn(async () => undefined) };
    const unregisterIpcHandlers = vi.fn();
    const preventDefault = vi.fn();
    const cleanup = createBeforeQuitCleanup({ app, sessionController, unregisterIpcHandlers });

    cleanup({ preventDefault });
    await flushMicrotasks();

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(sessionController.stop).toHaveBeenCalledTimes(1);
    expect(unregisterIpcHandlers).toHaveBeenCalledTimes(1);
    expect(app.quit).toHaveBeenCalledTimes(1);
  });

  it('runs shutdown cleanup only once across repeated before-quit events', async () => {
    const app = { quit: vi.fn() };
    const sessionController = { stop: vi.fn(async () => undefined) };
    const unregisterIpcHandlers = vi.fn();
    const firstPreventDefault = vi.fn();
    const secondPreventDefault = vi.fn();
    const cleanup = createBeforeQuitCleanup({ app, sessionController, unregisterIpcHandlers });

    cleanup({ preventDefault: firstPreventDefault });
    cleanup({ preventDefault: secondPreventDefault });
    await flushMicrotasks();

    expect(firstPreventDefault).toHaveBeenCalledTimes(1);
    expect(secondPreventDefault).not.toHaveBeenCalled();
    expect(sessionController.stop).toHaveBeenCalledTimes(1);
    expect(unregisterIpcHandlers).toHaveBeenCalledTimes(1);
    expect(app.quit).toHaveBeenCalledTimes(1);
  });
});
