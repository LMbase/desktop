import { ipcEventChannels } from '../../shared/contracts/ipc';
import type { ActivityEvent, SessionSnapshot } from '../../shared/contracts/session';

interface EventTarget {
  send: (channel: string, payload: unknown) => void;
}

export interface SessionEventPublisher {
  publishSnapshot: (snapshot: SessionSnapshot) => void;
  publishActivity: (event: ActivityEvent) => void;
}

interface PublisherOptions {
  targets: () => EventTarget[];
}

function sanitizeSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return {
    ...snapshot,
    config: snapshot.config
      ? {
          ...snapshot.config,
          apiKey: '',
          githubToken: '',
        }
      : null,
    pairing: snapshot.pairing
      ? {
          ...snapshot.pairing,
          proxyKey: '',
        }
      : null,
  };
}

export function createSessionEventPublisher(options: PublisherOptions): SessionEventPublisher {
  const emit = (channel: string, payload: unknown): void => {
    for (const target of options.targets()) {
      try {
        target.send(channel, payload);
      } catch {
      }
    }
  };

  return {
    publishSnapshot: (snapshot) => {
      emit(ipcEventChannels.sessionUpdate, sanitizeSnapshot(snapshot));
    },
    publishActivity: (event) => {
      emit(ipcEventChannels.activityLog, event);
    },
  };
}
