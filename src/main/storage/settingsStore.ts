import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import electron from 'electron';
const { app } = electron;

type SettingsData = Record<string, string>;

export interface SettingsStore {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<boolean>;
  getAll: () => Promise<SettingsData>;
}

async function loadSettings(filePath: string): Promise<SettingsData> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'),
    );
  } catch {
    return {};
  }
}

async function saveSettings(filePath: string, data: SettingsData): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function resolveSettingsPath(): Promise<string> {
  return join(app.getPath('userData'), 'settings.json');
}

export function createSettingsStore(filePath?: string): SettingsStore {
  const getPath = async (): Promise<string> => filePath ?? resolveSettingsPath();
  return {
    get: async (key: string) => {
      const data = await loadSettings(await getPath());
      return data[key] ?? null;
    },
    set: async (key: string, value: string) => {
      const path = await getPath();
      const data = await loadSettings(path);
      data[key] = value;
      await saveSettings(path, data);
      return true;
    },
    getAll: async () => loadSettings(await getPath()),
  };
}
