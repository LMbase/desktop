import electron from 'electron';
const { BrowserWindow, ipcMain } = electron;
import {
  IpcChannels,
  copilotStatusEventSchema,
  ipcEventChannels,
  ipcSchemas,
  type CopilotStatusEvent,
} from '../../shared/contracts/ipc';
import { pollForAccessToken, requestDeviceCode } from '../auth/copilotDeviceFlow';

interface IpcMainHandleLike {
  handle: (
    channel: string,
    listener: (event: unknown, request: unknown) => Promise<unknown> | unknown,
  ) => void;
  removeHandler: (channel: string) => void;
}

export interface CopilotDeviceFlow {
  requestDeviceCode: typeof requestDeviceCode;
  pollForAccessToken: typeof pollForAccessToken;
}

interface AuthState {
  status: CopilotStatusEvent['status'];
  token?: string;
  error?: string;
  deviceCode?: string;
  userCode?: string;
  verificationUri?: string;
}

interface RegisterAuthHandlersOptions {
  ipcMainLike?: IpcMainHandleLike;
  deviceFlow?: CopilotDeviceFlow;
  emitStatus?: (payload: CopilotStatusEvent) => void;
}

function defaultEmitStatus(payload: CopilotStatusEvent): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(ipcEventChannels.copilotStatus, payload);
  }
}

function errorMessageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function registerAuthHandlers(options: RegisterAuthHandlersOptions = {}): () => void {
  const ipcMainLike = options.ipcMainLike ?? ipcMain;
  const deviceFlow = options.deviceFlow ?? { requestDeviceCode, pollForAccessToken };
  const emitStatus = options.emitStatus ?? defaultEmitStatus;

  const state: AuthState = { status: 'cancelled' };
  let inFlight = false;
  let cancelled = false;

  const publishStatus = (payload: CopilotStatusEvent): void => {
    const valid = copilotStatusEventSchema.safeParse(payload);
    if (valid.success) {
      emitStatus(valid.data);
    }
  };

  const toStatusPayload = (): CopilotStatusEvent => {
    return {
      status: state.status,
      token: state.token,
      error: state.error,
    };
  };

  ipcMainLike.handle(IpcChannels.auth.startCopilotAuth, async (_event, request) => {
    const parsed = ipcSchemas[IpcChannels.auth.startCopilotAuth].request.safeParse(request);
    if (!parsed.success) {
      state.status = 'error';
      state.error = 'Invalid request payload';
      publishStatus(toStatusPayload());
      return { deviceCode: '', userCode: '', verificationUri: '' };
    }

    if (!inFlight) {
      inFlight = true;
      cancelled = false;
      state.status = 'pending';
      state.error = undefined;
      state.token = undefined;

      try {
        const deviceCode = await deviceFlow.requestDeviceCode();
        state.deviceCode = deviceCode.deviceCode;
        state.userCode = deviceCode.userCode;
        state.verificationUri = deviceCode.verificationUri;

        publishStatus(toStatusPayload());

        void deviceFlow
          .pollForAccessToken(deviceCode.deviceCode, {
            interval: deviceCode.interval,
            expiresIn: deviceCode.expiresIn,
            sleep: async (seconds: number) => {
              if (cancelled) {
                throw new Error('cancelled');
              }
              await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
            },
          })
          .then((token: string) => {
            if (cancelled) {
              return;
            }
            state.status = 'success';
            state.token = token;
            state.error = undefined;
            publishStatus(toStatusPayload());
          })
          .catch((error: unknown) => {
            if (cancelled || errorMessageFromUnknown(error) === 'cancelled') {
              state.status = 'cancelled';
              state.error = undefined;
              publishStatus(toStatusPayload());
              return;
            }
            state.status = 'error';
            state.error = errorMessageFromUnknown(error);
            publishStatus(toStatusPayload());
          })
          .finally(() => {
            inFlight = false;
          });
      } catch (error) {
        state.status = 'error';
        state.error = errorMessageFromUnknown(error);
        inFlight = false;
        publishStatus(toStatusPayload());
      }
    }

    return {
      deviceCode: state.deviceCode ?? '',
      userCode: state.userCode ?? '',
      verificationUri: state.verificationUri ?? '',
    };
  });

  ipcMainLike.handle(IpcChannels.auth.cancelCopilotAuth, async (_event, request) => {
    const parsed = ipcSchemas[IpcChannels.auth.cancelCopilotAuth].request.safeParse(request);
    if (!parsed.success) {
      state.status = 'error';
      state.error = 'Invalid request payload';
      publishStatus(toStatusPayload());
      return;
    }

    cancelled = true;
    inFlight = false;
    state.status = 'cancelled';
    state.error = undefined;
    state.token = undefined;
    publishStatus(toStatusPayload());
  });

  ipcMainLike.handle(IpcChannels.auth.getCopilotAuthStatus, async (_event, request) => {
    const parsed = ipcSchemas[IpcChannels.auth.getCopilotAuthStatus].request.safeParse(request);
    if (!parsed.success) {
      return { status: 'error', error: 'Invalid request payload' };
    }
    return toStatusPayload();
  });

  return () => {
    ipcMainLike.removeHandler(IpcChannels.auth.startCopilotAuth);
    ipcMainLike.removeHandler(IpcChannels.auth.cancelCopilotAuth);
    ipcMainLike.removeHandler(IpcChannels.auth.getCopilotAuthStatus);
  };
}
