import { useEffect, useState } from 'react';
import { SetupPage } from './pages/SetupPage';
import { SessionPage } from './pages/SessionPage';
import type { SessionSnapshot } from '@shared/contracts/session';
import './styles/global.css';

function TokenHubLogo() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="TokenHub"
    >
      <path
        d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 12L11 9L14 12"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 12L13 15L10 12"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
      <header className="header">
        <div className="logo">
          <div className="logo-mark">
            <TokenHubLogo />
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
