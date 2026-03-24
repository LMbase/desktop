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

export const e2eThresholds = Object.freeze({
  rendererBytes: 15,
  rendererFunctions: 10,
});
