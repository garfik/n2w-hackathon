import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = isDev
  ? pino({
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    })
  : pino({
      level: 'info',
    });

/** Child logger for a module (e.g. gemini, auth). */
export function child(bindings: pino.Bindings): pino.Logger {
  return logger.child(bindings);
}
