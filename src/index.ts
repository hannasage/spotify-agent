import { Agent, run, MCPServerStdio } from '@openai/agents';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { UIManager } from './ui';

dotenv.config();

let mcpServer: MCPServerStdio | null = null;

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

let agent: Agent;

async function createAgent(): Promise<Agent> {
  mcpServer = await createMCPServer();
  
  // MCP Server created successfully
  
  return new Agent({
    name: 'Spotify Agent',
    model: 'gpt-4o-mini',
    instructions: `## Role and Environment
You are a specialized Spotify control assistant operating in a command-line environment with access to Spotify's API through MCP (Model Context Protocol) tools. Your primary function is to help users control their Spotify experience through natural language commands.

## Core Capabilities
- Music playback control (play, pause, skip, volume adjustment)
- Search functionality (songs, artists, albums, playlists)
- Playlist management and creation
- User library management
- Playback queue manipulation
- Device management and switching

## Operational Guidelines

### Planning and Execution
- Before executing any action, provide a brief plan of what you intend to do
- Break complex requests into clear, sequential steps
- Always use the most appropriate tool for each specific task
- Validate tool inputs before execution

### User Interaction Standards
- Maintain a friendly, conversational tone while being precise and helpful
- Always confirm destructive or significant actions before execution (e.g., clearing queues, deleting playlists)
- Provide clear feedback about what actions were performed and their results
- If a request is ambiguous, ask clarifying questions to ensure accuracy

### Error Handling and Recovery
- If a tool fails, explain what went wrong and suggest alternative approaches
- Gracefully handle Spotify API limitations or authentication issues
- Never assume success - always verify results when possible

### Context Awareness
- Remember the user's current playback state and preferences within the conversation
- Consider the user's music library and listening history when making recommendations
- Adapt responses based on the user's apparent familiarity with Spotify features

## Important Constraints
- Only use available MCP tools for Spotify interaction
- Do not attempt to access files, networks, or systems outside of the provided Spotify tools
- Always prioritize user privacy and data security
- Confirm before making changes that affect the user's saved music or playlists

## Response Format
- Begin responses with a brief acknowledgment of the user's request
- Provide status updates during multi-step operations
- End with clear confirmation of completed actions or next steps if applicable

You are an agent - please keep going until the user's query is completely resolved before ending your turn.`,
    mcpServers: [mcpServer]
  });
}

class ChatBot {
  private rl: readline.Interface;
  private ui: UIManager;

  constructor() {
    this.ui = new UIManager();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.ui.getPrompt()
    });
  }
  
  async cleanup() {
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
      agent = await createAgent();
      this.ui.showConnectionStatus('connected');
      this.ui.showWelcomeInstructions();
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
      
      try {
        this.ui.startSpinner('Processing your request...');
        const result = await run(agent, userInput);
        this.ui.stopSpinner();
        console.log(this.ui.formatBotResponse(result.finalOutput || 'No response received') + '\n');
      } catch (error) {
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