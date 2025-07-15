import { Agent, run, MCPServerStdio } from '@openai/agents';
import { z } from 'zod';
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
    instructions: `You are a helpful assistant that can control Spotify through various tools.
    You can help users play music, control playback, search for songs, and manage their Spotify experience.
    Be friendly and conversational. Always confirm actions before executing them.`,
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