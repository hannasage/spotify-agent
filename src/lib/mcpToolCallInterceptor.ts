import { MCPServerStdio } from '@openai/agents';

/**
 * MCP Tool Call trace data structure
 */
export interface MCPToolCallTrace {
  id: string;
  timestamp: string;
  type: 'mcp_tool_call_start' | 'mcp_tool_call_end' | 'mcp_tool_call_error';
  toolName: string;
  toolParameters: any;
  toolResult?: any;
  duration?: number;
  error?: string;
  sessionId: string;
}

/**
 * Interceptor wrapper for MCP server to capture individual tool calls
 */
export class MCPToolCallInterceptor {
  private originalCallTool: Function;
  private traceCallback: (trace: MCPToolCallTrace) => Promise<void>;
  private getSessionId: () => string;
  private activeToolCalls: Map<string, { startTime: number; toolName: string; parameters: any }> = new Map();

  constructor(
    mcpServer: MCPServerStdio,
    traceCallback: (trace: MCPToolCallTrace) => Promise<void>,
    getSessionId: () => string
  ) {
    this.traceCallback = traceCallback;
    this.getSessionId = getSessionId;
    
    // Store original callTool method
    this.originalCallTool = mcpServer.callTool.bind(mcpServer);
    
    // Replace callTool with our intercepting version
    mcpServer.callTool = this.interceptCallTool.bind(this);
  }

  /**
   * Generate a unique tool call ID
   */
  private generateToolCallId(): string {
    return `mcp_tool_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Intercepting callTool method that captures tool call details
   * 
   * This method will capture calls to tools like:
   * - spotify_get_current_track
   * - spotify_play_song  
   * - spotify_pause
   * - spotify_skip_track
   * - spotify_search_tracks
   * And log their names, parameters, and results to the trace system
   */
  private async interceptCallTool(toolName: string, parameters: any): Promise<any> {
    const toolCallId = this.generateToolCallId();
    const startTime = Date.now();
    const sessionId = this.getSessionId();

    // Store active tool call
    this.activeToolCalls.set(toolCallId, {
      startTime,
      toolName,
      parameters
    });

    // Trace tool call start
    await this.traceCallback({
      id: toolCallId,
      timestamp: new Date().toISOString(),
      type: 'mcp_tool_call_start',
      toolName,
      toolParameters: parameters,
      sessionId
    });

    try {
      // Call the original method
      const result = await this.originalCallTool(toolName, parameters);
      const duration = Date.now() - startTime;

      // Trace successful tool call end
      await this.traceCallback({
        id: toolCallId,
        timestamp: new Date().toISOString(),
        type: 'mcp_tool_call_end',
        toolName,
        toolParameters: parameters,
        toolResult: result,
        duration,
        sessionId
      });

      // Remove from active calls
      this.activeToolCalls.delete(toolCallId);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Trace tool call error
      await this.traceCallback({
        id: toolCallId,
        timestamp: new Date().toISOString(),
        type: 'mcp_tool_call_error',
        toolName,
        toolParameters: parameters,
        duration,
        error: errorMessage,
        sessionId
      });

      // Remove from active calls
      this.activeToolCalls.delete(toolCallId);

      // Re-throw the error
      throw error;
    }
  }

  /**
   * Get active tool calls count
   */
  getActiveToolCallsCount(): number {
    return this.activeToolCalls.size;
  }

  /**
   * Get active tool calls info
   */
  getActiveToolCalls(): Array<{ id: string; toolName: string; duration: number }> {
    const now = Date.now();
    return Array.from(this.activeToolCalls.entries()).map(([id, call]) => ({
      id,
      toolName: call.toolName,
      duration: now - call.startTime
    }));
  }
}

/**
 * Factory function to create and apply MCP tool call interceptor
 */
export function createMCPToolCallInterceptor(
  mcpServer: MCPServerStdio,
  traceCallback: (trace: MCPToolCallTrace) => Promise<void>,
  getSessionId: () => string
): MCPToolCallInterceptor {
  return new MCPToolCallInterceptor(mcpServer, traceCallback, getSessionId);
}