import type { ExchangeConfig, SessionSnapshot } from '../../shared/contracts/session';
import { createActivityLog, type ActivityLog } from './activityLog';
import { buildInitialRegisterMessage, buildRemainingRegisterMessage } from './registerMessage';
import { createPairingSocket, type PairingSocket } from './pairingSocket';
import {
  createSessionState,
  getRemainingOffer,
  pairingLimits,
  reduceSessionState,
  sessionIsFulfilled,
  type SessionState,
} from './sessionState';
import { createSessionEventPublisher, type SessionEventPublisher } from './publishSessionEvents';

export interface SessionRuntime {
  start: (config: ExchangeConfig, onTokensServed: (inputTokens: number, outputTokens: number) => Promise<void>) => Promise<{ proxyUrl: string }>;
  configurePairing: (params: {
    tempKey: string;
    tokenBudget: number;
    inputBudget: number;
    outputBudget: number;
    advanced: boolean;
  }) => Promise<void>;
  stop: () => Promise<void>;
}

export interface CopilotRefreshLoop {
  start: (config: ExchangeConfig) => Promise<void>;
  stop: () => Promise<void>;
}

interface SessionControllerOptions {
  runtime: SessionRuntime;
  createSocket?: () => PairingSocket;
  publisher?: SessionEventPublisher;
  activityLog?: ActivityLog;
  createCopilotRefresh?: () => CopilotRefreshLoop;
  sleep?: (ms: number) => Promise<void>;
}

