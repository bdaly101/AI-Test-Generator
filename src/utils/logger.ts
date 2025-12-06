import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerOptions {
  level?: LogLevel;
  verbose?: boolean;
}

export class Logger {
  private level: LogLevel;
  private verbose: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.verbose = options.verbose ?? false;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(chalk.blue('ℹ'), message, ...args);
    }
  }

  success(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(chalk.green('✓'), message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(chalk.yellow('⚠'), message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(chalk.red('✗'), message, ...args);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level || (this.verbose && level === LogLevel.DEBUG);
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
    if (verbose) {
      this.level = LogLevel.DEBUG;
    }
  }
}

export const logger = new Logger();

