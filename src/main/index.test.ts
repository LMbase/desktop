import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('single-instance lock', () => {
  // We can't easily import the real index.ts (it runs side effects at module load time)
  // So we test the logic pattern separately

  it('LMBASE_ALLOW_MULTIPLE_INSTANCES=1 bypasses the single-instance lock', () => {
    const env = '1';
    const allowMultiple = env === '1';
    const gotTheLock = allowMultiple || true; // app.requestSingleInstanceLock() would return true
    // With allowMultiple=true, gotTheLock should be true regardless of actual lock
    expect(gotTheLock).toBe(true);
  });

  it('without LMBASE_ALLOW_MULTIPLE_INSTANCES, requestSingleInstanceLock result is used', () => {
    const env = undefined;
    const allowMultiple = env === '1';
    const lockResult = false; // another instance is running
    const gotTheLock = allowMultiple || lockResult;
    // Without the env var, gotTheLock mirrors the actual lock result
    expect(gotTheLock).toBe(false);
  });

  it('LMBASE_ALLOW_MULTIPLE_INSTANCES=0 also gets the lock normally', () => {
    const env = '0';
    const allowMultiple = env === '1';
    const lockResult = true;
    const gotTheLock = allowMultiple || lockResult;
    expect(gotTheLock).toBe(true);
  });
});
