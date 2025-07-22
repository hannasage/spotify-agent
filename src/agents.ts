import { Agent, MCPServerStdio } from '@openai/agents';
import { AgentConfig } from './types';
import { loadPrompt, validatePrompts, preloadPrompts } from './utils';
import { createMCPToolCallInterceptor, MCPToolCallInterceptor } from './lib/mcpToolCallInterceptor';
import { tavilyWebSearchTool } from './tools/lookupTools';
import { createSystemToolsForAgent } from './tools/systemToolsForAgent';

/**
 * Agent factory and configuration module
 * 
 * This module handles the creation and configuration of OpenAI agents
 * and their connection to the Spotify MCP server. It provides a clean
 * interface for initializing the multi-agent system.
 */

let mcpServer: MCPServerStdio | null = null;
let mcpInterceptor: MCPToolCallInterceptor | null = null;

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
 * Create and configure the Spotify agent system
 * 
 * This function initializes the Spotify Agent that handles all operations:
 * playback actions, information retrieval, and system commands.
 * 
 * @param traceCallback - Optional callback for tracing MCP tool calls
 * @param getSessionId - Optional function to get current session ID
 * @param systemContext - System context for system tools (optional, can be null during startup)
 * @returns Object containing the Spotify Agent
 * @throws Error if MCP server connection fails
 */
export async function createAgents(
  traceCallback?: (trace: any) => Promise<void>,
  getSessionId?: () => string,
  systemContext?: any
): Promise<AgentConfig> {
  mcpServer = await createMCPServer();
  
  // Setup MCP tool call interceptor if tracing is enabled
  if (traceCallback && getSessionId) {
    mcpInterceptor = createMCPToolCallInterceptor(mcpServer, traceCallback, getSessionId);
  }
  
  // Validate that the Spotify Agent prompt exists
  validatePrompts(['spotify-agent']);
  
  // Preload the Spotify Agent prompt for better performance
  preloadPrompts(['spotify-agent']);
  
  // Prepare tools for the Spotify Agent
  const agentTools = [tavilyWebSearchTool];
  
  // Add system tools if system context is available
  if (systemContext) {
    const systemTools = createSystemToolsForAgent(systemContext);
    agentTools.push(...systemTools);
  }
  
  // Create Spotify Agent - handles all operations
  const spotifyAgent = new Agent({
    name: 'Spotify Agent',
    model: 'gpt-4o-mini',
    instructions: loadPrompt('spotify-agent'),
    tools: agentTools,
    mcpServers: [mcpServer]
  });

  return { spotify: spotifyAgent };
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

/**
 * Get the current MCP tool call interceptor instance
 * @returns Current MCP interceptor or null if not initialized
 */
export function getMCPInterceptor(): MCPToolCallInterceptor | null {
  return mcpInterceptor;
}