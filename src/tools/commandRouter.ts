/**
 * Command router for handling system commands via agent-based parsing
 */

import { Agent, run } from '@openai/agents';
import { SystemContext } from './types';
import { toolRegistry } from './registry';
import { debug } from '../debug';
import { loadPrompt } from '../prompts/utils';

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

    const basePrompt = loadPrompt('command-router');
    const promptWithTools = `${basePrompt}

## Available System Tools:
${toolDescriptions}`;
    
    this.agent = new Agent({
      name: 'Command Router',
      model: 'gpt-4o-mini',
      instructions: promptWithTools,
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
        return { type: 'orchestrator', content: userInput };
      }

      // Parse the agent's response
      if (response.startsWith('TOOL: ')) {
        const toolName = response.substring(6).trim();
        debug.log(`🔀 [COMMAND-ROUTER] Detected system tool: ${toolName}`);
        return await this.executeSystemTool(toolName);
      } else if (response.startsWith('ORCHESTRATOR: ')) {
        const orchestratorRequest = response.substring(14).trim();
        debug.log(`🔀 [COMMAND-ROUTER] Detected Orchestrator request: ${orchestratorRequest}`);
        return { type: 'orchestrator', content: orchestratorRequest };
      } else if (response.startsWith('SPOTIFY: ')) {
        const spotifyRequest = response.substring(9).trim();
        debug.log(`🔀 [COMMAND-ROUTER] Detected Spotify request: ${spotifyRequest}`);
        return { type: 'spotify', content: spotifyRequest };
      } else if (response.startsWith('CLARIFY: ')) {
        const clarification = response.substring(9).trim();
        debug.log(`🔀 [COMMAND-ROUTER] Needs clarification: ${clarification}`);
        return { type: 'clarification', content: clarification };
      } else {
        // Fallback: treat as Orchestrator request
        debug.log(`🔀 [COMMAND-ROUTER] Fallback to Orchestrator: ${userInput}`);
        return { type: 'orchestrator', content: userInput };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug.log(`🔀 [COMMAND-ROUTER] Error: ${errorMessage}`);
      
      // Fallback to treating as Orchestrator request
      return { type: 'orchestrator', content: userInput };
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
  type: 'system_success' | 'spotify' | 'orchestrator' | 'clarification' | 'error';
  /** Content/message */
  content: string;
}