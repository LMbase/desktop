import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import type { SessionSnapshot, ActivityEvent } from '@shared/contracts/session';

export function useSessionEvents() {
  const setSession = useAppStore((state) => state.setSession);
  const addActivity = useAppStore((state) => state.addActivity);

  useEffect(() => {
    const handleSessionUpdate = (snapshot: SessionSnapshot | null) => {
      setSession(snapshot);
    };

    const handleActivityLog = (activity: ActivityEvent) => {
      addActivity(activity);
    };

    const unsubscribeSession = window.tokenhub.session.onSessionUpdate(handleSessionUpdate);
    const unsubscribeActivity = window.tokenhub.session.onActivityLog(handleActivityLog);

    return () => {
      unsubscribeSession();
      unsubscribeActivity();
    };
  }, [setSession, addActivity]);

  const fetchSnapshot = async (): Promise<SessionSnapshot | null> => {
    return await window.tokenhub.session.getSnapshot();
  };

  return { fetchSnapshot };
}
