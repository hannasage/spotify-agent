import { Agent, run, MCPServerStdio, tool } from '@openai/agents';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { z } from 'zod';
import { UIManager } from './ui';

dotenv.config();

// Conversation session management
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

class ConversationSession {
  private messages: ConversationMessage[] = [];
  private readonly maxHistorySize = 20; // Keep last 20 exchanges

  addUserMessage(content: string): void {
    this.messages.push({
      role: 'user',
      content,
      timestamp: new Date()
    });
    this.trimHistory();
  }

  addAssistantMessage(content: string): void {
    this.messages.push({
      role: 'assistant',
      content,
      timestamp: new Date()
    });
    this.trimHistory();
  }

  getFormattedHistory(): string {
    if (this.messages.length === 0) return '';
    
    // Format conversation history for the agent's context
    const historyText = this.messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    return `\n\nPrevious conversation context:\n${historyText}\n\nCurrent request:`;
  }

  private trimHistory(): void {
    if (this.messages.length > this.maxHistorySize) {
      this.messages = this.messages.slice(-this.maxHistorySize);
    }
  }

  clearHistory(): void {
    this.messages = [];
  }

  getMessageCount(): number {
    return this.messages.length;
  }
}

let mcpServer: MCPServerStdio | null = null;
let agents: { spotify: Agent; queue: Agent } | null = null;

// Handoff tools for agent communication
const handoffToQueueAgent = tool({
  name: 'transfer_to_queue_agent',
  description: 'Transfer control to the queue management agent for music curation and recommendations',
  parameters: z.object({
    context: z.string().describe('Context about user preferences, current session, or specific queue requests'),
    urgency: z.enum(['low', 'medium', 'high']).describe('How urgently the queue needs attention')
  }),
  execute: async (input) => {
    return `Transferring to Queue Agent with context: ${input.context} (Priority: ${input.urgency})`;
  }
});

const handoffToSpotifyAgent = tool({
  name: 'transfer_to_spotify_agent', 
  description: 'Transfer control back to the main Spotify assistant for user interaction',
  parameters: z.object({
    status: z.string().describe('Status update about queue management actions taken'),
    recommendations_added: z.number().nullable().describe('Number of songs added to queue, or null if none')
  }),
  execute: async (input) => {
    return `Returning to Spotify Agent. Status: ${input.status}${input.recommendations_added ? ` (${input.recommendations_added} songs added)` : ''}`;
  }
});

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

