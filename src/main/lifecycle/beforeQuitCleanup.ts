import { logger } from '../logging/logger';

interface AppLike {
  quit: () => void;
}

interface BeforeQuitEventLike {
  preventDefault: () => void;
}

interface SessionControllerLike {
  stop: () => Promise<void>;
}

interface BeforeQuitCleanupOptions {
  app: AppLike;
  sessionController: SessionControllerLike;
  unregisterIpcHandlers?: () => void;
}

export function createBeforeQuitCleanup(options: BeforeQuitCleanupOptions) {
  let shuttingDown = false;

  return (event: BeforeQuitEventLike): void => {
    logger.info('LMbase shutting down...');

    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    event.preventDefault();

    void (async () => {
      try {
        await options.sessionController.stop();
      } catch (error) {
        logger.error('Failed to stop session during shutdown:', error);
      } finally {
        options.unregisterIpcHandlers?.();
        options.app.quit();
      }
    })();
  };
}
