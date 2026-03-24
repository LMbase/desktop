import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FullConfig } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

export default async function globalSetup(_config: FullConfig): Promise<void> {
  execFileSync('bun', ['run', 'build:app'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}
