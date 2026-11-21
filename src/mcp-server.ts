#!/usr/bin/env node
/**
 * MCP Server Entry Point for Discord Server Management
 *
 * This is a standalone entry point that starts an MCP server
 * for managing Discord servers via Claude Code.
 *
 * Usage:
 *   node dist/mcp-server.js
 *
 * Required environment variables:
 *   DISCORD_TOKEN - Your Discord bot token
 *
 * Optional environment variables:
 *   DISCORD_GUILD_ID - The default Discord server. Tools can target any other
 *                      server the bot is in through their "server" argument.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { initializeClient, destroyClient, refreshServerCache, getDefaultGuildId, listGuilds } from './discord-client.js';
import { createMCPServer, startMCPServer } from './index.js';

export async function main(): Promise<void> {
  // Validate required environment variables
  // Support both DISCORD_TOKEN and BOT_TOKEN (fallback)
  const token = process.env['DISCORD_TOKEN'] || process.env['BOT_TOKEN'];

  if (!token) {
    console.error('');
    console.error('  Error: DISCORD_TOKEN is not set.');
    console.error('');
    console.error('  Run the setup wizard to configure:');
    console.error('    npx @quadslab.io/discord-mcp init');
    console.error('');
    console.error('  Or set it manually:');
    console.error('    DISCORD_TOKEN=your-bot-token');
    console.error('');
    process.exit(1);
  }

  // Set DISCORD_TOKEN for the discord-client module
  process.env['DISCORD_TOKEN'] = token;

  console.error('[discord-mcp] Starting...');

  try {
    // Initialize Discord client
    const client = await initializeClient();
    console.error(`[discord-mcp] Logged in as ${client.user?.tag}`);

    // Pre-cache the default server's data for fast lookups (other servers cache on first use)
    const defaultGuildId = getDefaultGuildId();
    if (defaultGuildId) {
      try {
        await refreshServerCache();
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error(`[discord-mcp] Default server ${defaultGuildId} unavailable: ${reason}`);
      }
    }

    // Create and start MCP server
    const mcpServer = createMCPServer();
    await startMCPServer(mcpServer);

    console.error(`[discord-mcp] Ready — ${listGuilds().length} server(s), default ${defaultGuildId ?? 'not set'}`);

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.error(`[discord-mcp] ${signal} received, shutting down...`);
      await destroyClient();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[discord-mcp] Failed to start: ${msg}`);
    console.error('');
    console.error('  Troubleshoot with:');
    console.error('    npx @quadslab.io/discord-mcp check');
    console.error('');
    await destroyClient();
    process.exit(1);
  }
}

// Auto-run only when executed directly (not imported by cli.ts)
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('mcp-server.js');
if (isDirectRun) {
  main();
}
