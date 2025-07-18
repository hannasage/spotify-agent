import { Agent, MCPServerStdio } from '@openai/agents';
import { SpotifyOrchestratorConfig } from './types';
import { loadPrompt } from './prompts/utils';
import { SpotifyOrchestrator, SpotifyAgentConfig } from './orchestrator';

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
 * Create and configure the Spotify Orchestrator system
 * 
 * This function initializes the Spotify Orchestrator with specialized agents
 * for playback, search, library management, and queue management.
 * 
 * @returns Object containing the orchestrator and specialized agents
 * @throws Error if MCP server connection fails
 */
export async function createSpotifyOrchestrator(): Promise<SpotifyOrchestratorConfig> {
  mcpServer = await createMCPServer();
  
  // Create specialized agents
  const playbackAgent = new Agent({
    name: 'Playback Control Agent',
    model: 'gpt-4o-mini',
    instructions: loadPrompt('playback-agent'),
    tools: [],
    mcpServers: [mcpServer]
  });

  const searchAgent = new Agent({
    name: 'Search & Discovery Agent',
    model: 'gpt-4o-mini',
    instructions: loadPrompt('search-agent'),
    tools: [],
    mcpServers: [mcpServer]
  });

  const libraryAgent = new Agent({
    name: 'Library Management Agent',
    model: 'gpt-4o-mini',
    instructions: loadPrompt('library-agent'),
    tools: [],
    mcpServers: [mcpServer]
  });

  const queueAgent = new Agent({
    name: 'Queue Manager',
    model: 'gpt-4o-mini',
    instructions: loadPrompt('queue-manager'),
    tools: [],
    mcpServers: [mcpServer]
  });

  // Create the specialized agents configuration
  const specializedAgents: SpotifyAgentConfig = {
    playback: playbackAgent,
    search: searchAgent,
    library: libraryAgent,
    queue: queueAgent
  };

  // Create the orchestrator
  const orchestrator = new SpotifyOrchestrator(specializedAgents);

  return {
    orchestrator,
    agents: specializedAgents
  };
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