/**
 * Command router for handling system commands via agent-based parsing
 */

import { Agent, run } from '@openai/agents';
import { SystemContext } from './types';
import { toolRegistry } from './registry';
import { debug } from '../debug';

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
      instructions: `You are a command router for the Spotify Agent system. Your job is to analyze user input and determine if it's a system command that can be handled by available tools.

## Available System Tools:
${toolDescriptions}

## Your Decision Process:
1. **System Commands** - If it matches any available tool, respond with: TOOL: <tool_name>
2. **Music Requests** - If it's about playing music, searching, or other Spotify operations, respond with: SPOTIFY: <user_request>
3. **Default to Spotify** - When in doubt, route to Spotify agent

## System Commands (Use TOOL: only for these):
- Auto-queue management: "start auto queue", "stop auto queue", "auto queue status"
- Song pool: "show pool stats", "refresh pool", "pool statistics"
- Song history: "show song history", "clear song history", "recent songs"
- System utilities: "help", "clear conversation", "show conversation history", "agent status"

## Spotify Requests (Use SPOTIFY: for everything else):
- **Playback Control**: play, pause, resume, skip, previous, shuffle, repeat
- **Volume Control**: set volume, adjust volume, volume up/down, mute
- **Track Info**: what's playing, current track, now playing, track info
- **Search & Queue**: search for, queue, add to queue, play song/artist/album
- **Playlists**: create playlist, add to playlist, show playlists, play playlist
- **Library**: save song, show library, liked songs
- **Devices**: list devices, switch device, transfer playback
- **Any music-related request** that's not in the system commands list above

## Examples:
- "start auto queue" → TOOL: start_auto_queue
- "show pool stats" → TOOL: show_pool_stats  
- "clear song history" → TOOL: clear_song_history
- "help" → TOOL: show_help
- "set volume to 30%" → SPOTIFY: set volume to 30%
- "play some jazz" → SPOTIFY: play some jazz
- "what's playing now" → SPOTIFY: what's playing now
- "pause music" → SPOTIFY: pause music
- "skip this song" → SPOTIFY: skip this song
- "create a playlist" → SPOTIFY: create a playlist
- "search for radiohead" → SPOTIFY: search for radiohead

## Response Format:
- For system commands: "TOOL: <exact_tool_name>"
- For Spotify requests: "SPOTIFY: <original_request>"

## Important Rules:
- Only use TOOL: for the specific system commands listed above
- Use SPOTIFY: for ALL music playback, volume, search, playlist, and device operations
- When in doubt, prefer SPOTIFY over asking for clarification
- Always preserve the original user request in SPOTIFY responses
- The Spotify agent can handle a much wider range of requests than the system tools`,
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
        return { type: 'spotify', content: userInput };
      }

      // Parse the agent's response
      if (response.startsWith('TOOL: ')) {
        const toolName = response.substring(6).trim();
        debug.log(`🔀 [COMMAND-ROUTER] Detected system tool: ${toolName}`);
        return await this.executeSystemTool(toolName);
      } else if (response.startsWith('SPOTIFY: ')) {
        const spotifyRequest = response.substring(9).trim();
        debug.log(`🔀 [COMMAND-ROUTER] Detected Spotify request: ${spotifyRequest}`);
        return { type: 'spotify', content: spotifyRequest };
      } else if (response.startsWith('CLARIFY: ')) {
        const clarification = response.substring(9).trim();
        debug.log(`🔀 [COMMAND-ROUTER] Needs clarification: ${clarification}`);
        return { type: 'clarification', content: clarification };
      } else {
        // Fallback: treat as Spotify request
        debug.log(`🔀 [COMMAND-ROUTER] Fallback to Spotify: ${userInput}`);
        return { type: 'spotify', content: userInput };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug.log(`🔀 [COMMAND-ROUTER] Error: ${errorMessage}`);
      
      // Fallback to treating as Spotify request
      return { type: 'spotify', content: userInput };
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
  type: 'system_success' | 'spotify' | 'clarification' | 'error';
  /** Content/message */
  content: string;
}