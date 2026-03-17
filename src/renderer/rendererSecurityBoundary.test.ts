import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const rendererRoot = path.resolve(__dirname);

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(fullPath);
      }
      if (!entry.isFile()) {
        return [];
      }
      if (entry.name.includes('.test.')) {
        return [];
      }
      if (!/\.(ts|tsx|d\.ts)$/.test(entry.name)) {
        return [];
      }
      return [fullPath];
    })
  );

  return files.flat();
}

async function scanRenderer(pattern: RegExp): Promise<string[]> {
  const files = await collectFiles(rendererRoot);
  const offenders: string[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    if (pattern.test(content)) {
      offenders.push(path.relative(rendererRoot, file));
    }
  }

  return offenders.sort();
}

describe('renderer security boundary', () => {
  it('does not import or require electron in renderer source', async () => {
    const offenders = await scanRenderer(
      /from\s+['"]electron['"]|require\(\s*['"]electron['"]\s*\)|import\(\s*['"]electron['"]\s*\)/
    );

    expect(offenders).toEqual([]);
  });

  it('does not reference window.electronAPI in renderer source', async () => {
    const offenders = await scanRenderer(/window\.electronAPI/);

    expect(offenders).toEqual([]);
  });
});
