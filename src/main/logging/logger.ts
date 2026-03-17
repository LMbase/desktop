import electron from 'electron';
const { app } = electron;
import fs from 'fs/promises';
import path from 'path';

const LOG_FILE = process.env.LMBASE_LOG || 
  path.join(app.getPath('home'), `lmbase_${process.pid}.log`);

class Logger {
  private logPath: string;

  constructor() {
    this.logPath = LOG_FILE;
  }

  private async write(level: string, message: string, ...args: unknown[]): Promise<void> {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(a => 
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' ') : '';
    
    const line = `[${timestamp}] [${level}] ${message}${formattedArgs}\n`;
    
    try {
      await fs.appendFile(this.logPath, line);
    } catch {
      console.error('Failed to write to log file');
    }
    
    if (process.env.NODE_ENV === 'development' || process.env.LMBASE_DEBUG) {
      console.log(line.trim());
    }
  }

  info(message: string, ...args: unknown[]): void {
    void this.write('INFO', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    void this.write('ERROR', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    void this.write('WARN', message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.LMBASE_DEBUG) {
      void this.write('DEBUG', message, ...args);
    }
  }
}

export const logger = new Logger();
