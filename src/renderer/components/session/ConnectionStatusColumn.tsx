import { useState, useEffect, useRef } from 'react';
import type { SessionSnapshot } from '@shared/contracts/session';
import './ConnectionStatusColumn.css';

interface ConnectionStatusColumnProps {
  session: SessionSnapshot;
  onDisconnect: () => void;
  sessionStartTime: number;
}

export function ConnectionStatusColumn({
  session,
  onDisconnect,
  sessionStartTime,
}: ConnectionStatusColumnProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const start = sessionStartTime || session.connectedAt || now;
      const diff = Math.floor((now - start) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionStartTime, session.connectedAt]);

  const handleDisconnect = () => {
    if (showConfirm) {
      onDisconnect();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  const isActive = session.status === 'paired';
  const peer = session.pairing;

  return (
    <div className="session-column">
      <div className="connection-section">
        <div className="section-title">Connection</div>
        <div className="status-card">
          <div className="status-item">
            <span className="status-label">Status</span>
            <span className={`status-value ${isActive ? 'success' : ''}`}>
              {isActive ? 'Active' : session.status}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Peer</span>
            <span className="status-value">{peer?.offerId.slice(0, 12) || '—'}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Session ID</span>
            <span className="status-value">{peer?.offerId.slice(0, 10) || '—'}</span>
          </div>
        </div>
      </div>

      <div className="timer-display">{elapsed}</div>

      {peer && (
        <div className="connection-section">
          <div className="section-title">Your Peer</div>
          <div className="status-card">
            <div className="status-item">
              <span className="status-label">Provider</span>
              <span className="status-value">{formatProvider(peer.peerProvider)}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Model</span>
              <span className="status-value">{peer.peerModel}</span>
            </div>
          </div>
        </div>
      )}

      <div className="disconnect-section">
        <button
          className={`btn-disconnect ${showConfirm ? 'confirm' : ''}`}
          onClick={handleDisconnect}
        >
          {showConfirm ? 'Click again to disconnect' : 'Disconnect Session'}
        </button>
      </div>
    </div>
  );
}

function formatProvider(provider: string): string {
  const providerNames: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Gemini',
    'github-copilot': 'Copilot',
  };
  return providerNames[provider] || provider;
}