import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

dotenv.config();

const basicTool = tool({
  name: 'get_current_time',
  description: 'Get the current time',
  parameters: z.object({}),
  execute: async () => {
    return `Current time: ${new Date().toLocaleString()}`;
  }
});

const agent = new Agent({
  name: 'Spotify Agent',
  instructions: `You are a helpful assistant that will eventually help control Spotify. 
  For now, you can help with general questions and provide the current time when asked.
  Be friendly and conversational.`,
  tools: [basicTool]
});

class ChatBot {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'You: '
    });
  }

  async start() {
    console.log('🤖 Spotify Agent Chatbot started!');
    console.log('Type "exit" to quit the chat.\n');
    
    this.rl.prompt();
    
    this.rl.on('line', async (input: string) => {
      const userInput = input.trim();
      
      if (userInput.toLowerCase() === 'exit') {
        console.log('👋 Goodbye!');
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
        console.log('');
      }
      
      this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      console.log('👋 Goodbye!');
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
  
  const chatBot = new ChatBot();
  await chatBot.start();
}

main().catch(console.error);