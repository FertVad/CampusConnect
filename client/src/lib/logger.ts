export type LogLevel = 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  info: 0,
  warn: 1,
  error: 2,
};

let currentLevel: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel) {
  return levelOrder[level] >= levelOrder[currentLevel];
}

function format(level: LogLevel, message: unknown) {
  const timestamp = new Date().toISOString();
  return `${timestamp} [${level.toUpperCase()}] ${String(message)}`;
}

export const logger = {
  setLevel(level: LogLevel) {
    currentLevel = level;
  },
  info(message: unknown, ...optionalParams: unknown[]) {
    if (shouldLog('info')) {
      console.log(format('info', message), ...optionalParams);
    }
  },
  warn(message: unknown, ...optionalParams: unknown[]) {
    if (shouldLog('warn')) {
      console.warn(format('warn', message), ...optionalParams);
    }
  },
  error(message: unknown, ...optionalParams: unknown[]) {
    if (shouldLog('error')) {
      console.error(format('error', message), ...optionalParams);
    }
  },
};

export default logger;
