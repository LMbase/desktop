import { describe, expect, it } from 'vitest';
import { createRuntimeSessionCache } from './runtimeSessionCache';

describe('runtimeSessionCache', () => {
  it('stores and clears session secrets in memory', async () => {
    const cache = createRuntimeSessionCache();
    await cache.set('copilotToken', 'cp-token');
    await expect(cache.get('copilotToken')).resolves.toBe('cp-token');
    await cache.delete('copilotToken');
    await expect(cache.get('copilotToken')).resolves.toBeNull();
  });
});
