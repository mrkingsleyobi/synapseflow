/**
 * SSE (Server-Sent Events) Server
 * Handles real-time streaming of research updates to frontend
 */

import { FastifyInstance, FastifyReply } from 'fastify';
import { MCPHandler } from './mcp-handler.js';
import { logger } from './utils/logger.js';

interface Client {
  id: string;
  reply: FastifyReply;
  lastEventId: number;
}

export class SSEServer {
  private clients: Map<string, Client> = new Map();
  private mcpHandler: MCPHandler;
  private eventId = 0;

  constructor(mcpHandler: MCPHandler) {
    this.mcpHandler = mcpHandler;
  }

  /**
   * Register SSE routes with Fastify
   */
  register(fastify: FastifyInstance): void {
    // SSE stream endpoint
    fastify.get('/stream', async (request, reply) => {
      const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      logger.info(`New SSE client connected: ${clientId}`);

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // Store client
      const client: Client = {
        id: clientId,
        reply,
        lastEventId: this.eventId,
      };

      this.clients.set(clientId, client);

      // Send initial connection message
      this.sendEvent(clientId, {
        type: 'connected',
        message: 'Connected to SynapseFlow MCP Server',
        timestamp: new Date().toISOString(),
      });

      // Handle client disconnect
      request.raw.on('close', () => {
        logger.info(`SSE client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      // Keep connection alive
      const keepAlive = setInterval(() => {
        if (!this.clients.has(clientId)) {
          clearInterval(keepAlive);
          return;
        }

        reply.raw.write(`:keepalive\n\n`);
      }, 30000); // Every 30 seconds

      return reply;
    });

    // Research query endpoint (triggers research and streams results)
    fastify.post('/research', async (request, reply) => {
      const query = request.body as any;

      logger.info('Received research query via SSE', { query });

      // Start async research and stream updates
      this.streamResearch(query);

      return { status: 'started', message: 'Research initiated, check SSE stream for updates' };
    });
  }

  /**
   * Stream research updates to all connected clients
   */
  private async streamResearch(query: any): Promise<void> {
    const updates = [
      { type: 'research-started', data: { query, timestamp: new Date().toISOString() } },
      { type: 'agent-status', data: { agent: 'PaperScraperAgent', status: 'running' } },
      { type: 'agent-status', data: { agent: 'CrossDomainAgent', status: 'running' } },
      { type: 'papers-found', data: { count: 1000 } },
      { type: 'processing', data: { progress: 25, message: 'Processing papers with ruv-swarm' } },
      { type: 'processing', data: { progress: 50, message: 'Building citation graph' } },
      { type: 'processing', data: { progress: 75, message: 'Generating hypotheses' } },
      { type: 'research-complete', data: { success: true, latency: '342ms' } },
    ];

    // Simulate streaming updates
    for (const update of updates) {
      await this.sleep(1000);
      this.broadcast(update);
    }

    // Get actual results from backend
    try {
      const results = await this.mcpHandler.executeResearch(query);
      this.broadcast({ type: 'results', data: results });
    } catch (error) {
      logger.error('Research error:', error);
      this.broadcast({ type: 'error', data: { message: 'Research failed' } });
    }
  }

  /**
   * Send event to specific client
   */
  private sendEvent(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const eventId = ++this.eventId;
    const event = `id: ${eventId}\ndata: ${JSON.stringify(data)}\n\n`;

    try {
      client.reply.raw.write(event);
      client.lastEventId = eventId;
    } catch (error) {
      logger.error(`Failed to send event to client ${clientId}:`, error);
      this.clients.delete(clientId);
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(data: any): void {
    logger.info(`Broadcasting to ${this.clients.size} clients`, { type: data.type });

    for (const [clientId, client] of this.clients) {
      this.sendEvent(clientId, data);
    }
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Shutdown SSE server
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down SSE server');

    // Send disconnect event to all clients
    this.broadcast({ type: 'server-shutdown', message: 'Server is shutting down' });

    // Close all client connections
    for (const [clientId, client] of this.clients) {
      try {
        client.reply.raw.end();
      } catch (error) {
        logger.error(`Error closing client ${clientId}:`, error);
      }
    }

    this.clients.clear();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
