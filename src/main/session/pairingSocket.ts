import WebSocket from 'ws';
import { z } from 'zod';
import { DEFAULT_LMBASE_SERVER } from '../../shared/constants';
import type { PairingInfo } from '../../shared/contracts/session';
import type { RegisterWireMessage } from './registerMessage';

const ackSchema = z.object({ type: z.literal('ack'), offer_id: z.string().optional() });
const pairedSchema = z.object({
  type: z.literal('paired'),
  offer_id: z.string(),
  temp_key: z.string(),
  proxy_key: z.string(),
  peer_url: z.string(),
  peer_provider: z.enum(['openai', 'anthropic', 'gemini', 'github-copilot']),
  peer_model: z.string(),
  tokens_granted: z.number().int(),
  tokens_to_serve: z.number().int(),
  input_tokens_granted: z.number().int().optional(),
  output_tokens_granted: z.number().int().optional(),
  input_tokens_to_serve: z.number().int().optional(),
  output_tokens_to_serve: z.number().int().optional(),
});
const usageSchema = z.object({
  type: z.literal('usage_report'),
  tokens: z.number().int(),
  input_tokens: z.number().int().optional(),
  output_tokens: z.number().int().optional(),
});
const unpairedSchema = z.object({ type: z.literal('unpaired') });
const errorSchema = z.object({ type: z.literal('error'), message: z.string() });

const incomingSchema = z.discriminatedUnion('type', [ackSchema, pairedSchema, usageSchema, unpairedSchema, errorSchema]);

const usageReportOutSchema = z.object({
  type: z.literal('usage_report'),
  offer_id: z.string(),
  tokens: z.number().int().nonnegative(),
  input_tokens: z.number().int().nonnegative().optional(),
  output_tokens: z.number().int().nonnegative().optional(),
});

type UsageReportOut = z.infer<typeof usageReportOutSchema>;

type SocketEvent = { type: 'open' } | { type: 'close'; reason?: string } | { type: 'message'; data: unknown };

export type PairingSocketMessage =
  | { type: 'ack'; offerId: string | null }
  | { type: 'paired'; pairing: PairingInfo }
  | { type: 'usage_report'; tokens: number; inputTokens: number; outputTokens: number }
  | { type: 'unpaired' }
  | { type: 'error'; message: string }
  | { type: 'close'; reason?: string };

export interface PairingSocket {
  connect: () => Promise<void>;
  readMessage: () => Promise<PairingSocketMessage>;
  sendRegister: (message: RegisterWireMessage) => Promise<void>;
  sendUsageReport: (message: UsageReportOut) => Promise<void>;
  close: () => Promise<void>;
  isOpen: () => boolean;
}

interface PairingSocketOptions {
  serverBaseUrl?: string;
  createWebSocket?: (url: string) => WebSocket;
}

function wsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/ws`;
}

function parsePairing(value: z.infer<typeof pairedSchema>): PairingInfo {
  return {
    offerId: value.offer_id,
    tempKey: value.temp_key,
    proxyKey: value.proxy_key,
    peerUrl: value.peer_url,
    peerProvider: value.peer_provider,
    peerModel: value.peer_model,
    tokensGranted: value.tokens_granted,
    tokensToServe: value.tokens_to_serve,
    inputTokensGranted: value.input_tokens_granted ?? 0,
    outputTokensGranted: value.output_tokens_granted ?? 0,
    inputTokensToServe: value.input_tokens_to_serve ?? 0,
    outputTokensToServe: value.output_tokens_to_serve ?? 0,
    advanced:
      (value.input_tokens_granted ?? 0) > 0 ||
      (value.output_tokens_granted ?? 0) > 0 ||
      (value.input_tokens_to_serve ?? 0) > 0 ||
      (value.output_tokens_to_serve ?? 0) > 0,
  };
}

export function createPairingSocket(options: PairingSocketOptions = {}): PairingSocket {
  const createWebSocket = options.createWebSocket ?? ((url) => new WebSocket(url));
  const queue: SocketEvent[] = [];
  const waiters: Array<(event: SocketEvent) => void> = [];
  let socket: WebSocket | null = null;

  const push = (event: SocketEvent): void => {
    const waiter = waiters.shift();
    if (waiter) {
      waiter(event);
      return;
    }
    queue.push(event);
  };

  const readEvent = async (): Promise<SocketEvent> => {
    const event = queue.shift();
    if (event) {
      return event;
    }
    return await new Promise<SocketEvent>((resolve) => {
      waiters.push(resolve);
    });
  };

  const sendJson = async (payload: unknown): Promise<void> => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    socket.send(JSON.stringify(payload));
  };

  return {
    connect: async () => {
      const targetUrl = wsUrl(options.serverBaseUrl ?? process.env.LMBASE_SERVER ?? DEFAULT_LMBASE_SERVER);
      socket = createWebSocket(targetUrl);
      socket.onopen = () => push({ type: 'open' });
      socket.onclose = (event) => push({ type: 'close', reason: event.reason || undefined });
      socket.onerror = () => push({ type: 'close', reason: 'socket-error' });
      socket.onmessage = (event) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(String(event.data));
        } catch {
          push({ type: 'message', data: { type: 'error', message: 'invalid-json' } });
          return;
        }
        push({ type: 'message', data: parsed });
      };

      while (true) {
        const event = await readEvent();
        if (event.type === 'open') {
          return;
        }
        if (event.type === 'close') {
          throw new Error(event.reason ?? 'connection-failed');
        }
      }
    },

    readMessage: async () => {
      while (true) {
        const event = await readEvent();
        if (event.type === 'close') {
          return { type: 'close', reason: event.reason };
        }
        if (event.type !== 'message') {
          continue;
        }
        const parsed = incomingSchema.safeParse(event.data);
        if (!parsed.success) {
          return { type: 'error', message: `invalid-message:${parsed.error.issues[0]?.message ?? 'unknown'}` };
        }

        const msg = parsed.data;
        if (msg.type === 'ack') {
          return { type: 'ack', offerId: msg.offer_id ?? null };
        }
        if (msg.type === 'paired') {
          return { type: 'paired', pairing: parsePairing(msg) };
        }
        if (msg.type === 'usage_report') {
          return {
            type: 'usage_report',
            tokens: msg.tokens,
            inputTokens: msg.input_tokens ?? 0,
            outputTokens: msg.output_tokens ?? 0,
          };
        }
        if (msg.type === 'unpaired') {
          return { type: 'unpaired' };
        }
        return { type: 'error', message: msg.message };
      }
    },

    sendRegister: async (message) => {
      await sendJson(message);
    },

    sendUsageReport: async (message) => {
      await sendJson(usageReportOutSchema.parse(message));
    },

    close: async () => {
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
      socket = null;
    },

    isOpen: () => Boolean(socket && socket.readyState === WebSocket.OPEN),
  };
}
