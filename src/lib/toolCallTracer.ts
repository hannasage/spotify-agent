import { Agent, run } from '@openai/agents';

/**
 * Enhanced trace data structure for tool calls
 */
export interface ToolCallTrace {
  id: string;
  timestamp: string;
  type: 'tool_call_start' | 'tool_call_end' | 'tool_call_error';
  toolName: string;
  toolParameters: any;
  toolResult?: any;
  duration?: number;
  error?: string;
  agentName: string;
  sessionId: string;
}

/**
 * Tool call tracer that captures detailed information about tool calls
 * Similar to OpenAI's dashboard functionality
 */
export class ToolCallTracer {
  private activeToolCalls: Map<string, { startTime: number; toolName: string; parameters: any; agentName: string }> = new Map();
  private traceCallback: (trace: ToolCallTrace) => Promise<void>;
  private getSessionId: () => string;

  constructor(traceCallback: (trace: ToolCallTrace) => Promise<void>, getSessionId?: () => string) {
    this.traceCallback = traceCallback;
    this.getSessionId = getSessionId || (() => 'current_session');
  }

  /**
   * Generate a unique tool call ID
   */
  private generateToolCallId(): string {
    return `tool_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start tracing a tool call
   */
  async startToolCall(toolName: string, parameters: any, agentName: string): Promise<string> {
    const toolCallId = this.generateToolCallId();
    const startTime = Date.now();

    // Store active tool call
    this.activeToolCalls.set(toolCallId, {
      startTime,
      toolName,
      parameters,
      agentName
    });

    // Trace tool call start
    await this.traceCallback({
      id: toolCallId,
      timestamp: new Date().toISOString(),
      type: 'tool_call_start',
      toolName,
      toolParameters: parameters,
      agentName,
      sessionId: this.getSessionId()
    });

    return toolCallId;
  }

  /**
   * End tracing a tool call with result
   */
  async endToolCall(toolCallId: string, result: any): Promise<void> {
    const activeCall = this.activeToolCalls.get(toolCallId);
    if (!activeCall) {
      console.warn(`Tool call ${toolCallId} not found in active calls`);
      return;
    }

    const duration = Date.now() - activeCall.startTime;

    // Trace tool call end
    await this.traceCallback({
      id: toolCallId,
      timestamp: new Date().toISOString(),
      type: 'tool_call_end',
      toolName: activeCall.toolName,
      toolParameters: activeCall.parameters,
      toolResult: result,
      duration,
      agentName: activeCall.agentName,
      sessionId: this.getSessionId()
    });

    // Remove from active calls
    this.activeToolCalls.delete(toolCallId);
  }

  /**
   * End tracing a tool call with error
   */
  async errorToolCall(toolCallId: string, error: string): Promise<void> {
    const activeCall = this.activeToolCalls.get(toolCallId);
    if (!activeCall) {
      console.warn(`Tool call ${toolCallId} not found in active calls`);
      return;
    }

    const duration = Date.now() - activeCall.startTime;

    // Trace tool call error
    await this.traceCallback({
      id: toolCallId,
      timestamp: new Date().toISOString(),
      type: 'tool_call_error',
      toolName: activeCall.toolName,
      toolParameters: activeCall.parameters,
      duration,
      error,
      agentName: activeCall.agentName,
      sessionId: this.getSessionId()
    });

    // Remove from active calls
    this.activeToolCalls.delete(toolCallId);
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
  getActiveToolCalls(): Array<{ id: string; toolName: string; agentName: string; duration: number }> {
    const now = Date.now();
    return Array.from(this.activeToolCalls.entries()).map(([id, call]) => ({
      id,
      toolName: call.toolName,
      agentName: call.agentName,
      duration: now - call.startTime
    }));
  }
}

/**
 * Enhanced run function that captures tool calls
 */
export async function runWithToolCallTracing(
  agent: Agent,
  input: string,
  traceCallback: (trace: ToolCallTrace) => Promise<void>,
  getSessionId?: () => string
): Promise<any> {
  // Create a proxy to intercept tool calls
  const originalRun = run;
  const sessionId = getSessionId ? getSessionId() : 'agent_execution_session';
  
  // For now, we'll use the standard run function but enhance our tracing
  // In a future version, we could intercept the actual tool calls if the SDK supports it
  const result = await originalRun(agent, input);
  
  // Since we can't directly intercept tool calls with the current SDK version,
  // we'll trace the overall agent execution and note that tool calls occurred
  await traceCallback({
    id: `agent_run_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'tool_call_start',
    toolName: 'agent_execution',
    toolParameters: {
      input,
      agentName: agent.name || 'unknown',
      model: agent.model || 'unknown'
    },
    agentName: agent.name || 'unknown',
    sessionId
  });

  await traceCallback({
    id: `agent_run_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'tool_call_end',
    toolName: 'agent_execution',
    toolParameters: {
      input,
      agentName: agent.name || 'unknown',
      model: agent.model || 'unknown'
    },
    toolResult: {
      finalOutput: result.finalOutput,
      hasError: false,
      error: undefined
    },
    agentName: agent.name || 'unknown',
    sessionId
  });

  return result;
}

/**
 * Factory function to create a tool call tracer
 */
export function createToolCallTracer(traceCallback: (trace: ToolCallTrace) => Promise<void>, getSessionId?: () => string): ToolCallTracer {
  return new ToolCallTracer(traceCallback, getSessionId);
}

// Re-export MCPToolCallTrace for convenience
export type { MCPToolCallTrace } from './mcpToolCallInterceptor';
