import { mkdtemp, rm, writeFile } from 'fs/promises';
import { accessSync, constants as fsConstants } from 'fs';
import { homedir, tmpdir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';
import { TunnelProvider, TunnelConfig } from './tunnelProvider';
import { logger } from '../logging/logger';

interface NgrokProviderDependencies {
  spawnProcess?: typeof spawn;
  cleanupStaleProcesses?: (port: number) => Promise<void>;
  killProcess?: typeof process.kill;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
  resolveNgrokCommand?: () => string;
  environment?: NodeJS.ProcessEnv;
}

function quoteYamlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function fileExistsAndExecutable(filePath: string): boolean {
  try {
    accessSync(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveNgrokCommand(): string {
  const configured = process.env.TOKENHUB_NGROK_BIN?.trim() || process.env.NGROK_BIN?.trim();
  if (configured) {
    return configured;
  }

  const bundledBinary = join(homedir(), '.config', 'ngrok', 'ngrok');
  if (fileExistsAndExecutable(bundledBinary)) {
    return bundledBinary;
  }

  return 'ngrok';
}

async function cleanupStaleNgrokProcesses(port: number): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }

  await new Promise<void>((resolve) => {
    const cleaner = spawn('pkill', ['-f', `ngrok http ${port} --log=stdout`]);
    cleaner.on('close', () => resolve());
    cleaner.on('error', () => resolve());
  });
}

export class NgrokProvider implements TunnelProvider {
  private url: string | null = null;
  private process: ReturnType<typeof spawn> | null = null;
  private config: TunnelConfig;
  private spawnProcess: typeof spawn;
  private cleanupStaleProcesses: (port: number) => Promise<void>;
  private killProcess: typeof process.kill;
  private setTimer: typeof setTimeout;
  private clearTimer: typeof clearTimeout;
  private resolveNgrokCommand: () => string;
  private environment: NodeJS.ProcessEnv;
  private configDir: string | null = null;

  constructor(config: TunnelConfig = {}, dependencies: NgrokProviderDependencies = {}) {
    this.config = config;
    this.spawnProcess = dependencies.spawnProcess ?? spawn;
    this.cleanupStaleProcesses = dependencies.cleanupStaleProcesses ?? cleanupStaleNgrokProcesses;
    this.killProcess = dependencies.killProcess ?? process.kill.bind(process);
    this.setTimer = dependencies.setTimer ?? setTimeout;
    this.clearTimer = dependencies.clearTimer ?? clearTimeout;
    this.resolveNgrokCommand = dependencies.resolveNgrokCommand ?? resolveNgrokCommand;
    this.environment = dependencies.environment ?? process.env;
  }

  private async createConfigPath(authtoken: string | undefined): Promise<string | null> {
    if (!authtoken) {
      return null;
    }

    const dir = await mkdtemp(join(tmpdir(), 'tokenhub-ngrok-'));
    const configPath = join(dir, 'ngrok.yml');
    const lines = ["version: '2'", `authtoken: ${quoteYamlString(authtoken)}`];

    if (this.config.region) {
      lines.push(`region: ${quoteYamlString(this.config.region)}`);
    }

    await writeFile(configPath, `${lines.join('\n')}\n`, 'utf8');
    this.configDir = dir;
    return configPath;
  }

  private async cleanupConfigPath(): Promise<void> {
    if (!this.configDir) {
      return;
    }

    const dir = this.configDir;
    this.configDir = null;
    await rm(dir, { recursive: true, force: true });
  }

  async connect(port: number): Promise<string> {
    const env = { ...this.environment };
    const authtoken = this.config.authtoken || this.environment.NGROK_AUTHTOKEN;

    if (!authtoken) {
      logger.warn('No NGROK_AUTHTOKEN set - tunnel may fail or use limited free tier');
    }

    await this.cleanupStaleProcesses(port);
    const configPath = await this.createConfigPath(authtoken);
    if (configPath) {
      delete env.NGROK_AUTHTOKEN;
      delete env.NGROK_CONFIG;
    } else if (authtoken) {
      env.NGROK_AUTHTOKEN = authtoken;
    }

    return new Promise((resolve, reject) => {
      const ngrokCommand = this.resolveNgrokCommand();
      const args = ['http', port.toString(), '--log=stdout'];
      let settled = false;
      
      if (configPath) {
        args.push(`--config=${configPath}`);
      } else if (this.config.region) {
        args.push(`--region=${this.config.region}`);
      }

      this.process = this.spawnProcess(ngrokCommand, args, { env, detached: true });
      
      const timeout = this.setTimer(() => {
        if (settled) {
          return;
        }

        void this.disconnect();
        settled = true;
        reject(new Error('ngrok tunnel timeout'));
      }, 30000);

      const resolveOnce = (tunnelUrl: string): void => {
        if (settled) {
          return;
        }

        settled = true;
        this.clearTimer(timeout);
        resolve(tunnelUrl);
      };

      const rejectOnce = (error: Error): void => {
        if (settled) {
          return;
        }

        settled = true;
        this.clearTimer(timeout);
        void this.cleanupConfigPath();
        reject(error);
      };
      
      this.process.stdout?.on('data', (data) => {
        const chunk = data.toString();
        logger.debug('ngrok:', chunk);
        
        const match = chunk.match(/url=(https:\/\/[^\s]+)/);
        const tunnelUrl = match?.[1];
        if (tunnelUrl && !this.url) {
          this.url = tunnelUrl;
          logger.info(`ngrok tunnel established: ${this.url}`);
          resolveOnce(tunnelUrl);
        }
      });

      this.process.stderr?.on('data', (data) => {
        logger.error('ngrok error:', data.toString());
      });

      this.process.on('error', (err) => {
        rejectOnce(new Error(`Failed to start ngrok: ${err.message}`));
      });

      this.process.on('close', (code) => {
        const hadUrl = this.url !== null;
        this.process = null;
        this.url = null;
        void this.cleanupConfigPath();

        if (!hadUrl) {
          rejectOnce(new Error(`ngrok exited with code ${code}`));
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    const activeProcess = this.process;
    this.process = null;

    if (activeProcess?.pid) {
      try {
        this.killProcess(-activeProcess.pid, 'SIGTERM');
      } catch {
        activeProcess.kill('SIGTERM');
      }
    }

    this.url = null;
    await this.cleanupConfigPath();
    logger.info('ngrok tunnel disconnected');
  }

  getUrl(): string | null {
    return this.url;
  }
}
