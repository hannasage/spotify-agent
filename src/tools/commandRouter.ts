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
    try {
      debug.log(`🔀 [COMMAND-ROUTER] Analyzing: "${userInput}"`);
      
      // DIRECT BYPASS: Slash commands should never reach here, but just in case
      if (userInput.startsWith('/')) {
        debug.log(`🔀 [COMMAND-ROUTER] WARNING: Slash command reached router, routing to orchestrator: "${userInput}"`);
        return { type: 'orchestrator', content: userInput };
      }
      
      // First, try direct keyword matching for common system commands
      const directMatch = this.tryDirectKeywordMatch(userInput);
      if (directMatch) {
        debug.log(`🔀 [COMMAND-ROUTER] Direct keyword match: ${directMatch}`);
        return await this.executeSystemTool(directMatch);
      }

      // If no direct match, use the agent for more complex analysis
      if (!this.agent) {
        await this.initialize();
      }
      
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
   * Try direct keyword matching for common system commands
   */
  private tryDirectKeywordMatch(userInput: string): string | null {
    const input = userInput.toLowerCase().trim();
    
    // Auto-queue start patterns
    if (this.matchesAny(input, [
      'start auto queue', 'start auto mode', 'enable auto queue', 'turn on auto queue',
      'auto queue on', 'start continuous play', 'enable continuous play', 'auto mode on',
      'turn on continuous', 'start auto', 'enable auto', 'auto on'
    ])) {
      return 'start_auto_queue';
    }
    
    // Auto-queue stop patterns
    if (this.matchesAny(input, [
      'stop auto queue', 'stop auto mode', 'disable auto queue', 'turn off auto queue',
      'auto queue off', 'stop continuous play', 'disable continuous play', 'auto mode off',
      'turn off continuous', 'stop auto', 'disable auto', 'auto off'
    ])) {
      return 'stop_auto_queue';
    }
    
    // Pool stats patterns
    if (this.matchesAny(input, [
      'show pool stats', 'pool statistics', 'song pool stats', 'pool info', 'show pool',
      'pool stats', 'show song pool', 'pool information'
    ])) {
      return 'show_pool_stats';
    }
    
    // Pool refresh patterns
    if (this.matchesAny(input, [
      'refresh pool', 'reload pool', 'update pool', 'refresh song pool',
      'reload song pool', 'update song pool'
    ])) {
      return 'refresh_pool';
    }
    
    // Song history patterns
    if (this.matchesAny(input, [
      'show song history', 'song history', 'recent songs', 'what did i play',
      'show history', 'recent tracks', 'what songs did i play', 'played songs'
    ])) {
      return 'show_song_history';
    }
    
    // Clear history patterns
    if (this.matchesAny(input, [
      'clear song history', 'clear history', 'reset history', 'delete history',
      'clear song history', 'remove history'
    ])) {
      return 'clear_song_history';
    }
    
    // Help patterns
    if (this.matchesAny(input, [
      'help', 'show help', 'commands', 'what can you do', 'available commands',
      'show commands', 'list commands'
    ])) {
      return 'show_help';
    }
    
    // Agent status patterns
    if (this.matchesAny(input, [
      'agent status', 'system status', 'show agents', 'what agents', 'agents',
      'show system status', 'system info'
    ])) {
      return 'show_agent_status';
    }
    
    // Clear conversation patterns
    if (this.matchesAny(input, [
      'clear conversation', 'clear chat', 'reset conversation', 'start over',
      'clear messages', 'reset chat'
    ])) {
      return 'clear_conversation';
    }
    
    // Conversation history patterns
    if (this.matchesAny(input, [
      'show conversation history', 'conversation history', 'chat history',
      'show chat history', 'message history'
    ])) {
      return 'show_conversation_history';
    }
    
    return null;
  }
  
  /**
   * Check if input matches any of the provided patterns
   */
  private matchesAny(input: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      // Try exact match first
      if (input === pattern) return true;
      
      // Try contains match for key phrases
      const words = pattern.split(' ');
      const inputWords = input.split(' ');
      
      // Check if all words from pattern are in input
      return words.every(word => inputWords.includes(word));
    });
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