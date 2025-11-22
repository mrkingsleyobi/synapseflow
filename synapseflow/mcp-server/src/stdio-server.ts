/**
 * stdio Server
 * Handles command-line interface communication via stdin/stdout
 */

import * as readline from 'readline';
import { MCPHandler } from './mcp-handler.js';
import { logger } from './utils/logger.js';

export class StdioServer {
  private mcpHandler: MCPHandler;
  private rl: readline.Interface | null = null;
  private isRunning = false;

  constructor(mcpHandler: MCPHandler) {
    this.mcpHandler = mcpHandler;
  }

  /**
   * Start stdio server
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('stdio server already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting stdio MCP server...');

    // Create readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    // Show welcome message
    this.output({
      type: 'welcome',
      message: 'SynapseFlow MCP Server (stdio mode)',
      version: '1.0.0',
      tools: this.mcpHandler.getToolCount(),
      commands: ['research <query>', 'tools', 'stats', 'help', 'exit'],
    });

    // Handle input
    this.rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      await this.handleCommand(trimmed);
    });

    // Handle close
    this.rl.on('close', () => {
      this.shutdown();
    });

    logger.info('stdio server started, waiting for commands...');
  }

  /**
   * Handle incoming command
   */
  private async handleCommand(command: string): Promise<void> {
    try {
      const parts = command.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      switch (cmd) {
        case 'research':
          await this.handleResearch(args.join(' '));
          break;

        case 'tools':
          this.handleTools();
          break;

        case 'stats':
          await this.handleStats();
          break;

        case 'help':
          this.handleHelp();
          break;

        case 'exit':
        case 'quit':
          this.shutdown();
          break;

        default:
          this.output({
            type: 'error',
            message: `Unknown command: ${cmd}. Type 'help' for available commands.`,
          });
      }
    } catch (error) {
      logger.error('Command error:', error);
      this.output({
        type: 'error',
        message: error instanceof Error ? error.message : 'Command failed',
      });
    }
  }

  /**
   * Handle research command
   */
  private async handleResearch(query: string): Promise<void> {
    if (!query) {
      this.output({
        type: 'error',
        message: 'Please provide a research query. Usage: research <query>',
      });
      return;
    }

    this.output({
      type: 'research-started',
      query,
      timestamp: new Date().toISOString(),
    });

    try {
      // Execute research via MCP handler
      const results = await this.mcpHandler.executeResearch({ query });

      this.output({
        type: 'research-complete',
        data: {
          papers: results.papers.length,
          totalResults: results.totalResults,
          latency: results.latency,
          agentsUsed: results.agentsUsed,
        },
      });

      // Output first 5 papers
      this.output({
        type: 'papers',
        data: results.papers.slice(0, 5),
      });

      // Output hypotheses if available
      if (results.hypotheses && results.hypotheses.length > 0) {
        this.output({
          type: 'hypotheses',
          data: results.hypotheses,
        });
      }
    } catch (error) {
      logger.error('Research failed:', error);
      this.output({
        type: 'error',
        message: 'Research failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
      });
    }
  }

  /**
   * Handle tools command
   */
  private handleTools(): void {
    const tools = this.mcpHandler.getTools();

    this.output({
      type: 'tools',
      count: tools.length,
      data: tools,
    });
  }

  /**
   * Handle stats command
   */
  private async handleStats(): Promise<void> {
    try {
      const stats = await this.mcpHandler.getStats();

      this.output({
        type: 'stats',
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get stats:', error);
      this.output({
        type: 'error',
        message: 'Failed to get stats',
      });
    }
  }

  /**
   * Handle help command
   */
  private handleHelp(): void {
    this.output({
      type: 'help',
      commands: [
        { cmd: 'research <query>', description: 'Perform research with AI agents' },
        { cmd: 'tools', description: 'List available MCP tools' },
        { cmd: 'stats', description: 'Get system statistics' },
        { cmd: 'help', description: 'Show this help message' },
        { cmd: 'exit', description: 'Exit the MCP server' },
      ],
      examples: [
        'research transformer applications in biology',
        'research quantum computing in cryptography',
        'tools',
        'stats',
      ],
    });
  }

  /**
   * Output data to stdout
   */
  private output(data: any): void {
    console.log(JSON.stringify(data, null, 2));
  }

  /**
   * Shutdown stdio server
   */
  shutdown(): void {
    if (!this.isRunning) return;

    logger.info('Shutting down stdio server');

    this.output({
      type: 'shutdown',
      message: 'SynapseFlow MCP Server shutting down...',
    });

    this.isRunning = false;

    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    process.exit(0);
  }
}
