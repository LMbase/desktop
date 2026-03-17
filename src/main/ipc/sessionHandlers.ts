import electron from 'electron';
const { BrowserWindow, ipcMain } = electron;
import {
  IpcChannels,
  activityLogEventSchema,
  ipcEventChannels,
  ipcSchemas,
  sessionUpdateEventSchema,
} from '../../shared/contracts/ipc';
import type { ActivityEvent, ExchangeConfig, SessionSnapshot } from '../../shared/contracts/session';

interface IpcMainHandleLike {
  handle: (
    channel: string,
    listener: (event: unknown, request: unknown) => Promise<unknown> | unknown,
  ) => void;
  removeHandler: (channel: string) => void;
}

type Unsubscribe = () => void;

export interface SessionController {
  start: (config: ExchangeConfig) => Promise<void>;
  stop: () => Promise<void>;
  getSnapshot: () => Promise<SessionSnapshot | null>;
  onSessionUpdate: (listener: (snapshot: SessionSnapshot | null) => void) => Unsubscribe;
  onActivity: (listener: (event: ActivityEvent) => void) => Unsubscribe;
}

interface RegisterSessionHandlersOptions {
  ipcMainLike?: IpcMainHandleLike;
  sessionController: SessionController;
  emitSessionUpdate?: (snapshot: SessionSnapshot | null) => void;
  emitActivity?: (event: ActivityEvent) => void;
}

function defaultEmitSessionUpdate(snapshot: SessionSnapshot | null): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(ipcEventChannels.sessionUpdate, snapshot);
  }
}

function defaultEmitActivity(event: ActivityEvent): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(ipcEventChannels.activityLog, event);
  }
}

function errorMessageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function registerSessionHandlers(options: RegisterSessionHandlersOptions): () => void {
  const ipcMainLike = options.ipcMainLike ?? ipcMain;
  const emitSessionUpdate = options.emitSessionUpdate ?? defaultEmitSessionUpdate;
  const emitActivity = options.emitActivity ?? defaultEmitActivity;

  const unsubSession = options.sessionController.onSessionUpdate((snapshot) => {
    const valid = sessionUpdateEventSchema.nullable().safeParse(snapshot);
    if (valid.success) {
      emitSessionUpdate(valid.data);
    }
  });

  const unsubActivity = options.sessionController.onActivity((event) => {
    const valid = activityLogEventSchema.safeParse(event);
    if (valid.success) {
      emitActivity(valid.data);
    }
  });

  ipcMainLike.handle(IpcChannels.session.start, async (_event, request) => {
    const parsed = ipcSchemas[IpcChannels.session.start].request.safeParse(request);
    if (!parsed.success) {
      return { success: false, error: 'Invalid request payload' };
    }

    try {
      await options.sessionController.start(parsed.data);
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessageFromUnknown(error) };
    }
  });

  ipcMainLike.handle(IpcChannels.session.stop, async (_event, request) => {
    const parsed = ipcSchemas[IpcChannels.session.stop].request.safeParse(request);
    if (!parsed.success) {
      return;
    }

    try {
      await options.sessionController.stop();
    } catch {
      return;
    }
  });

  ipcMainLike.handle(IpcChannels.session.getSnapshot, async (_event, request) => {
    const parsed = ipcSchemas[IpcChannels.session.getSnapshot].request.safeParse(request);
    if (!parsed.success) {
      return null;
    }

    try {
      const snapshot = await options.sessionController.getSnapshot();
      const valid = ipcSchemas[IpcChannels.session.getSnapshot].response.safeParse(snapshot);
      return valid.success ? valid.data : null;
    } catch {
      return null;
    }
  });

  return () => {
    unsubSession();
    unsubActivity();
    ipcMainLike.removeHandler(IpcChannels.session.start);
    ipcMainLike.removeHandler(IpcChannels.session.stop);
    ipcMainLike.removeHandler(IpcChannels.session.getSnapshot);
  };
}
