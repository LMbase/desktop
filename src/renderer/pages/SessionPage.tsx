import { useState, useEffect, useCallback } from 'react';
import type { SessionSnapshot, ActivityEvent } from '../../shared/contracts/session';
import { ConnectionStatusColumn } from '../components/session/ConnectionStatusColumn';
import { UsageAndCodeColumn } from '../components/session/UsageAndCodeColumn';
import { ActivityLogColumn } from '../components/session/ActivityLogColumn';
import { StatusBar } from '../components/session/StatusBar';
import { sessionTestIds } from '../lib/testIds';
import '../styles/tokens.css';
import '../styles/design-system.css';
import './SessionPage.css';

interface SessionPageProps {
  snapshot?: SessionSnapshot;
}

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

export function SessionPage({ snapshot = EMPTY_SNAPSHOT }: SessionPageProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const sessionStartTime = snapshot.connectedAt ?? Date.now();
  const wsConnected = snapshot.status === 'connecting' || snapshot.status === 'paired';

  useEffect(() => {
    const unsubscribe = window.lmbase.session.onActivityLog((activity: ActivityEvent) => {
      setActivities((prev) => [...prev, activity]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDisconnect = useCallback(() => {
    void window.lmbase.session.stop();
  }, []);

  const tunnelUrl = snapshot.pairing?.peerUrl || snapshot.config?.proxyUrl || '';
  const proxyPort = snapshot.config?.proxyPort || 9100;

  return (
    <div className="session-page" data-testid={sessionTestIds.page}>
      <div className="session-layout">
        <ConnectionStatusColumn
          session={snapshot}
          onDisconnect={handleDisconnect}
          sessionStartTime={sessionStartTime}
        />
        <UsageAndCodeColumn session={snapshot} />
        <ActivityLogColumn activities={activities} />
      </div>
      <StatusBar
        tunnelUrl={tunnelUrl}
        proxyPort={proxyPort}
        wsConnected={wsConnected}
      />
    </div>
  );
}
