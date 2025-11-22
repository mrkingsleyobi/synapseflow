/**
 * MCP Server Configuration
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.MCP_SERVER_PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',

  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],

  // Backend API URL
  backendUrl: process.env.BACKEND_URL || 'http://localhost:4000',

  // Protocol enablement
  sseEnabled: process.env.MCP_SSE_ENABLED === 'true' || true,
  stdioEnabled: process.env.MCP_STDIO_ENABLED === 'true' || false,
};
