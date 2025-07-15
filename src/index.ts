import { Agent, run, MCPServerStdio } from '@openai/agents';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

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
  
  // Debug: Check if server is properly connected
  console.log('🔍 MCP Server created, checking connection...');
  
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

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'You: '
    });
  }
  
  async cleanup() {
    if (mcpServer) {
      try {
        await mcpServer.close();
        console.log('🔌 MCP server connection closed');
      } catch (error) {
        console.error('❌ Error closing MCP server:', error);
      }
    }
  }

  async start() {
    console.log('🤖 Spotify Agent Chatbot started!');
    console.log('🎵 Connecting to Spotify MCP Server...');
    
    try {
      agent = await createAgent();
      console.log('✅ Connected to Spotify MCP Server');
      console.log('Type "exit" to quit the chat.\n');
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error instanceof Error ? error.message : String(error));
      console.log('💡 Make sure your Spotify MCP server is available at:', process.env.SPOTIFY_MCP_PATH);
      process.exit(1);
    }
    
    this.rl.prompt();
    
    this.rl.on('line', async (input: string) => {
      const userInput = input.trim();
      
      if (userInput.toLowerCase() === 'exit') {
        console.log('👋 Goodbye!');
        await this.cleanup();
        this.rl.close();
        process.exit(0);
      }
      
      if (userInput === '') {
        this.rl.prompt();
        return;
      }
      
      try {
        console.log('🤖 Thinking...');
        const result = await run(agent, userInput);
        console.log(`Bot: ${result.finalOutput}\n`);
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
          console.error('Stack trace:', error.stack);
        }
        console.log('');
      }
      
      this.rl.prompt();
    });
    
    this.rl.on('close', async () => {
      console.log('👋 Goodbye!');
      await this.cleanup();
      process.exit(0);
    });
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Please set your OPENAI_API_KEY environment variable');
    console.log('   Example: export OPENAI_API_KEY=sk-your-key-here');
    process.exit(1);
  }
  
  if (!process.env.SPOTIFY_MCP_PATH) {
    console.error('❌ Please set your SPOTIFY_MCP_PATH environment variable');
    console.log('   Example: export SPOTIFY_MCP_PATH=/path/to/spotify-mcp-server/build/index.js');
    process.exit(1);
  }
  
  const chatBot = new ChatBot();
  await chatBot.start();
}

main().catch(console.error);