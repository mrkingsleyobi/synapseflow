/**
 * Logger utility using Winston
 */

import winston from 'winston';
import { config } from '../config.js';

export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [MCP] [${level}]: ${typeof message === 'string' ? message : JSON.stringify(message)} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
    }),
    new winston.transports.File({ filename: 'logs/mcp-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/mcp-combined.log' }),
  ],
});
