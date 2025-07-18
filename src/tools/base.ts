/**
 * Base utilities and helper functions for the tools system
 */

import { SystemContext, ToolResult, SystemTool } from './types';

/**
 * Create a successful tool result
 */
export function createSuccessResult(message: string): ToolResult {
  return {
    success: true,
    message
  };
}

/**
 * Create an error tool result
 */
export function createErrorResult(message: string, error?: string): ToolResult {
  const result: ToolResult = {
    success: false,
    message
  };
  if (error !== undefined) {
    result.error = error;
  }
  return result;
}

/**
 * Validate that agents are available in the context
 */
export function validateAgents(agents: import('../types').AgentConfig | null): ToolResult | null {
  if (!agents) {
    return createErrorResult(
      'System not ready - agents are still initializing. Please wait a moment and try again.'
    );
  }
  return null;
}

/**
 * Abstract base class for system tools
 */
export abstract class BaseTool implements SystemTool {
  abstract name: string;
  abstract description: string;

  /**
   * Execute the tool with error handling
   */
  async execute(context: SystemContext): Promise<ToolResult> {
    try {
      return await this.executeImpl(context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Tool ${this.name} failed:`, errorMessage);
      return createErrorResult(
        `Failed to execute ${this.name}: ${errorMessage}`,
        errorMessage
      );
    }
  }

  /**
   * Internal execution method to be implemented by subclasses
   */
  protected abstract executeImpl(context: SystemContext): Promise<ToolResult>;
}