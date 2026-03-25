import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { coveragePaths, e2eThresholds, readJson, vitestThresholds } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

// Debug: log resolved paths in CI
const vitestSummaryPath = path.join(repoRoot, coveragePaths.vitestSummary);
console.error(`[coverage-check] repoRoot=${repoRoot}`);
console.error(`[coverage-check] vitestSummaryPath=${vitestSummaryPath}`);
try {
  const content = await readFile(vitestSummaryPath, 'utf8');
  console.error(`[coverage-check] vitest summary file size=${content.length}`);
} catch (err) {
  console.error(`[coverage-check] vitest summary file NOT FOUND: ${err.code}`);
}

function formatPct(value) {
  return typeof value === 'number' ? `${value.toFixed(2)}%` : 'missing';
}

const vitestSummary = await readJson(path.join(repoRoot, coveragePaths.vitestSummary));
const e2eSummary = await readJson(path.join(repoRoot, coveragePaths.e2eSummary));

const failures = [];

for (const [metric, threshold] of Object.entries(vitestThresholds)) {
  const actual = vitestSummary?.total?.[metric]?.pct;
  if (typeof actual !== 'number' || actual < threshold) {
    failures.push(`Vitest ${metric} coverage ${formatPct(actual)} is below ${threshold.toFixed(2)}%`);
  }
}

const rendererBytes = e2eSummary?.groups?.renderer?.bytes?.pct;
if (typeof rendererBytes !== 'number' || rendererBytes < e2eThresholds.rendererBytes) {
  failures.push(
    `Electron renderer byte coverage ${formatPct(rendererBytes)} is below ${e2eThresholds.rendererBytes.toFixed(2)}%`,
  );
}

const rendererFunctions = e2eSummary?.groups?.renderer?.functions?.pct;
if (typeof rendererFunctions !== 'number' || rendererFunctions < e2eThresholds.rendererFunctions) {
  failures.push(
    `Electron renderer function coverage ${formatPct(rendererFunctions)} is below ${e2eThresholds.rendererFunctions.toFixed(2)}%`,
  );
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }

  process.exit(1);
}

console.log('Coverage thresholds satisfied.');
