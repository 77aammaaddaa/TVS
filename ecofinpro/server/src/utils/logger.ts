import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['password', '*.password', 'license_key', '*.license_key', 'authorization', '*.authorization'],
    censor: '[REDACTED]'
  },
  base: {
    service: 'fintech-pro-api',
    env: process.env.NODE_ENV || 'development'
  },
  timestamp: pino.stdTimeFunctions.isoTime
});
