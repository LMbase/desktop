import { useEffect, useState } from 'react';
import { SetupPage } from './pages/SetupPage';
import { SessionPage } from './pages/SessionPage';
import { TokenHubLogo } from './components/Logo';
import type { SessionSnapshot } from '@shared/contracts/session';
import './styles/global.css';

export function App() {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);

  useEffect(() => {
    const unsubscribe = window.lmbase.session.onSessionUpdate((newSnapshot: SessionSnapshot | null) => {
      setSnapshot(newSnapshot);
    });

    window.lmbase.session.getSnapshot().then((initial: SessionSnapshot | null) => {
      if (initial) setSnapshot(initial);
    });

    return unsubscribe;
  }, []);

  const isInSession = snapshot?.status === 'paired' || snapshot?.status === 'connecting';

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-mark">
            <TokenHubLogo size={20} />
          </div>
          <span className="logo-text">TokenHub</span>
          <span className="logo-tagline">P2P AI Token Exchange</span>
        </div>
        <div className="header-status">
          <div className="status-pill">
            <span className="dot" />
            Live
          </div>
        </div>
      </header>
      {isInSession ? <SessionPage snapshot={snapshot!} /> : <SetupPage />}
    </div>
  );
}
