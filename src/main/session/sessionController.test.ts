import { describe, expect, it } from 'vitest';
import type { ExchangeConfig } from '../../shared/contracts/session';
import { createSessionController, type SessionRuntime } from './sessionController';
import type { PairingSocket, PairingSocketMessage } from './pairingSocket';

async function waitFor(condition: () => boolean, attempts = 20): Promise<void> {
  for (let index = 0; index < attempts; index += 1) {
    if (condition()) {
      return;
    }
    await Promise.resolve();
  }
}

class ControlledSocket implements PairingSocket {
  private queue: PairingSocketMessage[] = [];
  private waiters: Array<(message: PairingSocketMessage) => void> = [];
  private open = false;

  sentRegisters: Array<Record<string, unknown>> = [];
  sentUsageReports: Array<Record<string, unknown>> = [];

  connect = async (): Promise<void> => {
    this.open = true;
  };

  readMessage = async (): Promise<PairingSocketMessage> => {
    const msg = this.queue.shift();
    if (msg) {
      return msg;
    }
    return await new Promise<PairingSocketMessage>((resolve) => this.waiters.push(resolve));
  };

  sendRegister = async (message: Record<string, unknown>): Promise<void> => {
    this.sentRegisters.push(message);
  };

  sendUsageReport = async (message: Record<string, unknown>): Promise<void> => {
    this.sentUsageReports.push(message);
  };

  close = async (): Promise<void> => {
    this.open = false;
    this.emit({ type: 'close', reason: 'closed-by-test' });
  };

  isOpen = (): boolean => this.open;

  emit(message: PairingSocketMessage): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(message);
      return;
    }
    this.queue.push(message);
  }
}

const config: ExchangeConfig = {
  provider: 'openai',
  model: 'gpt-4.1-mini',
  tokensOffered: 100,
  wantProvider: 'anthropic',
  wantModel: 'claude-3-5-haiku',
  apiKey: 'secret',
  authMethod: 'api_key',
  githubToken: '',
  inputTokensOffered: 0,
  outputTokensOffered: 0,
  advanced: false,
  proxyPort: 9100,
  proxyUrl: '',
};

describe('sessionController', () => {
  it('re-registers with remaining offer after unpaired', async () => {
    const socket = new ControlledSocket();

    const runtime: SessionRuntime = {
      start: async (_config) => {
        return { proxyUrl: 'https://proxy.example' };
      },
      configurePairing: async () => {},
      stop: async () => {},
    };

    const controller = createSessionController({
      runtime,
      createSocket: () => socket,
      sleep: async () => {},
    });

    const runPromise = controller.start(config);
    await Promise.resolve();

    socket.emit({ type: 'ack', offerId: 'offer1' });
    socket.emit({
      type: 'paired',
      pairing: {
        offerId: 'offer1',
        tempKey: 'temp',
        proxyKey: 'proxy-key',
        peerUrl: 'https://peer.example',
        peerProvider: 'anthropic',
        peerModel: 'claude-3-5-haiku',
        tokensGranted: 60,
        tokensToServe: 100,
        inputTokensGranted: 0,
        outputTokensGranted: 0,
        inputTokensToServe: 0,
        outputTokensToServe: 0,
        advanced: false,
      },
    });

    await Promise.resolve();
    socket.emit({ type: 'unpaired' });
    await waitFor(() => socket.sentRegisters.length >= 2);

    expect(socket.sentRegisters).toHaveLength(2);
    expect(socket.sentRegisters[0].tokens_offered).toBe(100);
    expect(socket.sentRegisters[1].tokens_offered).toBe(100);

    await controller.stop();
    await runPromise;
  });

  it('configures runtime with tempKey when paired', async () => {
    const socket = new ControlledSocket();
    const configurePairing = vi.fn(async () => {});
    const runtime: SessionRuntime = {
      start: async () => ({ proxyUrl: 'https://proxy.example' }),
      configurePairing,
      stop: async () => {},
    };

    const controller = createSessionController({ runtime, createSocket: () => socket, sleep: async () => {} });
    const runPromise = controller.start(config);
    await Promise.resolve();

    socket.emit({ type: 'ack', offerId: 'offer1' });
    socket.emit({
      type: 'paired',
      pairing: {
        offerId: 'offer1',
        tempKey: 'temp-123',
        proxyKey: 'proxy-key',
        peerUrl: 'https://peer.example',
        peerProvider: 'anthropic',
        peerModel: 'claude-3-5-haiku',
        tokensGranted: 60,
        tokensToServe: 100,
        inputTokensGranted: 0,
        outputTokensGranted: 0,
        inputTokensToServe: 0,
        outputTokensToServe: 0,
        advanced: false,
      },
    });

    await waitFor(() => configurePairing.mock.calls.length > 0);
    expect(configurePairing).toHaveBeenCalledWith({
      tempKey: 'temp-123',
      tokenBudget: 100,
      inputBudget: 0,
      outputBudget: 0,
      advanced: false,
    });

    await controller.stop();
    await runPromise;
  });
});
