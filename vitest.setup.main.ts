import { vi } from 'vitest';

vi.mock('electron', () => {
  const electronMock = {
    app: {
      getPath: vi.fn((name: string) => `/tmp/electron-test/${name}`),
      getVersion: vi.fn(() => '1.0.0'),
      getName: vi.fn(() => 'TokenHub Test'),
      whenReady: vi.fn(() => Promise.resolve()),
      on: vi.fn(),
      quit: vi.fn(),
    },
    BrowserWindow: vi.fn().mockImplementation(() => ({
      setTitle: vi.fn(),
      loadFile: vi.fn(() => Promise.resolve()),
      loadURL: vi.fn(() => Promise.resolve()),
      webContents: {
        send: vi.fn(),
        openDevTools: vi.fn(),
      },
      close: vi.fn(),
    })),
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn(),
      removeHandler: vi.fn(),
    },
    ipcRenderer: {
      invoke: vi.fn(),
      send: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    safeStorage: {
      isEncryptionAvailable: vi.fn(() => true),
      encryptString: vi.fn((str: string) => Buffer.from(str)),
      decryptString: vi.fn((buf: Buffer) => buf.toString()),
    },
    contextBridge: {
      exposeInMainWorld: vi.fn(),
    },
  };

  return {
    ...electronMock,
    default: electronMock,
  };
});

process.env.TOKENHUB_SERVER = 'ws://localhost:8080';
process.env.NODE_ENV = 'test';
