import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(window, 'tokenhub', {
  value: {
    providers: {
      fetchModels: vi.fn(() => Promise.resolve({ models: [], message: 'OK' })),
      validateKey: vi.fn(() => Promise.resolve({ valid: true, message: 'OK' })),
    },
    auth: {
      startCopilotAuth: vi.fn(() => Promise.resolve({ deviceCode: 'ABC123', userCode: 'ABCD-1234', verificationUri: 'https://github.com/login/device' })),
      cancelCopilotAuth: vi.fn(),
      onCopilotStatus: vi.fn(() => () => {}),
      openExternal: vi.fn(() => Promise.resolve()),
    },
    session: {
      start: vi.fn(() => Promise.resolve({ success: true })),
      stop: vi.fn(() => Promise.resolve()),
      getSnapshot: vi.fn(() => Promise.resolve(null)),
      onSessionUpdate: vi.fn(() => () => {}),
      onActivityLog: vi.fn(() => () => {}),
    },
    settings: {
      get: vi.fn(() => Promise.resolve(null)),
      set: vi.fn(() => Promise.resolve()),
    },
  },
  writable: true,
});

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }

  send = vi.fn();
  close = vi.fn();
}

(global as any).WebSocket = MockWebSocket;
