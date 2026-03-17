import { describe, it, expect } from 'vitest';
import { calculateRemainingOffer, isFulfilled, updateUsage } from './tokens';
import type { PairingInfo, UsageData } from '../contracts/session';

describe('tokens', () => {
  describe('calculateRemainingOffer', () => {
    it('calculates simple mode remaining', () => {
      const pairing: PairingInfo = {
        offerId: 'test',
        tempKey: 'temp',
        proxyKey: 'proxy',
        peerUrl: 'http://test',
        peerProvider: 'openai',
        peerModel: 'gpt-4',
        tokensGranted: 1000,
        tokensToServe: 1000,
        advanced: false,
      };

      const result = calculateRemainingOffer(pairing, {
        tokensToServeDone: 400,
        inputTokensToServeDone: 0,
        outputTokensToServeDone: 0,
      });

      expect(result.tokensToServeRem).toBe(600);
      expect(result.inputTokensToServeRem).toBe(0);
      expect(result.outputTokensToServeRem).toBe(0);
    });

    it('calculates advanced mode remaining', () => {
      const pairing: PairingInfo = {
        offerId: 'test',
        tempKey: 'temp',
        proxyKey: 'proxy',
        peerUrl: 'http://test',
        peerProvider: 'openai',
        peerModel: 'gpt-4',
        tokensGranted: 1000,
        tokensToServe: 1000,
        inputTokensGranted: 700,
        outputTokensGranted: 300,
        inputTokensToServe: 700,
        outputTokensToServe: 300,
        advanced: true,
      };

      const result = calculateRemainingOffer(pairing, {
        tokensToServeDone: 0,
        inputTokensToServeDone: 200,
        outputTokensToServeDone: 50,
      });

      expect(result.tokensToServeRem).toBe(750);
      expect(result.inputTokensToServeRem).toBe(500);
      expect(result.outputTokensToServeRem).toBe(250);
    });

    it('never returns negative remaining', () => {
      const pairing: PairingInfo = {
        offerId: 'test',
        tempKey: 'temp',
        proxyKey: 'proxy',
        peerUrl: 'http://test',
        peerProvider: 'openai',
        peerModel: 'gpt-4',
        tokensGranted: 100,
        tokensToServe: 100,
        advanced: false,
      };

      const result = calculateRemainingOffer(pairing, {
        tokensToServeDone: 150,
        inputTokensToServeDone: 0,
        outputTokensToServeDone: 0,
      });

      expect(result.tokensToServeRem).toBe(0);
    });
  });

  describe('isFulfilled', () => {
    it('returns false when not fulfilled', () => {
      const pairing: PairingInfo = {
        offerId: 'test',
        tempKey: 'temp',
        proxyKey: 'proxy',
        peerUrl: 'http://test',
        peerProvider: 'openai',
        peerModel: 'gpt-4',
        tokensGranted: 1000,
        tokensToServe: 1000,
        advanced: false,
      };

      expect(isFulfilled(pairing, {
        tokensGrantedDone: 500,
        tokensToServeDone: 500,
        inputTokensGrantedDone: 0,
        outputTokensGrantedDone: 0,
        inputTokensToServeDone: 0,
        outputTokensToServeDone: 0,
      })).toBe(false);
    });

    it('returns true when fulfilled', () => {
      const pairing: PairingInfo = {
        offerId: 'test',
        tempKey: 'temp',
        proxyKey: 'proxy',
        peerUrl: 'http://test',
        peerProvider: 'openai',
        peerModel: 'gpt-4',
        tokensGranted: 1000,
        tokensToServe: 1000,
        advanced: false,
      };

      expect(isFulfilled(pairing, {
        tokensGrantedDone: 1000,
        tokensToServeDone: 1000,
        inputTokensGrantedDone: 0,
        outputTokensGrantedDone: 0,
        inputTokensToServeDone: 0,
        outputTokensToServeDone: 0,
      })).toBe(true);
    });
  });

  describe('updateUsage', () => {
    it('updates simple mode usage', () => {
      const current = {
        tokensGrantedDone: 100,
        tokensToServeDone: 200,
        inputTokensGrantedDone: 0,
        outputTokensGrantedDone: 0,
        inputTokensToServeDone: 0,
        outputTokensToServeDone: 0,
      };

      const delta: UsageData = {
        tokensGrantedUpd: 50,
        tokensToServeUpd: 100,
      };

      const result = updateUsage(current, delta, false);

      expect(result.tokensGrantedDone).toBe(150);
      expect(result.tokensToServeDone).toBe(300);
    });

    it('updates advanced mode usage', () => {
      const current = {
        tokensGrantedDone: 0,
        tokensToServeDone: 0,
        inputTokensGrantedDone: 100,
        outputTokensGrantedDone: 200,
        inputTokensToServeDone: 300,
        outputTokensToServeDone: 400,
      };

      const delta: UsageData = {
        inputTokensGrantedUpd: 10,
        outputTokensGrantedUpd: 20,
        inputTokensToServeUpd: 30,
        outputTokensToServeUpd: 40,
      };

      const result = updateUsage(current, delta, true);

      expect(result.inputTokensGrantedDone).toBe(110);
      expect(result.outputTokensGrantedDone).toBe(220);
      expect(result.inputTokensToServeDone).toBe(330);
      expect(result.outputTokensToServeDone).toBe(440);
    });
  });
});
