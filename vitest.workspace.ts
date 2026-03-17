import { defineWorkspace } from 'vitest/config';
import { mergeConfig } from 'vite';
import path from 'path';

export default defineWorkspace([
  {
    extends: './vite.main.config.ts',
    test: {
      name: 'main',
      environment: 'node',
      include: ['src/main/**/*.test.ts', 'src/shared/**/*.test.ts'],
      setupFiles: ['./vitest.setup.main.ts'],
      globals: true,
      pool: 'forks',
    },
  },
  {
    extends: './vite.renderer.config.ts',
    test: {
      name: 'renderer',
      environment: 'happy-dom',
      include: ['**/*.test.ts', '**/*.test.tsx'],
      setupFiles: [path.resolve(__dirname, './vitest.setup.renderer.ts')],
      globals: true,
    },
  },
]);
