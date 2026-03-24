import { rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { coveragePaths } from './config.mjs';
import { summarizeE2ECoverage } from './summarize-e2e.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const rendererCoverageDir = path.join(repoRoot, coveragePaths.e2eRendererDir);
const v8CoverageDir = path.join(repoRoot, coveragePaths.e2eV8Dir);

await rm(path.join(repoRoot, 'coverage', 'e2e'), { force: true, recursive: true });
await mkdir(rendererCoverageDir, { recursive: true });
await mkdir(v8CoverageDir, { recursive: true });

const testExitCode = await runPlaywright();

try {
  await summarizeE2ECoverage();
} catch (error) {
  console.error('Failed to summarize Electron E2E coverage');
  console.error(error);
  process.exit(testExitCode === 0 ? 1 : testExitCode);
}

process.exit(testExitCode);

function runPlaywright() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['x', 'playwright', 'test', ...process.argv.slice(2)], {
      cwd: repoRoot,
      env: {
        ...process.env,
        LMBASE_E2E_COVERAGE: '1',
        LMBASE_E2E_RENDERER_COVERAGE_DIR: rendererCoverageDir,
        NODE_V8_COVERAGE: v8CoverageDir,
      },
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
}
