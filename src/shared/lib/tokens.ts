import type { ExchangeConfig, PairingInfo, UsageData } from '../contracts/session';

export function calculateRemainingOffer(
  pairing: PairingInfo,
  usage: { tokensToServeDone: number; inputTokensToServeDone: number; outputTokensToServeDone: number }
): { tokensToServeRem: number; inputTokensToServeRem: number; outputTokensToServeRem: number } {
  if (pairing.advanced) {
    return {
      tokensToServeRem: Math.max(
        pairing.inputTokensToServe + pairing.outputTokensToServe - usage.inputTokensToServeDone - usage.outputTokensToServeDone,
        0
      ),
      inputTokensToServeRem: Math.max(pairing.inputTokensToServe - usage.inputTokensToServeDone, 0),
      outputTokensToServeRem: Math.max(pairing.outputTokensToServe - usage.outputTokensToServeDone, 0),
    };
  }

  return {
    tokensToServeRem: Math.max(pairing.tokensToServe - usage.tokensToServeDone, 0),
    inputTokensToServeRem: 0,
    outputTokensToServeRem: 0,
  };
}

export function isFulfilled(
  pairing: PairingInfo,
  usage: { tokensGrantedDone: number; tokensToServeDone: number; inputTokensGrantedDone: number; outputTokensGrantedDone: number; inputTokensToServeDone: number; outputTokensToServeDone: number }
): boolean {
  if (pairing.advanced) {
    return (
      usage.inputTokensGrantedDone >= pairing.inputTokensGranted &&
      usage.outputTokensGrantedDone >= pairing.outputTokensGranted &&
      usage.inputTokensToServeDone >= pairing.inputTokensToServe &&
      usage.outputTokensToServeDone >= pairing.outputTokensToServe
    );
  }

  return usage.tokensGrantedDone >= pairing.tokensGranted && usage.tokensToServeDone >= pairing.tokensToServe;
}

export function updateUsage(
  current: { tokensGrantedDone: number; tokensToServeDone: number; inputTokensGrantedDone: number; outputTokensGrantedDone: number; inputTokensToServeDone: number; outputTokensToServeDone: number },
  delta: UsageData,
  isAdvanced: boolean
): typeof current {
  if (isAdvanced) {
    return {
      tokensGrantedDone: current.tokensGrantedDone,
      tokensToServeDone: current.tokensToServeDone,
      inputTokensGrantedDone: current.inputTokensGrantedDone + (delta.inputTokensGrantedUpd || 0),
      outputTokensGrantedDone: current.outputTokensGrantedDone + (delta.outputTokensGrantedUpd || 0),
      inputTokensToServeDone: current.inputTokensToServeDone + (delta.inputTokensToServeUpd || 0),
      outputTokensToServeDone: current.outputTokensToServeDone + (delta.outputTokensToServeUpd || 0),
    };
  }

  return {
    ...current,
    tokensGrantedDone: current.tokensGrantedDone + (delta.tokensGrantedUpd || 0),
    tokensToServeDone: current.tokensToServeDone + (delta.tokensToServeUpd || 0),
  };
}
