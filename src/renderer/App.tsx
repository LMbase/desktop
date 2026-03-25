import { useEffect, useState } from 'react';
import { SetupPage } from './pages/SetupPage';
import { SessionPage } from './pages/SessionPage';
import type { SessionSnapshot } from '@shared/contracts/session';

function TokenHubLogo() {
  return (
    <div className="logo">
      <div className="logo-mark">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <span className="logo-text">TokenHub</span>
    </div>
  );
}

export function App() {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);

  useEffect(() => {
    const unsubscribe = window.lmbase.session.onSessionUpdate(
      (newSnapshot: SessionSnapshot | null) => {
        setSnapshot(newSnapshot);
      },
    );

    window.lmbase.session.getSnapshot().then((initial: SessionSnapshot | null) => {
      if (initial) setSnapshot(initial);
    });

    return unsubscribe;
  }, []);

  const isInSession = snapshot?.status === 'paired' || snapshot?.status === 'connecting';

  return (
    <div className="app">
      <header className="header animate-fade">
        <TokenHubLogo />
        <div className="header-status">
          <span className="version-badge">v1.0.0</span>
          <div className="live-badge">
            <span className="live-dot" />
            Live
          </div>
        </div>
      </header>
      <main className="main">
        {isInSession ? <SessionPage snapshot={snapshot!} /> : <SetupPage />}
      </main>
    </div>
  );
}