async function createAgents(): Promise<{ spotify: Agent; queue: Agent }> {
  mcpServer = await createMCPServer();
  
  // Create Queue Agent - specialized in music curation
  const queueAgent = new Agent({
    name: 'Queue Manager',
    model: 'gpt-4o-mini',
    instructions: `## Role and Environment
You are a specialized music curation and queue management agent. Your ONLY job is to manage Spotify's playback QUEUE - the list of songs that will play next after the current track.

## CRITICAL: QUEUE vs PLAYLIST Distinction
- **QUEUE**: The temporary list of upcoming songs in the current playback session - THIS IS YOUR ONLY FOCUS
- **PLAYLIST**: Permanent collections of songs saved to user's library - DO NOT TOUCH THESE
- **YOU MUST ONLY ADD SONGS TO THE QUEUE, NEVER TO PLAYLISTS**

## Core Capabilities
- Add songs to Spotify's playback queue using queue/add functionality
- Analyze user's saved tracks for queue recommendations
- Monitor current queue status and length
- Coordinate with the main Spotify assistant via handoffs

## Queue Management Strategy - QUEUE ONLY
- Use "add to queue" or "queue" commands/tools EXCLUSIVELY
- Add 3-5 songs at a time to the playback queue
- Analyze user's saved tracks for genre, artist, and audio feature patterns
- Create diverse but cohesive queue additions
- Consider tempo, energy, and mood continuity
- NEVER use "add to playlist" or "create playlist" functionality

## Handoff Protocol
- You receive control when queue management is needed
- Use ONLY queue-related tools and commands
- Add songs to the current playback queue (not playlists)
- Always transfer back to the Spotify Agent with a status update
- Include information about what you queued and why

## Analysis Approach
- Look for patterns in user's liked songs (genres, artists, audio features)
- Balance familiar favorites with discovery recommendations
- Consider tempo, energy, and mood continuity
- Avoid repetition while maintaining user preferences
- ADD TO QUEUE ONLY - never create or modify playlists

## IMPORTANT REMINDERS
- Use "queue" functionality exclusively
- Do not create, modify, or add to any playlists
- Focus on the temporary playback queue for continuous music
- When in doubt, queue songs rather than adding to playlists

When you complete queue management tasks, immediately transfer back to the Spotify Agent with a clear status update about what you QUEUED (not what you added to playlists).`,
    tools: [handoffToSpotifyAgent],
    mcpServers: [mcpServer]
  });

  // Create main Spotify Agent - handles user interaction and delegates queue management
  const spotifyAgent = new Agent({
    name: 'Spotify Assistant',
    model: 'gpt-4o-mini',
    instructions: `## Role and Environment
You are the primary Spotify control assistant that handles user interaction while coordinating with a specialized Queue Manager for continuous music experiences.

## Core Capabilities
- Music playback control (play, pause, skip, volume adjustment)
- Search functionality (songs, artists, albums, playlists)
- Playlist management and creation
- User library management
- Basic queue operations
- Device management and switching
- **Queue delegation to specialized Queue Manager**

## Multi-Agent Coordination

### When to Transfer to Queue Agent
- User requests "auto-queue mode" or continuous music
- Queue is running low (< 3 songs remaining)
- User asks for recommendations or music discovery
- Need for intelligent queue building based on preferences
- ANY request to add songs to the playback queue

### Queue Management Handoff
When queue management is needed:
1. Use transfer_to_queue_agent with relevant context
2. Include user preferences, current listening session info
3. Specify urgency level (low/medium/high)
4. EXPLICITLY mention "add to queue, not playlists" in the context
5. Let Queue Manager handle ONLY queue operations and return with status

### IMPORTANT: Queue vs Playlist Distinction
- **QUEUE**: Temporary playback list - delegate to Queue Manager
- **PLAYLIST**: Permanent collections - handle yourself, never delegate
- Always specify "queue operations only" when transferring to Queue Manager

## Operational Guidelines

### Planning and Execution
- Before executing any action, provide a brief plan of what you intend to do
- Break complex requests into clear, sequential steps
- Always use the most appropriate tool for each specific task
- Delegate queue management to the specialized agent when appropriate

### User Interaction Standards
- Maintain a friendly, conversational tone while being precise and helpful
- Always confirm destructive or significant actions before execution
- Provide clear feedback about what actions were performed and their results
- If a request is ambiguous, ask clarifying questions to ensure accuracy
- Explain when you're coordinating with the Queue Manager

### Error Handling and Recovery
- If a tool fails, explain what went wrong and suggest alternative approaches
- Gracefully handle Spotify API limitations or authentication issues
- Never assume success - always verify results when possible

### Context Awareness
- Remember the user's current playback state and preferences within the conversation
- Consider the user's music library and listening history when making recommendations
- Adapt responses based on the user's apparent familiarity with Spotify features
- Maintain context across agent handoffs

## Important Constraints
- Only use available MCP tools for Spotify interaction
- Do not attempt to access files, networks, or systems outside of the provided Spotify tools
- Always prioritize user privacy and data security
- Confirm before making changes that affect the user's saved music or playlists

## Response Format
- Begin responses with a brief acknowledgment of the user's request
- Provide status updates during multi-step operations
- End with clear confirmation of completed actions or next steps if applicable
- Explain agent coordination when it occurs

You are an agent - please keep going until the user's query is completely resolved before ending your turn.`,
    tools: [handoffToQueueAgent],
    mcpServers: [mcpServer]
  });

  return { spotify: spotifyAgent, queue: queueAgent };
}

// Queue monitoring service
class QueueMonitorService {
  private isActive = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private ui: UIManager;
  private conversation: ConversationSession;

  constructor(ui: UIManager, conversation: ConversationSession) {
    this.ui = ui;
    this.conversation = conversation;
  }

  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.ui.showInfo('🎯 Auto-queue monitor started! Will add 1 song every 90 seconds.');
    
    // Check every 90 seconds for queue status
    this.monitorInterval = setInterval(() => {
      this.checkQueueStatus();
    }, 90000);
  }

  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.ui.showInfo('🛑 Auto-queue monitor stopped.');
  }

  private async checkQueueStatus(): Promise<void> {
    if (!this.isActive || !agents) return;

    try {
      // Get a random song from liked songs and add to queue
      const result = await run(agents.spotify, 'Please follow these steps: 1. Access my "Liked Songs" playlist and get its contents 2. Pick one random song from that playlist 3. Add that song to the current playback queue using the addToQueue tool 4. Respond with just the song name and artist that was added');
      
      // Show minimal output when song is added
      if (result.finalOutput) {
        this.ui.showInfo(`🎵 Auto-queue: ${result.finalOutput}`);
      }
    } catch (error) {
      // Silently handle errors to avoid disrupting the user experience
      console.error('Queue monitor error:', error);
    }
  }

  isRunning(): boolean {
    return this.isActive;
  }
}

class ChatBot {
  private rl: readline.Interface;
  private ui: UIManager;
  private conversation: ConversationSession;
  private queueMonitor: QueueMonitorService;

