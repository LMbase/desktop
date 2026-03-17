import { activityEventSchema, type ActivityEvent } from '../../shared/contracts/session';

export interface ActivityLog {
  append: (event: Omit<ActivityEvent, 'timestamp'> & { timestamp?: number }) => ActivityEvent;
  list: () => ActivityEvent[];
  clear: () => void;
  subscribe: (listener: (event: ActivityEvent) => void) => () => void;
}

interface ActivityLogOptions {
  maxEntries?: number;
  now?: () => number;
}

export function createActivityLog(options: ActivityLogOptions = {}): ActivityLog {
  const maxEntries = Math.max(1, options.maxEntries ?? 500);
  const now = options.now ?? Date.now;
  const events: ActivityEvent[] = [];
  const listeners = new Set<(event: ActivityEvent) => void>();

  return {
    append: (event) => {
      const parsed = activityEventSchema.parse({
        timestamp: event.timestamp ?? now(),
        type: event.type,
        message: event.message,
      });
      events.push(parsed);
      if (events.length > maxEntries) {
        events.splice(0, events.length - maxEntries);
      }
      for (const listener of listeners) {
        listener(parsed);
      }
      return parsed;
    },

    list: () => [...events],

    clear: () => {
      events.length = 0;
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
