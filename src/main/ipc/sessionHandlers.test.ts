import { describe, expect, it, vi } from 'vitest';
import { IpcChannels } from '../../shared/contracts/ipc';
import type { ActivityEvent, SessionSnapshot } from '../../shared/contracts/session';
import { registerSessionHandlers, type SessionController } from './sessionHandlers';

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

function createSessionControllerMock(): SessionController {
  let sessionListener: ((payload: SessionSnapshot | null) => void) | undefined;
  let activityListener: ((payload: ActivityEvent) => void) | undefined;

  return {
    start: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    getSnapshot: vi.fn(async () => ({
      status: 'idle',
      config: null,
      pairing: null,
      tokensGrantedDone: 0,
      tokensToServeDone: 0,
      inputTokensGrantedDone: 0,
      outputTokensGrantedDone: 0,
      inputTokensToServeDone: 0,
      outputTokensToServeDone: 0,
    })),
    onSessionUpdate: vi.fn((listener: (snapshot: SessionSnapshot | null) => void) => {
      sessionListener = listener;
      return () => {
        sessionListener = undefined;
      };
    }),
    onActivity: vi.fn((listener: (event: ActivityEvent) => void) => {
      activityListener = listener;
      return () => {
        activityListener = undefined;
      };
    }),
    __emitSession: (payload: unknown) => sessionListener?.(payload as SessionSnapshot | null),
    __emitActivity: (payload: unknown) => activityListener?.(payload as ActivityEvent),
  } as SessionController & { __emitSession: (payload: unknown) => void; __emitActivity: (payload: unknown) => void };
}

describe('sessionHandlers', () => {
  it('validates channel payloads and returns structured responses', async () => {
    const harness = createIpcHarness();
    const controller = createSessionControllerMock();
    registerSessionHandlers({ ipcMainLike: harness.ipcMainLike as never, sessionController: controller });

    await expect(harness.handlers.get(IpcChannels.session.start)?.({}, null)).resolves.toEqual({
      success: false,
      error: 'Invalid request payload',
    });
    await expect(harness.handlers.get(IpcChannels.session.getSnapshot)?.({}, null)).resolves.toBeNull();
  });

  it('delegates lifecycle operations to sessionController', async () => {
    const harness = createIpcHarness();
    const controller = createSessionControllerMock();

    registerSessionHandlers({ ipcMainLike: harness.ipcMainLike as never, sessionController: controller });

    const request = {
      provider: 'openai',
      model: 'gpt-4o',
      tokensOffered: 10,
      wantProvider: 'anthropic',
      wantModel: 'claude-3-5-sonnet-20241022',
      apiKey: 'sk_test',
      authMethod: 'api_key',
      githubToken: '',
      inputTokensOffered: 0,
      outputTokensOffered: 0,
      advanced: false,
      proxyPort: 9100,
      proxyUrl: '',
    };

    await expect(harness.handlers.get(IpcChannels.session.start)?.({}, request)).resolves.toEqual({ success: true });
    await expect(harness.handlers.get(IpcChannels.session.getSnapshot)?.({}, {})).resolves.toEqual({
      status: 'idle',
      config: null,
      pairing: null,
      tokensGrantedDone: 0,
      tokensToServeDone: 0,
      inputTokensGrantedDone: 0,
      outputTokensGrantedDone: 0,
      inputTokensToServeDone: 0,
      outputTokensToServeDone: 0,
    });

    await harness.handlers.get(IpcChannels.session.stop)?.({}, {});

    expect(controller.start).toHaveBeenCalledTimes(1);
    expect(controller.stop).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot).toHaveBeenCalledTimes(1);
  });

  it('forwards validated session and activity events', () => {
    const harness = createIpcHarness();
    const controller = createSessionControllerMock() as SessionController & {
      __emitSession: (payload: unknown) => void;
      __emitActivity: (payload: unknown) => void;
    };
    const sessionEvents: unknown[] = [];
    const activityEvents: unknown[] = [];

    registerSessionHandlers({
      ipcMainLike: harness.ipcMainLike as never,
      sessionController: controller,
      emitSessionUpdate: (snapshot) => sessionEvents.push(snapshot),
      emitActivity: (event) => activityEvents.push(event),
    });

    controller.__emitSession({
      status: 'idle',
      config: null,
      pairing: null,
      tokensGrantedDone: 0,
      tokensToServeDone: 0,
      inputTokensGrantedDone: 0,
      outputTokensGrantedDone: 0,
      inputTokensToServeDone: 0,
      outputTokensToServeDone: 0,
    });
    controller.__emitSession({ bogus: true });

    controller.__emitActivity({ timestamp: Date.now(), type: 'info', message: 'connected' });
    controller.__emitActivity({ broken: true });

    expect(sessionEvents).toHaveLength(1);
    expect(activityEvents).toHaveLength(1);
  });
});