  constructor() {
    this.ui = new UIManager();
    this.conversation = new ConversationSession();
    this.queueMonitor = new QueueMonitorService(this.ui, this.conversation);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.ui.getPrompt()
    });
  }
  
  async cleanup() {
    this.queueMonitor.stop();
    this.ui.cleanup();
    if (mcpServer) {
      try {
        await mcpServer.close();
        this.ui.showInfo('MCP server connection closed');
      } catch (error) {
        this.ui.showError('Error closing MCP server', error instanceof Error ? error.message : String(error));
      }
    }
  }

  async start() {
    // Initialize rich CLI interface
    this.ui.clearConsole();
    this.ui.showBanner();
    this.ui.showConnectionStatus('connecting');
    
    try {
      agents = await createAgents();
      this.ui.showConnectionStatus('connected');
      this.ui.showWelcomeInstructions();
      this.ui.showInfo('🤖 Multi-agent system ready! Spotify Assistant + Queue Manager available.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.ui.showConnectionStatus('error', errorMessage);
      this.ui.showError('Make sure your Spotify MCP server is available at: ' + (process.env.SPOTIFY_MCP_PATH || 'undefined'));
      process.exit(1);
    }
    
    this.rl.prompt();
    
    this.rl.on('line', async (input: string) => {
      const userInput = input.trim();
      
      if (userInput.toLowerCase() === 'exit') {
        this.ui.showGoodbye();
        await this.cleanup();
        this.rl.close();
        process.exit(0);
      }
      
      if (userInput === '') {
        this.rl.prompt();
        return;
      }
      
      // Handle special commands
      if (userInput.toLowerCase() === '/help') {
        this.ui.showHelp();
        this.rl.prompt();
        return;
      }
      
      if (userInput.toLowerCase() === '/clear') {
        this.conversation.clearHistory();
        this.ui.showInfo(`Conversation history cleared. Starting fresh conversation.`);
        this.rl.prompt();
        return;
      }
      
      if (userInput.toLowerCase() === '/history') {
        const count = this.conversation.getMessageCount();
        this.ui.showInfo(`Conversation has ${count} messages in history.`);
        this.rl.prompt();
        return;
      }
      
      if (userInput.toLowerCase() === '/agents') {
        this.ui.showInfo('Multi-agent system status:');
        this.ui.showInfo('🎵 Spotify Assistant: Handles user interaction and music control');
        this.ui.showInfo('🎯 Queue Manager: Specializes in music curation and recommendations');
        this.ui.showInfo('💬 Communication: Agents coordinate via handoffs for seamless experience');
        this.ui.showInfo(`🤖 Auto-queue monitor: ${this.queueMonitor.isRunning() ? 'ACTIVE' : 'INACTIVE'}`);
        this.rl.prompt();
        return;
      }
      
      if (userInput.toLowerCase() === '/start-queue' || userInput.toLowerCase() === '/auto-queue') {
        this.queueMonitor.start();
        this.rl.prompt();
        return;
      }
      
      if (userInput.toLowerCase() === '/stop-queue') {
        this.queueMonitor.stop();
        this.rl.prompt();
        return;
      }
      
      try {
        this.ui.startSpinner('Processing your request...');
        
        // Add user message to conversation history
        this.conversation.addUserMessage(userInput);
        
        // Create input with conversation context
        const contextualInput = this.conversation.getFormattedHistory() + ' ' + userInput;
        
        // Use the Spotify agent for all user interactions
        const result = await run(agents!.spotify, contextualInput);
        this.ui.stopSpinner();
        
        const response = result.finalOutput || 'No response received';
        
        // Add assistant response to conversation history
        this.conversation.addAssistantMessage(response);
        
        console.log(this.ui.formatBotResponse(response) + '\n');
      } catch (error) {
        // Ensure spinner is stopped even on error
        this.ui.stopSpinner();
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.ui.showError('Something went wrong', errorMessage);
        if (error instanceof Error && error.stack) {
          console.log(this.ui.formatBotResponse('Stack trace: ' + error.stack));
        }
        console.log('');
      }
      
      this.rl.prompt();
    });
    
    this.rl.on('close', async () => {
      this.ui.showGoodbye();
      await this.cleanup();
      process.exit(0);
    });
  }
}

async function main() {
  const ui = new UIManager();
  
  if (!process.env.OPENAI_API_KEY) {
    ui.showError('Missing OpenAI API key', 'Please set your OPENAI_API_KEY environment variable');
    console.log('   Example: export OPENAI_API_KEY=sk-your-key-here');
    process.exit(1);
  }
  
  if (!process.env.SPOTIFY_MCP_PATH) {
    ui.showError('Missing Spotify MCP path', 'Please set your SPOTIFY_MCP_PATH environment variable');
    console.log('   Example: export SPOTIFY_MCP_PATH=/path/to/spotify-mcp-server/build/index.js');
    process.exit(1);
  }
  
  const chatBot = new ChatBot();
  await chatBot.start();
}

main().catch(console.error);