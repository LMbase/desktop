import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test as base, type TestInfo } from '@playwright/test';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const e2eCoverageEnabled = process.env.LMBASE_E2E_COVERAGE === '1';

type ElectronFixtures = {
  electronApp: ElectronApplication;
  page: Page;
};

type CoverageFunctionRange = {
  count: number;
  endOffset: number;
  startOffset: number;
};

type CoverageFunction = {
  functionName: string;
  isBlockCoverage?: boolean;
  ranges: CoverageFunctionRange[];
};

type RendererCoverageEntry = {
  functions?: CoverageFunction[];
  scriptId?: string;
  url?: string;
};

export const test = base.extend<ElectronFixtures>({
  electronApp: async ({}, use) => {
    const electronApp = await electron.launch({
      args: ['.', '--no-sandbox', '--disable-dev-shm-usage'],
      cwd: repoRoot,
      env: {
        ...process.env,
        CI: '1',
        LMBASE_E2E: '1',
        LMBASE_E2E_COVERAGE: process.env.LMBASE_E2E_COVERAGE ?? '0',
        LMBASE_E2E_RENDERER_COVERAGE_DIR: process.env.LMBASE_E2E_RENDERER_COVERAGE_DIR,
        NODE_V8_COVERAGE: process.env.NODE_V8_COVERAGE,
      },
    });

    await use(electronApp);
    await electronApp.close();
  },
  page: async ({ electronApp }, use, testInfo) => {
    const page = await electronApp.firstWindow();
    const webContentsId = await electronApp.evaluate(({ BrowserWindow }) => {
      const [window] = BrowserWindow.getAllWindows();
      return window?.webContents.id ?? null;
    });

    if (e2eCoverageEnabled && webContentsId !== null) {
      await startRendererCoverage(electronApp, webContentsId);
      // Reload once so the renderer bundle executes after precise coverage starts.
      await page.reload({ waitUntil: 'domcontentloaded' });
    }

    await page.waitForLoadState('domcontentloaded');
    await use(page);

    if (e2eCoverageEnabled && webContentsId !== null) {
      const coverageEntries = await stopRendererCoverage(electronApp, webContentsId);
      await persistRendererCoverage(testInfo, coverageEntries);
    }
  },
});

export { expect };

async function persistRendererCoverage(testInfo: TestInfo, coverageEntries: unknown): Promise<void> {
  const outputDir = process.env.LMBASE_E2E_RENDERER_COVERAGE_DIR;
  if (!outputDir) {
    return;
  }

  await mkdir(outputDir, { recursive: true });
  const fileName = `${sanitizeFileName(testInfo.titlePath.join('__'))}-retry-${testInfo.retry}.json`;
  await writeFile(path.join(outputDir, fileName), JSON.stringify(coverageEntries, null, 2));
}

function sanitizeFileName(input: string): string {
  return input.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
}

async function startRendererCoverage(electronApp: ElectronApplication, webContentsId: number): Promise<void> {
  await electronApp.evaluate(async ({ webContents }, targetId) => {
    const contents = webContents.fromId(targetId);
    if (!contents) {
      throw new Error(`Missing webContents for id ${targetId}`);
    }

    if (!contents.debugger.isAttached()) {
      contents.debugger.attach('1.3');
    }

    await contents.debugger.sendCommand('Profiler.enable');
    await contents.debugger.sendCommand('Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: true,
    });
  }, webContentsId);
}

async function stopRendererCoverage(
  electronApp: ElectronApplication,
  webContentsId: number,
): Promise<RendererCoverageEntry[]> {
  return await electronApp.evaluate(async ({ webContents }, targetId) => {
    const contents = webContents.fromId(targetId);
    if (!contents) {
      return [];
    }

    if (!contents.debugger.isAttached()) {
      return [];
    }

    const { result } = await contents.debugger.sendCommand('Profiler.takePreciseCoverage');
    await contents.debugger.sendCommand('Profiler.stopPreciseCoverage');
    await contents.debugger.sendCommand('Profiler.disable');
    contents.debugger.detach();

    return result as RendererCoverageEntry[];
  }, webContentsId);
}
