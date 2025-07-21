import { Agent, MCPServerStdio } from '@openai/agents';
import { AgentConfig } from './types';
import { loadPrompt, validatePrompts, preloadPrompts } from './utils';
import { createMCPToolCallInterceptor, MCPToolCallInterceptor } from './lib/mcpToolCallInterceptor';
import { tavilyWebSearchTool } from './tools/lookupTools';

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
 * Create and configure the agent system
 * 
 * This function initializes both the main Spotify agent and the specialized
 * queue manager agent, connecting them to the MCP server for Spotify API access.
 * 
 * @param traceCallback - Optional callback for tracing MCP tool calls
 * @param getSessionId - Optional function to get current session ID
 * @returns Object containing both configured agents
 * @throws Error if MCP server connection fails
 */
export async function createAgents(
  traceCallback?: (trace: any) => Promise<void>,
  getSessionId?: () => string
): Promise<AgentConfig> {
  mcpServer = await createMCPServer();
  
  // Setup MCP tool call interceptor if tracing is enabled
  if (traceCallback && getSessionId) {
    mcpInterceptor = createMCPToolCallInterceptor(mcpServer, traceCallback, getSessionId);
  }
  
  // Validate that all required prompts exist
  validatePrompts(['playback-agent', 'lookup-agent']);
  
  // Preload prompts for better performance
  preloadPrompts(['playback-agent', 'lookup-agent']);
  
  // Create Playback Agent - specialized in music playback actions
  const playbackAgent = new Agent({
    name: 'Playback Agent',
    model: 'gpt-4o-mini',
    instructions: loadPrompt('playback-agent'),
    tools: [],
    mcpServers: [mcpServer]
  });

  // Create Lookup Agent - specialized in music information retrieval
  const lookupAgent = new Agent({
    name: 'Lookup Agent',
    model: 'gpt-4o-mini',
    instructions: loadPrompt('lookup-agent'),
    tools: [tavilyWebSearchTool],
    mcpServers: [mcpServer]
  });

  return { playback: playbackAgent, lookup: lookupAgent };
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