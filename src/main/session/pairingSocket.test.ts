import { afterEach, describe, expect, it, vi } from 'vitest';
import type WebSocket from 'ws';
import { createPairingSocket } from './pairingSocket';

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  onopen: (() => void) | null = null;
  onclose: ((event: { reason?: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ reason: 'closed' });
  }

  emitOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  emitMessage(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  emitError(): void {
    this.onerror?.();
  }
}

const originalGlobalWebSocket = globalThis.WebSocket;

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('ws');
  globalThis.WebSocket = originalGlobalWebSocket;
});

describe('pairingSocket', () => {
  it('parses incoming messages with validation', async () => {
    const ws = new FakeWebSocket();
    const socket = createPairingSocket({
      serverBaseUrl: 'ws://localhost:8080',
      createWebSocket: () => ws as unknown as WebSocket,
    });

    const connectPromise = socket.connect();
    ws.emitOpen();
    await connectPromise;

    ws.emitMessage({ type: 'ack', offer_id: 'abc' });
    expect(await socket.readMessage()).toEqual({ type: 'ack', offerId: 'abc' });

    ws.emitMessage({
      type: 'paired',
      offer_id: 'abc',
      temp_key: 'temp',
      proxy_key: 'proxy',
      peer_url: 'https://peer',
      peer_provider: 'anthropic',
      peer_model: 'claude',
      tokens_granted: 100,
      tokens_to_serve: 90,
    });

    const paired = await socket.readMessage();
    expect(paired.type).toBe('paired');
    if (paired.type === 'paired') {
      expect(paired.pairing.offerId).toBe('abc');
      expect(paired.pairing.peerProvider).toBe('anthropic');
    }

    ws.emitMessage({ type: 'usage_report', tokens: 10, input_tokens: 6, output_tokens: 4 });
    expect(await socket.readMessage()).toEqual({
      type: 'usage_report',
      tokens: 10,
      inputTokens: 6,
      outputTokens: 4,
    });
  });

  it('serializes outbound register and usage report payloads', async () => {
    const ws = new FakeWebSocket();
    const socket = createPairingSocket({
      createWebSocket: () => ws as unknown as WebSocket,
    });

    const connectPromise = socket.connect();
    ws.emitOpen();
    await connectPromise;

    await socket.sendRegister({
      type: 'register',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      tokens_offered: 100,
      want_provider: 'anthropic',
      want_model: 'claude',
      proxy_url: 'https://proxy',
    });
    await socket.sendUsageReport({ type: 'usage_report', offer_id: 'abc', tokens: 12, input_tokens: 7, output_tokens: 5 });

    expect(ws.sent).toHaveLength(2);
    expect(JSON.parse(ws.sent[0]).type).toBe('register');
    expect(JSON.parse(ws.sent[1])).toEqual({
      type: 'usage_report',
      offer_id: 'abc',
      tokens: 12,
      input_tokens: 7,
      output_tokens: 5,
    });
  });

  it('connects without a global WebSocket by using the node websocket client', async () => {
    const ws = new FakeWebSocket();
    const ctor = vi.fn(() => ws);
    Object.assign(ctor, {
      CONNECTING: FakeWebSocket.CONNECTING,
      OPEN: FakeWebSocket.OPEN,
      CLOSED: FakeWebSocket.CLOSED,
    });

    vi.resetModules();
    vi.doMock('ws', () => ({ default: ctor }));
    globalThis.WebSocket = undefined as typeof globalThis.WebSocket;

    const { createPairingSocket: createPairingSocketWithoutGlobal } = await import('./pairingSocket');
    const socket = createPairingSocketWithoutGlobal({ serverBaseUrl: 'ws://localhost:8080' });

    const connectPromise = socket.connect();
    ws.emitOpen();
    await connectPromise;

    expect(ctor).toHaveBeenCalledWith('ws://localhost:8080/ws');
    expect(socket.isOpen()).toBe(true);
  });
});
