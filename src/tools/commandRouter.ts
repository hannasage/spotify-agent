/**
 * Command router for handling system commands via agent-based parsing
 */

import { Agent, run } from '@openai/agents';
import { SystemContext } from './types';
import { toolRegistry } from './registry';
import { debug } from '../debug';
import { loadPrompt } from '../utils';

/**
 * Command router that uses an agent to parse user input and execute system tools
 */
export class CommandRouter {
  private agent: Agent | null = null;
  private context: SystemContext;

  constructor(context: SystemContext) {
    this.context = context;
  }

  /**
   * Initialize the command router agent
   */
  async initialize(): Promise<void> {
    if (this.agent) return;

    const toolDescriptions = toolRegistry.getToolDescriptions();

    this.agent = new Agent({
      name: 'Command Router',
      model: 'gpt-4o-mini',
      instructions: loadPrompt('command-router', { 
        TOOL_DESCRIPTIONS: toolDescriptions 
      }),
      tools: []
    });

    debug.log('🤖 Command router agent initialized');
  }

  /**
   * Route user input to appropriate handler
   */
  async routeCommand(userInput: string): Promise<CommandRouterResult> {
    if (!this.agent) {
      await this.initialize();
    }

    try {
      debug.log(`🔀 [COMMAND-ROUTER] Analyzing: "${userInput}"`);
      
      // Use the agent to analyze the input
      const result = await run(this.agent!, userInput, { maxTurns: 3 });
      const response = result.finalOutput?.trim();

      if (!response) {
        return { type: 'lookup', content: userInput };
      }

      // Parse the agent's response
      if (response.startsWith('TOOL: ')) {
        const toolName = response.substring(6).trim();
        debug.log(`🔀 [COMMAND-ROUTER] Detected system tool: ${toolName}`);
        return await this.executeSystemTool(toolName);
      } else if (response.startsWith('PLAYBACK: ')) {
        const playbackRequest = response.substring(10).trim();
        debug.log(`🔀 [COMMAND-ROUTER] Detected playback request: ${playbackRequest}`);
        return { type: 'playback', content: playbackRequest };
      } else if (response.startsWith('LOOKUP: ')) {
        const lookupRequest = response.substring(8).trim();
        debug.log(`🔀 [COMMAND-ROUTER] Detected lookup request: ${lookupRequest}`);
        return { type: 'lookup', content: lookupRequest };
      } else if (response.startsWith('CLARIFY: ')) {
        const clarification = response.substring(9).trim();
        debug.log(`🔀 [COMMAND-ROUTER] Needs clarification: ${clarification}`);
        return { type: 'clarification', content: clarification };
      } else {
        // Fallback: treat as lookup request
        debug.log(`🔀 [COMMAND-ROUTER] Fallback to lookup: ${userInput}`);
        return { type: 'lookup', content: userInput };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug.log(`🔀 [COMMAND-ROUTER] Error: ${errorMessage}`);
      
      // Fallback to treating as lookup request
      return { type: 'lookup', content: userInput };
    }
  }

  /**
   * Execute a system tool
   */
  private async executeSystemTool(toolName: string): Promise<CommandRouterResult> {
    const tool = toolRegistry.getTool(toolName);
    
    if (!tool) {
      debug.log(`🔀 [COMMAND-ROUTER] Tool not found: ${toolName}`);
      return { 
        type: 'error', 
        content: `System tool '${toolName}' not found. Please try a different command.` 
      };
    }

    try {
      const result = await tool.execute(this.context);
      debug.log(`🔀 [COMMAND-ROUTER] Tool ${toolName} executed: ${result.success ? 'success' : 'error'}`);
      
      return {
        type: result.success ? 'system_success' : 'error',
        content: result.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug.log(`🔀 [COMMAND-ROUTER] Tool execution failed: ${errorMessage}`);
      
      return { 
        type: 'error', 
        content: `Failed to execute ${toolName}: ${errorMessage}` 
      };
    }
  }

  /**
   * Update the context (called when agents are initialized)
   */
  updateContext(context: SystemContext): void {
    this.context = context;
  }
}

/**
 * Result from command routing
 */
export interface CommandRouterResult {
  /** Type of result */
  type: 'system_success' | 'playback' | 'lookup' | 'clarification' | 'error';
  /** Content/message */
  content: string;
}