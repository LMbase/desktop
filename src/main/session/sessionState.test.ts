import { describe, expect, it } from 'vitest';
import type { ExchangeConfig, PairingInfo } from '../../shared/contracts/session';
import { createSessionState, getRemainingOffer, reduceSessionState, sessionIsFulfilled } from './sessionState';

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
  proxyUrl: 'https://proxy.example',
};

describe('sessionState', () => {
  it('tracks simple lifecycle usage and fulfillment', () => {
    let state = createSessionState();
    state = reduceSessionState(state, { type: 'session.start', config, connectedAt: 1 });

    const pairing: PairingInfo = {
      offerId: 'abc123',
      tempKey: 'temp',
      proxyKey: 'proxy',
      peerUrl: 'https://peer.example',
      peerProvider: 'anthropic',
      peerModel: 'claude',
      tokensGranted: 60,
      tokensToServe: 90,
      inputTokensGranted: 0,
      outputTokensGranted: 0,
      inputTokensToServe: 0,
      outputTokensToServe: 0,
      advanced: false,
    };

    state = reduceSessionState(state, { type: 'session.paired', pairing });
    state = reduceSessionState(state, { type: 'session.localUsage', inputTokens: 10, outputTokens: 20 });
    state = reduceSessionState(state, { type: 'session.peerUsage', tokens: 60, inputTokens: 0, outputTokens: 0 });

    expect(state.snapshot.tokensToServeDone).toBe(30);
    expect(state.snapshot.tokensGrantedDone).toBe(60);
    expect(sessionIsFulfilled(state)).toBe(false);
    expect(getRemainingOffer(state).tokensToServeRem).toBe(60);

    state = reduceSessionState(state, { type: 'session.localUsage', inputTokens: 30, outputTokens: 30 });
    expect(sessionIsFulfilled(state)).toBe(true);
  });

  it('tracks advanced mode in input/output splits', () => {
    let state = createSessionState();
    state = reduceSessionState(state, { type: 'session.start', config: { ...config, advanced: true }, connectedAt: 1 });
    state = reduceSessionState(state, {
      type: 'session.paired',
      pairing: {
        offerId: 'adv',
        tempKey: 'temp',
        proxyKey: 'proxy',
        peerUrl: 'https://peer.example',
        peerProvider: 'anthropic',
        peerModel: 'claude',
        tokensGranted: 0,
        tokensToServe: 0,
        inputTokensGranted: 50,
        outputTokensGranted: 20,
        inputTokensToServe: 40,
        outputTokensToServe: 10,
        advanced: true,
      },
    });

    state = reduceSessionState(state, { type: 'session.localUsage', inputTokens: 40, outputTokens: 10 });
    state = reduceSessionState(state, { type: 'session.peerUsage', tokens: 70, inputTokens: 50, outputTokens: 20 });

    expect(state.snapshot.inputTokensToServeDone).toBe(40);
    expect(state.snapshot.outputTokensToServeDone).toBe(10);
    expect(state.snapshot.inputTokensGrantedDone).toBe(50);
    expect(state.snapshot.outputTokensGrantedDone).toBe(20);
    expect(sessionIsFulfilled(state)).toBe(true);
    expect(getRemainingOffer(state)).toEqual({
      tokensToServeRem: 0,
      inputTokensToServeRem: 0,
      outputTokensToServeRem: 0,
    });
  });
});
