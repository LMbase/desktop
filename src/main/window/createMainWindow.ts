import electron from 'electron';
const { BrowserWindow, app } = electron;
import path from 'path';
import { logger } from '../logging/logger';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

function getViteDevServerUrl(): string | undefined {
  try {
    return typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined'
      ? MAIN_WINDOW_VITE_DEV_SERVER_URL
      : undefined;
  } catch {
    return undefined;
  }
}

function getViteWindowName(): string {
  try {
    return typeof MAIN_WINDOW_VITE_NAME !== 'undefined' && MAIN_WINDOW_VITE_NAME
      ? MAIN_WINDOW_VITE_NAME
      : 'main_window';
  } catch {
    return 'main_window';
  }
}

export function createMainWindow() {
  const isE2E = process.env.LMBASE_E2E === '1';
  const rendererSandboxEnabled = app.isPackaged || !isE2E;
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'LMbase',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: rendererSandboxEnabled,
    },
  });

  const devServerUrl = getViteDevServerUrl();
  const windowName = getViteWindowName();
  const isDev = !app.isPackaged && typeof devServerUrl === 'string' && devServerUrl.length > 0;

  if (isDev && devServerUrl) {
    window.loadURL(devServerUrl);
    window.webContents.openDevTools();
    logger.info('Loading from dev server');
  } else {
    window.loadFile(path.join(moduleDir, `../renderer/${windowName}/index.html`));
    logger.info('Loading from built files');
  }

  return window;
}
