/**
 * SynapseFlow MCP Server
 * Model Context Protocol server with SSE (Server-Sent Events) and stdio support
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { SSEServer } from './sse-server.js';
import { StdioServer } from './stdio-server.js';
import { MCPHandler } from './mcp-handler.js';
import { logger } from './utils/logger.js';

const fastify = Fastify({
  logger: {
    level: config.logLevel,
  },
});

// Middleware
await fastify.register(cors, {
  origin: config.corsOrigins,
});

// Initialize MCP Handler
const mcpHandler = new MCPHandler(config.backendUrl);

// Initialize SSE Server (if enabled)
let sseServer: SSEServer | null = null;
if (config.sseEnabled) {
  sseServer = new SSEServer(mcpHandler);
  sseServer.register(fastify);
  logger.info('SSE server enabled');
}

// Initialize stdio Server (if enabled)
let stdioServer: StdioServer | null = null;
if (config.stdioEnabled) {
  stdioServer = new StdioServer(mcpHandler);
  logger.info('stdio server enabled');
}

// Health check
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    protocols: {
      sse: config.sseEnabled,
      stdio: config.stdioEnabled,
    },
    mcpTools: mcpHandler.getToolCount(),
  };
});

// MCP Tools listing endpoint
fastify.get('/tools', async () => {
  return {
    tools: mcpHandler.getTools(),
    count: mcpHandler.getToolCount(),
  };
});

// Start HTTP server (for SSE)
if (config.sseEnabled) {
  try {
    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    logger.info({
      message: 'SynapseFlow MCP Server started successfully',
      port: config.port,
      host: config.host,
      sseEnabled: config.sseEnabled,
      stdioEnabled: config.stdioEnabled,
    });
  } catch (err) {
    logger.error('Error starting SSE server:', err);
    process.exit(1);
  }
}

// Start stdio server (if enabled and not in HTTP mode)
if (config.stdioEnabled && !config.sseEnabled) {
  stdioServer?.start();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Graceful shutdown initiated');

  if (sseServer) {
    await sseServer.shutdown();
  }

  if (stdioServer) {
    stdioServer.shutdown();
  }

  await fastify.close();
  process.exit(0);
});
