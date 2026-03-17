import type { CopilotToken } from '../providers/copilotClient';

export interface CopilotTokenRefresh {
  start: (
    token: CopilotToken,
    onToken: (token: CopilotToken) => Promise<void>,
    onError: (error: Error) => Promise<void>,
  ) => Promise<void>;
  stop: () => Promise<void>;
  isRunning: () => Promise<boolean>;
}

interface Dependencies {
  exchangeForCopilotToken: (githubToken: string) => Promise<CopilotToken>;
  sleep?: (seconds: number) => Promise<void>;
  now?: () => Promise<number>;
  refreshBufferSeconds?: number;
}

async function defaultSleep(seconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function defaultNow(): Promise<number> {
  return Math.floor(Date.now() / 1000);
}

export function createCopilotTokenRefresh(deps: Dependencies): CopilotTokenRefresh {
  const sleep = deps.sleep ?? defaultSleep;
  const now = deps.now ?? defaultNow;
  const refreshBufferSeconds = deps.refreshBufferSeconds ?? 60;

  let running = false;

  return {
    start: async (token, onToken, onError) => {
      if (running) {
        return;
      }
      running = true;

      let current = token;
      while (running) {
        try {
          const currentTime = await now();
          const waitSeconds = Math.max(0, current.expiresAt - currentTime - refreshBufferSeconds);
          await sleep(waitSeconds);
          if (!running) {
            break;
          }
          current = await deps.exchangeForCopilotToken(current.githubToken);
          await onToken(current);
        } catch (error) {
          const parsed = error instanceof Error ? error : new Error(String(error));
          await onError(parsed);
          await sleep(5);
        }
      }
    },

    stop: async () => {
      running = false;
    },

    isRunning: async () => running,
  };
}
