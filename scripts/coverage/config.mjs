import { readFile } from 'node:fs/promises';

export async function readJson(targetPath) {
  try {
    return JSON.parse(await readFile(targetPath, 'utf8'));
  } catch {
    return null;
  }
}

export const coveragePaths = Object.freeze({
  commentFile: 'coverage/coverage-comment.md',
  e2eRendererDir: 'coverage/e2e/renderer',
  e2eSummary: 'coverage/e2e/summary.json',
  e2eV8Dir: 'coverage/e2e/v8',
  vitestSummary: 'coverage/vitest/coverage-summary.json',
});

export const vitestThresholds = Object.freeze({
  branches: 73,
  functions: 77,
  lines: 83,
  statements: 83,
});

// E2E renderer coverage thresholds — set to 0 as a placeholder.
// Real targets should be raised once the E2E coverage collection
// is verified to work correctly in the CI environment.
export const e2eThresholds = Object.freeze({
  rendererBytes: 0,
  rendererFunctions: 0,
});
