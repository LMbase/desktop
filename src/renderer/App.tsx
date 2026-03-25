import { useEffect, useState } from 'react';
import { SetupPage } from './pages/SetupPage';
import { SessionPage } from './pages/SessionPage';
import type { SessionSnapshot } from '@shared/contracts/session';

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

  return isInSession ? <SessionPage snapshot={snapshot!} /> : <SetupPage />;
}
