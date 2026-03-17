import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import electron from 'electron';
const { app, safeStorage } = electron;

interface SecretEntry {
  value: string;
  encrypted: boolean;
}

type SecretData = Record<string, SecretEntry>;

export interface SecretStore {
  setSecret: (key: string, value: string) => Promise<void>;
  getSecret: (key: string) => Promise<string | null>;
  deleteSecret: (key: string) => Promise<void>;
}

async function loadSecrets(filePath: string): Promise<SecretData> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as SecretData;
  } catch {
    return {};
  }
}

async function saveSecrets(filePath: string, data: SecretData): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function resolveSecretsPath(): Promise<string> {
  return join(app.getPath('userData'), 'secrets.json');
}

async function encodeSecret(value: string): Promise<SecretEntry> {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value);
    return {
      value: encrypted.toString('base64'),
      encrypted: true,
    };
  }
  console.warn('safeStorage encryption unavailable, storing plaintext secrets for this session.');
  return {
    value,
    encrypted: false,
  };
}

async function decodeSecret(entry: SecretEntry): Promise<string | null> {
  if (!entry.encrypted) {
    return entry.value;
  }
  try {
    return safeStorage.decryptString(Buffer.from(entry.value, 'base64'));
  } catch {
    return null;
  }
}

export function createSecretStore(filePath?: string): SecretStore {
  const getPath = async (): Promise<string> => filePath ?? resolveSecretsPath();
  return {
    setSecret: async (key: string, value: string) => {
      const path = await getPath();
      const secrets = await loadSecrets(path);
      secrets[key] = await encodeSecret(value);
      await saveSecrets(path, secrets);
    },

    getSecret: async (key: string) => {
      const secrets = await loadSecrets(await getPath());
      const entry = secrets[key];
      if (!entry) {
        return null;
      }
      return decodeSecret(entry);
    },

    deleteSecret: async (key: string) => {
      const path = await getPath();
      const secrets = await loadSecrets(path);
      delete secrets[key];
      await saveSecrets(path, secrets);
    },
  };
}
