/**
 * TokKit logging utility.
 * TokKit Logger — tagged debug/info/warn/error output.
 */

export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARNING = 2,
  INFO = 3,
  DEBUG = 4
}

let currentLevel: LogLevel = LogLevel.WARNING;

function log(tag: string, level: LogLevel, ...args: unknown[]): void {
  if (level > currentLevel) return;
  const prefix = `[TokKit/${tag}]`;
  switch (level) {
    case LogLevel.ERROR:
      console.error(prefix, ...args);
      break;
    case LogLevel.WARNING:
      console.warn(prefix, ...args);
      break;
    case LogLevel.INFO:
      console.info(prefix, ...args);
      break;
    case LogLevel.DEBUG:
      console.debug(prefix, ...args);
      break;
  }
}

const Log = {
  setLevel(level: LogLevel): void {
    currentLevel = level;
  },
  error(tag: string, ...args: unknown[]): void {
    log(tag, LogLevel.ERROR, ...args);
  },
  warn(tag: string, ...args: unknown[]): void {
    log(tag, LogLevel.WARNING, ...args);
  },
  info(tag: string, ...args: unknown[]): void {
    log(tag, LogLevel.INFO, ...args);
  },
  debug(tag: string, ...args: unknown[]): void {
    log(tag, LogLevel.DEBUG, ...args);
  }
};

export default Log;
