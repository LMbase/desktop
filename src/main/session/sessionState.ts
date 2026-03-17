import { sessionSnapshotSchema, type ExchangeConfig, type PairingInfo, type SessionSnapshot } from '../../shared/contracts/session';
import type { RemainingOffer } from './registerMessage';

export interface SessionState {
  snapshot: SessionSnapshot;
  ackedOfferId: string | null;
}

export type SessionAction =
  | { type: 'session.start'; config: ExchangeConfig; connectedAt?: number }
  | { type: 'session.ack'; offerId?: string }
  | { type: 'session.paired'; pairing: PairingInfo }
  | { type: 'session.localUsage'; inputTokens: number; outputTokens: number }
  | { type: 'session.peerUsage'; tokens: number; inputTokens: number; outputTokens: number }
  | { type: 'session.clearPairing' }
  | { type: 'session.error'; message: string }
  | { type: 'session.disconnect' };

const EMPTY_SNAPSHOT: SessionSnapshot = {
  status: 'idle',
  config: null,
  pairing: null,
  tokensGrantedDone: 0,
  tokensToServeDone: 0,
  inputTokensGrantedDone: 0,
  outputTokensGrantedDone: 0,
  inputTokensToServeDone: 0,
  outputTokensToServeDone: 0,
};

function clamp(value: number): number {
  return Math.max(0, Math.trunc(value));
}

function normalizePairing(pairing: PairingInfo): PairingInfo {
  const inputTokensGranted = clamp(pairing.inputTokensGranted ?? 0);
  const outputTokensGranted = clamp(pairing.outputTokensGranted ?? 0);
  const inputTokensToServe = clamp(pairing.inputTokensToServe ?? 0);
  const outputTokensToServe = clamp(pairing.outputTokensToServe ?? 0);
  const advanced = pairing.advanced || inputTokensGranted > 0 || outputTokensGranted > 0 || inputTokensToServe > 0 || outputTokensToServe > 0;

  return {
    ...pairing,
    tokensGranted: clamp(pairing.tokensGranted),
    tokensToServe: clamp(pairing.tokensToServe),
    inputTokensGranted,
    outputTokensGranted,
    inputTokensToServe,
    outputTokensToServe,
    advanced,
  };
}

function resetUsage(snapshot: SessionSnapshot): SessionSnapshot {
  return {
    ...snapshot,
    tokensGrantedDone: 0,
    tokensToServeDone: 0,
    inputTokensGrantedDone: 0,
    outputTokensGrantedDone: 0,
    inputTokensToServeDone: 0,
    outputTokensToServeDone: 0,
  };
}

export function createSessionState(): SessionState {
  return { snapshot: EMPTY_SNAPSHOT, ackedOfferId: null };
}

