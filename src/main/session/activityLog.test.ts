import { describe, expect, it, vi } from 'vitest';
import { createActivityLog } from './activityLog';

describe('activityLog', () => {
  it('appends timestamped events and notifies subscribers', () => {
    const log = createActivityLog({ now: () => 1234 });
    const listener = vi.fn();
    const unsubscribe = log.subscribe(listener);

    const event = log.append({ type: 'info', message: 'connected' });

    expect(event).toEqual({ timestamp: 1234, type: 'info', message: 'connected' });
    expect(log.list()).toEqual([event]);
    expect(listener).toHaveBeenCalledWith(event);

    unsubscribe();
    log.append({ type: 'success', message: 'paired' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps only max configured entries', () => {
    const log = createActivityLog({ maxEntries: 2, now: () => 1 });
    log.append({ type: 'info', message: 'a' });
    log.append({ type: 'info', message: 'b' });
    log.append({ type: 'info', message: 'c' });
    expect(log.list().map((item) => item.message)).toEqual(['b', 'c']);
  });
});
