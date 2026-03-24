import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coveragePaths } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const buildRoot = path.join(repoRoot, '.vite');
const trackedGroups = {
  main: path.join(buildRoot, 'build', 'main.mjs'),
  preload: path.join(buildRoot, 'build', 'preload.cjs'),
  renderer: path.join(buildRoot, 'renderer', 'main_window', 'assets'),
};

export async function summarizeE2ECoverage() {
  const trackedFiles = await createTrackedFileMap();
  await ingestNodeCoverage(trackedFiles);
  await ingestRendererCoverage(trackedFiles);

  const files = [...trackedFiles.values()]
    .map((record) => finalizeRecord(record))
    .sort((left, right) => left.path.localeCompare(right.path));

  const groups = {
    main: summarizeCollection(files.filter((file) => file.group === 'main')),
    preload: summarizeCollection(files.filter((file) => file.group === 'preload')),
    renderer: summarizeCollection(files.filter((file) => file.group === 'renderer')),
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    totals: summarizeCollection(files),
    groups,
    files: files.map((file) => ({
      bytes: file.bytes,
      functions: file.functions,
      group: file.group,
      path: path.relative(repoRoot, file.path),
    })),
  };

  const summaryPath = path.join(repoRoot, coveragePaths.e2eSummary);
  await mkdir(path.dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));

  return summary;
}

function finalizeRecord(record) {
  const coveredRanges = mergeRanges(record.coveredRanges);
  const coveredBytes = coveredRanges.reduce((sum, [start, end]) => sum + Math.max(0, end - start), 0);
  const totalFunctions = record.functions.size;
  const coveredFunctions = [...record.functions.values()].filter(Boolean).length;

  return {
    bytes: createMetric(coveredBytes, record.sourceLength),
    functions: createMetric(coveredFunctions, totalFunctions),
    group: record.group,
    path: record.path,
  };
}

function summarizeCollection(files) {
  const bytesCovered = files.reduce((sum, file) => sum + file.bytes.covered, 0);
  const bytesTotal = files.reduce((sum, file) => sum + file.bytes.total, 0);
  const functionsCovered = files.reduce((sum, file) => sum + file.functions.covered, 0);
  const functionsTotal = files.reduce((sum, file) => sum + file.functions.total, 0);

  return {
    bytes: createMetric(bytesCovered, bytesTotal),
    files: files.length,
    functions: createMetric(functionsCovered, functionsTotal),
  };
}

async function createTrackedFileMap() {
  const trackedFiles = new Map();

  await addTrackedFile(trackedFiles, trackedGroups.main, 'main');
  await addTrackedFile(trackedFiles, trackedGroups.preload, 'preload');

  if (await fileExists(trackedGroups.renderer)) {
    const rendererAssets = await readdir(trackedGroups.renderer);
    for (const asset of rendererAssets) {
      if (!asset.endsWith('.js')) {
        continue;
      }

      await addTrackedFile(trackedFiles, path.join(trackedGroups.renderer, asset), 'renderer');
    }
  }

  return trackedFiles;
}

async function addTrackedFile(trackedFiles, filePath, group) {
  if (!(await fileExists(filePath))) {
    return;
  }

  const source = await readFile(filePath, 'utf8');
  trackedFiles.set(filePath, {
    coveredRanges: [],
    functions: new Map(),
    group,
    path: filePath,
    sourceLength: source.length,
  });
}

async function ingestNodeCoverage(trackedFiles) {
  const v8Directory = path.join(repoRoot, coveragePaths.e2eV8Dir);
  if (!(await fileExists(v8Directory))) {
    return;
  }

  for (const fileName of await readdir(v8Directory)) {
    if (!fileName.endsWith('.json')) {
      continue;
    }

    const report = JSON.parse(await readFile(path.join(v8Directory, fileName), 'utf8'));
    for (const entry of report.result ?? []) {
      const filePath = normalizeScriptPath(entry.url);
      const target = trackedFiles.get(filePath);
      if (!target) {
        continue;
      }

      mergeCoverageEntry(target, entry);
    }
  }
}

async function ingestRendererCoverage(trackedFiles) {
  const rendererDirectory = path.join(repoRoot, coveragePaths.e2eRendererDir);
  if (!(await fileExists(rendererDirectory))) {
    return;
  }

  for (const fileName of await readdir(rendererDirectory)) {
    if (!fileName.endsWith('.json')) {
      continue;
    }

    const entries = JSON.parse(await readFile(path.join(rendererDirectory, fileName), 'utf8'));
    for (const entry of entries) {
      const filePath = normalizeScriptPath(entry.url);
      const target = trackedFiles.get(filePath);
      if (!target) {
        continue;
      }

      target.sourceLength = Math.max(target.sourceLength, entry.source?.length ?? target.sourceLength);
      mergeCoverageEntry(target, entry);
    }
  }
}

function mergeCoverageEntry(target, entry) {
  for (const fn of entry.functions ?? []) {
    const rootRange = fn.ranges?.[0];
    if (rootRange) {
      const functionKey = `${rootRange.startOffset}:${rootRange.endOffset}`;
      const covered = (target.functions.get(functionKey) ?? false) || rootRange.count > 0;
      target.functions.set(functionKey, covered);
    }

    for (const range of fn.ranges ?? []) {
      if (range.count <= 0) {
        continue;
      }

      target.coveredRanges.push([range.startOffset, range.endOffset]);
    }
  }
}

function mergeRanges(ranges) {
  const ordered = [...ranges]
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((left, right) => left[0] - right[0]);

  if (ordered.length === 0) {
    return [];
  }

  const merged = [ordered[0]];
  for (const current of ordered.slice(1)) {
    const previous = merged.at(-1);
    if (current[0] <= previous[1]) {
      previous[1] = Math.max(previous[1], current[1]);
      continue;
    }

    merged.push([...current]);
  }

  return merged;
}

function createMetric(covered, total) {
  return {
    covered,
    pct: total === 0 ? 0 : Number(((covered / total) * 100).toFixed(2)),
    total,
  };
}

function normalizeScriptPath(scriptUrl) {
  if (typeof scriptUrl !== 'string' || scriptUrl.length === 0) {
    return null;
  }

  if (scriptUrl.startsWith('file://')) {
    return fileURLToPath(scriptUrl);
  }

  return path.isAbsolute(scriptUrl) ? scriptUrl : null;
}

async function fileExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

if (import.meta.path === Bun.main) {
  await summarizeE2ECoverage();
}