export interface SessionController {
  start: (config: ExchangeConfig) => Promise<{ success: boolean; error?: string }>;
  stop: () => Promise<void>;
  getSnapshot: () => SessionSnapshot;
  getActivityLog: () => ReturnType<ActivityLog['list']>;
  onSessionUpdate: (listener: (snapshot: SessionSnapshot) => void) => () => void;
  onActivity: (listener: (event: ReturnType<ActivityLog['append']>) => void) => () => void;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function disconnectLikeError(message: string): boolean {
  const lowered = message.toLowerCase();
  return lowered.includes('disconnect') || lowered.includes('peer') || lowered.includes('terminated');
}

export function createSessionController(options: SessionControllerOptions): SessionController {
  const publisher = options.publisher ?? createSessionEventPublisher({ targets: () => [] });
  const activityLog = options.activityLog ?? createActivityLog();
  const createSocket = options.createSocket ?? (() => createPairingSocket());
  const sleep = options.sleep ?? defaultSleep;

  let state: SessionState = createSessionState();
  let running = false;
  let stopRequested = false;
  let socket: PairingSocket | null = null;
  let refresh: CopilotRefreshLoop | null = null;
  let serial = Promise.resolve();
  const snapshotListeners = new Set<(snapshot: SessionSnapshot) => void>();
  const activityListeners = new Set<(event: ReturnType<ActivityLog['append']>) => void>();

  const dispatch = (action: Parameters<typeof reduceSessionState>[1]): void => {
    state = reduceSessionState(state, action);
    publisher.publishSnapshot(state.snapshot);
    for (const listener of snapshotListeners) {
      listener(state.snapshot);
    }
  };

  const log = (type: 'info' | 'success' | 'warning' | 'error', message: string): void => {
    const event = activityLog.append({ type, message });
    publisher.publishActivity(event);
    for (const listener of activityListeners) {
      listener(event);
    }
  };

  const endCurrentPairing = async (reason: 'local_limits_reached' | 'peer_disconnected'): Promise<boolean> => {
    const config = state.snapshot.config;
    const pairing = state.snapshot.pairing;
    if (!config || !pairing) {
      return false;
    }

    const remaining = getRemainingOffer(state);
    dispatch({ type: 'session.clearPairing' });

    if (remaining.tokensToServeRem <= 0) {
      log('success', 'All offered tokens served; ending session.');
      stopRequested = true;
      return false;
    }

    const detail = reason === 'local_limits_reached' ? 'pairing completed' : 'peer disconnected';
    log('warning', `${detail}; re-registering with ${remaining.tokensToServeRem} tokens remaining.`);

    if (socket?.isOpen()) {
      await socket.sendRegister(buildRemainingRegisterMessage(config, remaining));
      return true;
    }
    return true;
  };

  const withSerial = async (fn: () => Promise<void>): Promise<void> => {
    serial = serial.then(fn, fn);
    await serial;
  };

  const onTokensServed = async (inputTokens: number, outputTokens: number): Promise<void> => {
    await withSerial(async () => {
      const pairing = state.snapshot.pairing;
      if (!pairing) {
        return;
      }
      dispatch({ type: 'session.localUsage', inputTokens, outputTokens });
      log('info', `Served usage ${inputTokens + outputTokens} tokens.`);

      if (socket?.isOpen()) {
        await socket.sendUsageReport({
          type: 'usage_report',
          offer_id: pairing.offerId,
          tokens: Math.max(0, inputTokens + outputTokens),
          input_tokens: Math.max(0, inputTokens),
          output_tokens: Math.max(0, outputTokens),
        });
      }

      if (sessionIsFulfilled(state)) {
        await endCurrentPairing('local_limits_reached');
      }
    });
  };

  return {
    start: async (config) => {
      if (running) {
        return { success: false, error: 'Session already running' };
      }

      running = true;
      stopRequested = false;
      dispatch({ type: 'session.start', config });
      log('info', 'Session starting.');

      try {
        const runtimeStart = await options.runtime.start(config, onTokensServed);
        const startedConfig: ExchangeConfig = { ...config, proxyUrl: runtimeStart.proxyUrl };
        dispatch({ type: 'session.start', config: startedConfig });
        log('success', `Proxy/tunnel started at ${runtimeStart.proxyUrl}.`);

        while (!stopRequested) {
          socket = createSocket();
          await socket.connect();
          log('success', 'Connected to pairing server.');

          const firstRegister = state.snapshot.pairing
            ? buildRemainingRegisterMessage(startedConfig, getRemainingOffer(state))
            : buildInitialRegisterMessage(startedConfig);
          await socket.sendRegister(firstRegister);

          while (!stopRequested) {
            const message = await socket.readMessage();

            if (message.type === 'close') {
              log('warning', `WebSocket closed${message.reason ? `: ${message.reason}` : ''}.`);
              if (state.snapshot.pairing) {
                await endCurrentPairing('peer_disconnected');
              }
              break;
            }

            if (message.type === 'ack') {
              dispatch({ type: 'session.ack', offerId: message.offerId ?? undefined });
              log('info', 'Registered and waiting for a match.');
              continue;
            }

            if (message.type === 'paired') {
              dispatch({ type: 'session.paired', pairing: message.pairing });
              const limits = pairingLimits(message.pairing);
              await options.runtime.configurePairing({
                tempKey: message.pairing.tempKey,
                tokenBudget: limits.tokensServeLimit,
                inputBudget: limits.inputToServe,
                outputBudget: limits.outputToServe,
                advanced: message.pairing.advanced,
              });

              if (startedConfig.authMethod === 'copilot' && options.createCopilotRefresh) {
                refresh ??= options.createCopilotRefresh();
                await refresh.start(startedConfig);
              }

              log('success', `Paired with ${message.pairing.peerProvider}/${message.pairing.peerModel}.`);
              continue;
            }

            if (message.type === 'usage_report') {
              dispatch({
                type: 'session.peerUsage',
                tokens: message.tokens,
                inputTokens: message.inputTokens,
                outputTokens: message.outputTokens,
              });
              log('info', `Peer usage ${message.tokens} tokens.`);
              if (sessionIsFulfilled(state)) {
                await endCurrentPairing('local_limits_reached');
              }
              continue;
            }

            if (message.type === 'unpaired') {
              log('warning', 'Peer disconnected; ending active pairing.');
              await endCurrentPairing('peer_disconnected');
              continue;
            }

            dispatch({ type: 'session.error', message: message.message });
            log('error', `Server error: ${message.message}`);
            if (state.snapshot.pairing && disconnectLikeError(message.message)) {
              await endCurrentPairing('peer_disconnected');
            }
          }

          await socket.close();
          socket = null;

          if (!stopRequested) {
            await sleep(400);
          }
        }

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        dispatch({ type: 'session.error', message });
        log('error', `Session failed: ${message}`);
        return { success: false, error: message };
      } finally {
        stopRequested = true;
        if (socket) {
          await socket.close();
          socket = null;
        }
        if (refresh) {
          await refresh.stop();
          refresh = null;
        }
        await options.runtime.stop();
        dispatch({ type: 'session.disconnect' });
        log('info', 'Session stopped.');
        running = false;
      }
    },

    stop: async () => {
      stopRequested = true;
      if (socket) {
        await socket.close();
      }
    },

      getSnapshot: () => state.snapshot,
      getActivityLog: () => activityLog.list(),
      onSessionUpdate: (listener) => {
        snapshotListeners.add(listener);
        return () => snapshotListeners.delete(listener);
      },
      onActivity: (listener) => {
        activityListeners.add(listener);
        return () => activityListeners.delete(listener);
      },
  };
}
