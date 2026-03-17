import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { app, safeStorage } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSecretStore } from './secretStore';

describe('secretStore', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.map(async (dir) => rm(dir, { recursive: true, force: true })));
    created.length = 0;
    vi.restoreAllMocks();
  });

  it('encrypts and decrypts values when safe storage is available', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tokenhub-secret-'));
    created.push(dir);
    vi.mocked(app.getPath).mockReturnValue(dir);
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);

    const store = createSecretStore();
    await store.setSecret('openai', 'sk-secret');
    await expect(store.getSecret('openai')).resolves.toBe('sk-secret');
  });

  it('falls back to plaintext with warning when encryption unavailable', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tokenhub-secret-'));
    created.push(dir);
    vi.mocked(app.getPath).mockReturnValue(dir);
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const store = createSecretStore();
    await store.setSecret('gemini', 'gm-secret');
    await expect(store.getSecret('gemini')).resolves.toBe('gm-secret');
    expect(warn).toHaveBeenCalled();
  });
});
