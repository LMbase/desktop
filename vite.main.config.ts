import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@main': path.resolve(__dirname, './src/main'),
    },
  },
  build: {
    outDir: '.vite/build',
    emptyOutDir: false,
    lib: {
      entry: 'src/main/index.ts',
      formats: ['es'],
      fileName: () => 'main.mjs',
    },
    rollupOptions: {
      external: [
        'electron',
        'fastify',
        'ws',
        'node:fs/promises',
        'node:path',
        'node:child_process',
        'node:fs',
        'node:os',
        'node:url',
        'path',
        'fs/promises',
        'child_process',
        'fs',
        'os',
        'url',
      ],
    },
    sourcemap: true,
    minify: false,
    target: 'es2022',
  },
});
