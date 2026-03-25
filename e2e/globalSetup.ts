import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FullConfig } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

export default async function globalSetup(_config: FullConfig): Promise<void> {
  try {
    execFileSync('bun', ['run', 'build:app'], {
      cwd: repoRoot,
      stdio: 'inherit',
      timeout: 5 * 60 * 1000,
    });
  } catch (err) {
    console.error('globalSetup: bun run build:app timed out or failed');
    throw err;
  }
}
