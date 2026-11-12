import winston from 'winston';
import { getRequestId } from './request-context.js';

// Adds the current request's ID to every log line written while handling it
const withRequestId = winston.format((info) => {
  const requestId = getRequestId();
  if (requestId) info.requestId = requestId;
  return info;
});

const logFormat = winston.format.combine(
  withRequestId(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});
