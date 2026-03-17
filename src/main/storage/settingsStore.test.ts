import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { app } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSettingsStore } from './settingsStore';

describe('settingsStore', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.map(async (dir) => rm(dir, { recursive: true, force: true })));
    created.length = 0;
  });

  it('persists and retrieves values from disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tokenhub-settings-'));
    created.push(dir);
    vi.mocked(app.getPath).mockReturnValue(dir);

    const store = createSettingsStore();
    await expect(store.set('provider', 'openai')).resolves.toBe(true);
    await expect(store.get('provider')).resolves.toBe('openai');
  });
});
