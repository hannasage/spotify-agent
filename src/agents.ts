import { Agent, MCPServerStdio } from '@openai/agents';
import { AgentConfig } from './types';
import { loadPrompt } from './prompts/utils';

/**
 * Agent factory and configuration module
 * 
 * This module handles the creation and configuration of OpenAI agents
 * and their connection to the Spotify MCP server. It provides a clean
 * interface for initializing the multi-agent system.
 */

let mcpServer: MCPServerStdio | null = null;

/**
 * Create and configure the Spotify MCP server connection
 * @returns Configured MCP server instance
 * @throws Error if SPOTIFY_MCP_PATH environment variable is not set
 */
async function createMCPServer(): Promise<MCPServerStdio> {
  if (!process.env.SPOTIFY_MCP_PATH) {
    throw new Error('SPOTIFY_MCP_PATH environment variable is not set');
  }
  
  const server = new MCPServerStdio({
    name: 'Spotify MCP Server',
    fullCommand: `node ${process.env.SPOTIFY_MCP_PATH}`,
    cacheToolsList: true
  });
  
  // Ensure the server is properly connected
  await server.connect();
  return server;
}

/**
 * Create and configure the agent system
 * 
 * This function initializes both the main Spotify agent and the specialized
 * queue manager agent, connecting them to the MCP server for Spotify API access.
 * 
 * @returns Object containing both configured agents
 * @throws Error if MCP server connection fails
 */
export async function createAgents(): Promise<AgentConfig> {
  mcpServer = await createMCPServer();
  
  // Create Queue Agent - specialized in music curation
  const queueAgent = new Agent({
    name: 'Queue Manager',
    model: 'gpt-4o-mini',
    instructions: loadPrompt('queue-manager'),
    tools: [],
    mcpServers: [mcpServer]
  });

  // Create main Spotify Agent - handles user interaction and delegates queue management
  const spotifyAgent = new Agent({
    name: 'Spotify Assistant',
    model: 'gpt-4o-mini',
    instructions: loadPrompt('spotify-assistant'),
    tools: [],
    mcpServers: [mcpServer]
  });

  return { spotify: spotifyAgent, queue: queueAgent };
}

/**
 * Clean up MCP server connection
 * 
 * This function should be called when the application is shutting down
 * to properly close the MCP server connection.
 */
export async function cleanupMCPServer(): Promise<void> {
  if (mcpServer) {
    try {
      await mcpServer.close();
    } catch (error) {
      console.error('Error closing MCP server:', error);
    }
  }
}

/**
 * Get the current MCP server instance
 * @returns Current MCP server or null if not initialized
 */
export function getMCPServer(): MCPServerStdio | null {
  return mcpServer;
}