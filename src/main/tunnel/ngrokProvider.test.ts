import { EventEmitter } from 'events';
import { existsSync, readFileSync } from 'fs';
import { dirname } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { NgrokProvider } from './ngrokProvider';

class FakeChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 4321;
  kill = vi.fn();
}

describe('NgrokProvider', () => {
  it('cleans up stale local ngrok processes before starting a tunnel', async () => {
    const child = new FakeChildProcess();
    const cleanupStaleProcesses = vi.fn(async () => undefined);
    const spawnProcess = vi.fn(() => {
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from('url=https://fresh.ngrok-free.dev\n'));
      });
      return child as never;
    });

    const provider = new NgrokProvider({}, {
      spawnProcess,
      cleanupStaleProcesses,
      resolveNgrokCommand: () => '/home/fishnak/.config/ngrok/ngrok',
    });
    await expect(provider.connect(9100)).resolves.toBe('https://fresh.ngrok-free.dev');

    expect(cleanupStaleProcesses).toHaveBeenCalledWith(9100);
    expect(cleanupStaleProcesses.mock.invocationCallOrder[0]).toBeLessThan(spawnProcess.mock.invocationCallOrder[0]);
    expect(spawnProcess).toHaveBeenCalledWith(
      '/home/fishnak/.config/ngrok/ngrok',
      ['http', '9100', '--log=stdout'],
      expect.objectContaining({ detached: true })
    );
  });

  it('creates an isolated config when an authtoken is provided in the environment', async () => {
    const child = new FakeChildProcess();
    const spawnProcess = vi.fn(() => {
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from('url=https://fresh.ngrok-free.dev\n'));
      });
      return child as never;
    });

    const provider = new NgrokProvider({ region: 'us' }, {
      spawnProcess,
      cleanupStaleProcesses: async () => undefined,
      resolveNgrokCommand: () => '/home/fishnak/.config/ngrok/ngrok',
      environment: { NGROK_AUTHTOKEN: 'env-token-123' },
    });

    await provider.connect(9100);

    const [, args, options] = spawnProcess.mock.calls[0] as [string, string[], { env: Record<string, string> }];
    const configArg = args.find((arg) => arg.startsWith('--config='));

    expect(configArg).toBeDefined();
    expect(options.env.NGROK_AUTHTOKEN).toBeUndefined();

    const configPath = configArg!.slice('--config='.length);
    const configText = readFileSync(configPath, 'utf8');
    expect(configText).toContain("authtoken: 'env-token-123'");
    expect(configText).toContain("region: 'us'");
  });

  it('kills the spawned ngrok process group during disconnect', async () => {
    const child = new FakeChildProcess();
    const killProcess = vi.fn();
    const spawnProcess = vi.fn(() => {
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from('url=https://fresh.ngrok-free.dev\n'));
      });
      return child as never;
    });

    const provider = new NgrokProvider({}, {
      spawnProcess,
      cleanupStaleProcesses: async () => undefined,
      killProcess,
      resolveNgrokCommand: () => '/home/fishnak/.config/ngrok/ngrok',
    });

    await provider.connect(9100);
    await provider.disconnect();

    expect(killProcess).toHaveBeenCalledWith(-4321, 'SIGTERM');
    expect(provider.getUrl()).toBeNull();
  });

  it('removes the temporary ngrok config on disconnect', async () => {
    const child = new FakeChildProcess();
    const spawnProcess = vi.fn(() => {
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from('url=https://fresh.ngrok-free.dev\n'));
      });
      return child as never;
    });

    const provider = new NgrokProvider({}, {
      spawnProcess,
      cleanupStaleProcesses: async () => undefined,
      resolveNgrokCommand: () => '/home/fishnak/.config/ngrok/ngrok',
      environment: { NGROK_AUTHTOKEN: 'env-token-123' },
    });

    await provider.connect(9100);

    const [, args] = spawnProcess.mock.calls[0] as [string, string[]];
    const configArg = args.find((arg) => arg.startsWith('--config='));
    const configPath = configArg!.slice('--config='.length);
    const configDir = dirname(configPath);

    expect(existsSync(configPath)).toBe(true);
    await provider.disconnect();
    expect(existsSync(configDir)).toBe(false);
  });

  it('falls back to plain ngrok when no direct binary is resolved', async () => {
    const child = new FakeChildProcess();
    const spawnProcess = vi.fn(() => {
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from('url=https://fresh.ngrok-free.dev\n'));
      });
      return child as never;
    });

    const provider = new NgrokProvider({}, {
      spawnProcess,
      cleanupStaleProcesses: async () => undefined,
      resolveNgrokCommand: () => 'ngrok',
    });

    await provider.connect(9100);

    expect(spawnProcess).toHaveBeenCalledWith(
      'ngrok',
      ['http', '9100', '--log=stdout'],
      expect.objectContaining({ detached: true })
    );
  });
});
