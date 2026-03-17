import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';

export function ReceiveSummary() {
  const offer = useAppStore((state) => state.offer);
  const receive = useAppStore((state) => state.receive);
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  const totalTokens = offer.advanced
    ? offer.inputTokens + offer.outputTokens
    : offer.tokens;
  const hasSelection = Boolean(
    offer.provider && offer.model && receive.provider && receive.model
  );

  useEffect(() => {
    let active = true;

    if (!hasSelection || totalTokens <= 0 || !offer.provider || !receive.provider) {
      setEstimatedTokens(totalTokens);
      return () => {
        active = false;
      };
    }

    const request = offer.advanced
      ? {
          offeredProvider: offer.provider,
          offeredModel: offer.model,
          wantedProvider: receive.provider,
          wantedModel: receive.model,
          offeredInputTokens: offer.inputTokens,
          offeredOutputTokens: offer.outputTokens,
        }
      : {
          offeredProvider: offer.provider,
          offeredModel: offer.model,
          wantedProvider: receive.provider,
          wantedModel: receive.model,
          offeredTokens: totalTokens,
        };

    void window.tokenhub.providers
      .estimateExchange(request)
      .then((result) => {
        if (!active) {
          return;
        }
        if (result.message === 'OK') {
          setEstimatedTokens(result.estimatedReceivedTokens);
          return;
        }
        setEstimatedTokens(totalTokens);
      })
      .catch(() => {
        if (active) {
          setEstimatedTokens(totalTokens);
        }
      });

    return () => {
      active = false;
    };
  }, [
    hasSelection,
    offer.advanced,
    offer.inputTokens,
    offer.model,
    offer.outputTokens,
    offer.provider,
    receive.model,
    receive.provider,
    totalTokens,
  ]);

  const receivedTokens = estimatedTokens;

  return (
    <div className="receive-summary">
      <div className="receive-value">{receivedTokens.toLocaleString()}</div>
      <div className="receive-unit">tokens you&apos;ll receive</div>

      {hasSelection && (
        <div className="fair-indicator">
          <div className="fair-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="fair-text">
            <strong>Fair exchange</strong> — Rate based on market pricing from both providers
          </div>
        </div>
      )}

      <div className="receive-details">
        <div className="detail-row">
          <span className="detail-label">Your tokens</span>
          <span className="detail-value">{totalTokens.toLocaleString()}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">You receive</span>
          <span className="detail-value success">{receivedTokens.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