export function reduceSessionState(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'session.start': {
      return {
        ackedOfferId: null,
        snapshot: sessionSnapshotSchema.parse({
          ...EMPTY_SNAPSHOT,
          status: 'connecting',
          config: action.config,
          connectedAt: action.connectedAt ?? Date.now(),
        }),
      };
    }
    case 'session.ack': {
      return {
        ...state,
        ackedOfferId: action.offerId ?? state.ackedOfferId,
        snapshot: { ...state.snapshot, status: state.snapshot.status === 'idle' ? 'connecting' : state.snapshot.status, errorMessage: undefined },
      };
    }
    case 'session.paired': {
      return {
        ...state,
        snapshot: sessionSnapshotSchema.parse({
          ...resetUsage(state.snapshot),
          status: 'paired',
          pairing: normalizePairing(action.pairing),
          errorMessage: undefined,
        }),
      };
    }
    case 'session.localUsage': {
      const pairing = state.snapshot.pairing;
      if (!pairing) {
        return state;
      }
      const inputTokens = clamp(action.inputTokens);
      const outputTokens = clamp(action.outputTokens);
      const simpleDelta = inputTokens + outputTokens;

      if (pairing.advanced) {
        return {
          ...state,
          snapshot: {
            ...state.snapshot,
            inputTokensToServeDone: state.snapshot.inputTokensToServeDone + inputTokens,
            outputTokensToServeDone: state.snapshot.outputTokensToServeDone + outputTokens,
          },
        };
      }

      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          tokensToServeDone: state.snapshot.tokensToServeDone + simpleDelta,
        },
      };
    }
    case 'session.peerUsage': {
      const pairing = state.snapshot.pairing;
      if (!pairing) {
        return state;
      }
      const tokens = clamp(action.tokens);
      const inputTokens = clamp(action.inputTokens);
      const outputTokens = clamp(action.outputTokens);

      if (pairing.advanced) {
        return {
          ...state,
          snapshot: {
            ...state.snapshot,
            inputTokensGrantedDone: state.snapshot.inputTokensGrantedDone + inputTokens,
            outputTokensGrantedDone: state.snapshot.outputTokensGrantedDone + outputTokens,
          },
        };
      }

      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          tokensGrantedDone: state.snapshot.tokensGrantedDone + tokens,
        },
      };
    }
    case 'session.clearPairing': {
      return {
        ...state,
        snapshot: {
          ...resetUsage(state.snapshot),
          status: 'connecting',
          pairing: null,
        },
      };
    }
    case 'session.error': {
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          status: 'error',
          errorMessage: action.message,
        },
      };
    }
    case 'session.disconnect': {
      return {
        ackedOfferId: null,
        snapshot: {
          ...resetUsage(state.snapshot),
          status: 'idle',
          pairing: null,
        },
      };
    }
    default: {
      return state;
    }
  }
}

export function sessionIsFulfilled(state: SessionState): boolean {
  const pairing = state.snapshot.pairing;
  if (!pairing) {
    return false;
  }
  if (!pairing.advanced) {
    return state.snapshot.tokensGrantedDone >= pairing.tokensGranted && state.snapshot.tokensToServeDone >= pairing.tokensToServe;
  }
  return (
    state.snapshot.inputTokensGrantedDone >= pairing.inputTokensGranted &&
    state.snapshot.outputTokensGrantedDone >= pairing.outputTokensGranted &&
    state.snapshot.inputTokensToServeDone >= pairing.inputTokensToServe &&
    state.snapshot.outputTokensToServeDone >= pairing.outputTokensToServe
  );
}

export function getRemainingOffer(state: SessionState): RemainingOffer {
  const pairing = state.snapshot.pairing;
  if (!pairing) {
    return {
      tokensToServeRem: 0,
      inputTokensToServeRem: 0,
      outputTokensToServeRem: 0,
    };
  }

  if (!pairing.advanced) {
    return {
      tokensToServeRem: Math.max(pairing.tokensToServe - state.snapshot.tokensToServeDone, 0),
      inputTokensToServeRem: 0,
      outputTokensToServeRem: 0,
    };
  }

  return {
    tokensToServeRem: Math.max(
      pairing.inputTokensToServe + pairing.outputTokensToServe - state.snapshot.inputTokensToServeDone - state.snapshot.outputTokensToServeDone,
      0,
    ),
    inputTokensToServeRem: Math.max(pairing.inputTokensToServe - state.snapshot.inputTokensToServeDone, 0),
    outputTokensToServeRem: Math.max(pairing.outputTokensToServe - state.snapshot.outputTokensToServeDone, 0),
  };
}

export function pairingLimits(pairing: PairingInfo): {
  tokensServeLimit: number;
  tokensUseLimit: number;
  inputToServe: number;
  outputToServe: number;
} {
  const normalized = normalizePairing(pairing);
  return {
    tokensServeLimit: normalized.tokensToServe || normalized.inputTokensToServe + normalized.outputTokensToServe,
    tokensUseLimit: normalized.tokensGranted || normalized.inputTokensGranted + normalized.outputTokensGranted,
    inputToServe: normalized.inputTokensToServe,
    outputToServe: normalized.outputTokensToServe,
  };
}
