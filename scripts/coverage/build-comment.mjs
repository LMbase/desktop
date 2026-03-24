import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coveragePaths, e2eThresholds, vitestThresholds } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const vitestSummary = await readJson(path.join(repoRoot, coveragePaths.vitestSummary));
const e2eSummary = await readJson(path.join(repoRoot, coveragePaths.e2eSummary));

const comment = [
  '<!-- lmbase-desktop-coverage -->',
  '## Coverage Report',
  '',
  '### Check Status',
  '| Check | Outcome |',
  '| --- | --- |',
  `| Typecheck | ${formatOutcome(process.env.TYPECHECK_OUTCOME)} |`,
  `| Vitest suite | ${formatOutcome(process.env.VITEST_OUTCOME)} |`,
  `| Electron E2E suite | ${formatOutcome(process.env.E2E_OUTCOME)} |`,
  `| Coverage gates | ${formatOutcome(process.env.COVERAGE_OUTCOME)} |`,
  '',
  '### Vitest Coverage',
  '| Metric | Actual | Threshold | Status |',
  '| --- | --- | --- | --- |',
  renderVitestMetric('lines'),
  renderVitestMetric('statements'),
  renderVitestMetric('functions'),
  renderVitestMetric('branches'),
  '',
  '### Electron E2E Coverage',
  '| Surface | Bytes | Functions | Thresholds | Status |',
  '| --- | --- | --- | --- | --- |',
  renderE2ERow('renderer', true),
  renderE2ERow('main'),
  renderE2ERow('preload'),
  renderTotalsRow(),
  '',
  'Artifacts:',
  '- `coverage/vitest/coverage-summary.json`',
  '- `coverage/vitest/lcov.info`',
  '- `coverage/e2e/summary.json`',
  '- `playwright-report/`',
  '',
  `_Generated at ${new Date().toISOString()}._`,
  '',
].join('\n');

const outputPath = path.join(repoRoot, coveragePaths.commentFile);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, comment);

function renderVitestMetric(metric) {
  const actual = vitestSummary?.total?.[metric]?.pct;
  const threshold = vitestThresholds[metric];
  const passes = typeof actual === 'number' && actual >= threshold;

  return `| ${capitalize(metric)} | ${formatPct(actual)} | ${formatPct(threshold)} | ${formatStatus(passes)} |`;
}

function renderE2ERow(group, enforceThreshold = false) {
  const row = e2eSummary?.groups?.[group];
  const bytes = row?.bytes?.pct;
  const functions = row?.functions?.pct;
  const thresholds = enforceThreshold
    ? `bytes >= ${formatPct(e2eThresholds.rendererBytes)}, functions >= ${formatPct(e2eThresholds.rendererFunctions)}`
    : 'informational';
  const passes = enforceThreshold
    ? typeof bytes === 'number' &&
      bytes >= e2eThresholds.rendererBytes &&
      typeof functions === 'number' &&
      functions >= e2eThresholds.rendererFunctions
    : null;

  return `| ${capitalize(group)} | ${formatPct(bytes)} | ${formatPct(functions)} | ${thresholds} | ${formatStatus(passes)} |`;
}

function renderTotalsRow() {
  const totals = e2eSummary?.totals;
  return `| Total tracked Electron app code | ${formatPct(totals?.bytes?.pct)} | ${formatPct(totals?.functions?.pct)} | informational | ${formatStatus(null)} |`;
}

function formatPct(value) {
  return typeof value === 'number' ? `${value.toFixed(2)}%` : 'missing';
}

function formatOutcome(value) {
  if (value === 'success') {
    return 'PASS';
  }

  if (value === 'failure') {
    return 'FAIL';
  }

  return 'UNKNOWN';
}

function formatStatus(passes) {
  if (passes === null) {
    return 'INFO';
  }

  return passes ? 'PASS' : 'FAIL';
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function readJson(targetPath) {
  try {
    return JSON.parse(await readFile(targetPath, 'utf8'));
  } catch {
    return null;
  }
}
