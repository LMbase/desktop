import electron from 'electron';
const { app } = electron;
import { registerIpcHandlers } from './ipc/registerIpcHandlers';
import { createBeforeQuitCleanup } from './lifecycle/beforeQuitCleanup';
import { logger } from './logging/logger';
import { createSessionController } from './session/sessionController';
import { createSessionRuntime } from './session/createSessionRuntime';
import { createMainWindow } from './window/createMainWindow';

app.disableHardwareAcceleration();

let mainWindow: ReturnType<typeof createMainWindow> | null = null;
const sessionController = createIpcSessionController();
let unregisterIpcHandlers: (() => void) | null = null;

function createIpcSessionController() {
  const controller = createSessionController({ runtime: createSessionRuntime() });

  return {
    start: async (config: Parameters<typeof controller.start>[0]) => {
      const result = await controller.start(config);
      if (!result.success) {
        throw new Error(result.error ?? 'Session start failed');
      }
    },
    stop: controller.stop,
    getSnapshot: async () => controller.getSnapshot(),
    onSessionUpdate: controller.onSessionUpdate,
    onActivity: controller.onActivity,
  };
}

async function initializeApp(): Promise<void> {
  console.log('TokenHub starting...');
  logger.info('TokenHub starting...');

  try {
    unregisterIpcHandlers = registerIpcHandlers({ sessionController });
    console.log('IPC handlers registered');
    logger.info('IPC handlers registered');

    mainWindow = createMainWindow();
    console.log('Main window created');
    logger.info('Main window created');

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (error) {
    console.error('Error in initializeApp:', error);
    logger.error('Error in initializeApp:', error);
    throw error;
  }
}

app.whenReady().then(() => {
  console.log('App is ready');
  return initializeApp();
}).catch((error) => {
  console.error('Failed to initialize app:', error);
  logger.error('Failed to initialize app:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    mainWindow = createMainWindow();
  }
});

app.on('before-quit', createBeforeQuitCleanup({
  app,
  sessionController,
  unregisterIpcHandlers: () => {
    unregisterIpcHandlers?.();
    unregisterIpcHandlers = null;
  },
}));
