import electron from 'electron';
const { BrowserWindow, app } = electron;
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../logging/logger';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export function createMainWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'LMbase',
    webPreferences: {
      preload: path.join(moduleDir, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devServerUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
  const isDev = !app.isPackaged && typeof devServerUrl === 'string' && devServerUrl.length > 0;

  if (isDev && devServerUrl) {
    window.loadURL(devServerUrl);
    window.webContents.openDevTools();
    logger.info('Loading from dev server');
  } else {
    window.loadFile(path.join(moduleDir, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    logger.info('Loading from built files');
  }

  return window;
}
