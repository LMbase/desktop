import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
    },
  },
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../.vite/renderer/main_window',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
});
