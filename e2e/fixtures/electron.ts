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

    if (e2eCoverageEnabled) {
      await page.coverage.startJSCoverage({
        reportAnonymousScripts: false,
        resetOnNavigation: false,
      });
    }

    await page.waitForLoadState('domcontentloaded');
    await use(page);

    if (e2eCoverageEnabled) {
      const coverageEntries = await page.coverage.stopJSCoverage();
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
  const fileName = `${sanitizeFileName(testInfo.titlePath().join('__'))}-retry-${testInfo.retry}.json`;
  await writeFile(path.join(outputDir, fileName), JSON.stringify(coverageEntries, null, 2));
}

function sanitizeFileName(input: string): string {
  return input.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
}
