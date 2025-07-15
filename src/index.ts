import { run } from '@openai/agents';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { UIManager } from './ui';
import { NaturalLanguageCommandParser } from './commandParser';
import { debug } from './debug';
import { AgentConfig } from './types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from './constants';
import { ConversationSession } from './conversation';
import { QueueMonitorService } from './queueMonitor';
import { createAgents, cleanupMCPServer } from './agents';

dotenv.config();


let agents: AgentConfig | null = null;


/**
 * Main ChatBot class that orchestrates the Spotify agent interface
 * 
 * This class handles user interaction, command parsing, and coordination
 * between the conversation session, queue monitor, and agent system.
 */
class ChatBot {
  private rl: readline.Interface;
  private ui: UIManager;
  private conversation: ConversationSession;
  private queueMonitor: QueueMonitorService;
  private commandParser: NaturalLanguageCommandParser;

  constructor() {
    this.ui = new UIManager();
    this.conversation = new ConversationSession();
    this.queueMonitor = new QueueMonitorService(this.ui, this.conversation);
    this.commandParser = new NaturalLanguageCommandParser();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.ui.getPrompt()
    });
  }
  
  /**
   * Execute a system command (slash command)
   * @param command - The command to execute
   * @returns True if command was handled, false otherwise
   */
  async executeSystemCommand(command: string): Promise<boolean> {
    const cmd = command.toLowerCase();
    
    switch (cmd) {
      case '/help':
        this.ui.showHelp();
        return true;
        
      case '/clear':
        this.conversation.clearHistory();
        this.ui.showInfo('Conversation history cleared. Starting fresh conversation.');
        return true;
        
      case '/history':
        const count = this.conversation.getMessageCount();
        this.ui.showInfo(`Conversation has ${count} messages in history.`);
        return true;
        
      case '/agents':
        this.ui.showInfo('Multi-agent system status:');
        this.ui.showInfo('🎵 Spotify Assistant: Handles user interaction and music control');
        this.ui.showInfo('🎯 Queue Manager: Specializes in music curation and recommendations');
        this.ui.showInfo('💬 Communication: Agents coordinate via handoffs for seamless experience');
        this.ui.showInfo(`🤖 Auto-queue monitor: ${this.queueMonitor.isRunning() ? 'ACTIVE' : 'INACTIVE'}`);
        return true;
        
      case '/start-queue':
      case '/auto-queue':
        if (!agents) {
          this.ui.showError('Agents not initialized', 'Please wait for the system to connect');
          return true;
        }
        this.queueMonitor.start(agents);
        return true;
        
      case '/stop-queue':
        this.queueMonitor.stop();
        return true;
        
      case '/history-songs':
        this.queueMonitor.showSongHistory();
        return true;
        
      case '/clear-history-songs':
        this.queueMonitor.clearSongHistory();
        return true;
        
      case '/pool-stats':
        if (!agents) {
          this.ui.showError('Agents not initialized', 'Please wait for the system to connect');
          return true;
        }
        this.queueMonitor.showPoolStats(agents);
        return true;
        
      case '/refresh-pool':
        if (!agents) {
          this.ui.showError('Agents not initialized', 'Please wait for the system to connect');
          return true;
        }
        await this.queueMonitor.refreshSongPool(agents);
        return true;
        
      default:
        return false;
    }
  }

  /**
   * Clean up resources when shutting down
   */
  async cleanup(): Promise<void> {
    this.queueMonitor.stop();
    this.ui.cleanup();
    
    try {
      await cleanupMCPServer();
      this.ui.showInfo('MCP server connection closed');
    } catch (error) {
      this.ui.showError('Error closing MCP server', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Start the ChatBot interface and initialize the agent system
   */
  async start(): Promise<void> {
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
    
    this.setupInputHandlers();
    this.rl.prompt();
  }

  /**
   * Set up readline input handlers for user interaction
   * @private
   */
  private setupInputHandlers(): void {
    this.rl.on('line', async (input: string) => {
      await this.handleUserInput(input.trim());
    });
    
    this.rl.on('close', async () => {
      this.ui.showGoodbye();
      await this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Handle user input and route to appropriate handlers
   * @param userInput - The trimmed user input
   * @private
   */
  private async handleUserInput(userInput: string): Promise<void> {
    // Handle exit command
    if (userInput.toLowerCase() === 'exit') {
      this.ui.showGoodbye();
      await this.cleanup();
      this.rl.close();
      process.exit(0);
    }
    
    // Handle empty input
    if (userInput === '') {
      this.rl.prompt();
      return;
    }
    
    // Handle system commands (both slash commands and natural language)
    const commandToExecute = this.parseCommand(userInput);
    
    // Execute system command if it's a slash command
    if (commandToExecute.startsWith('/')) {
      const wasHandled = await this.executeSystemCommand(commandToExecute);
      if (wasHandled) {
        this.rl.prompt();
        return;
      }
    }
    
    // Handle regular chat interaction
    await this.handleChatInteraction(userInput);
    this.rl.prompt();
  }

  /**
   * Parse user input to detect system commands
   * @param userInput - The user input to parse
   * @returns The command to execute (may be modified from original input)
   * @private
   */
  private parseCommand(userInput: string): string {
    // Check if it's already a slash command
    if (userInput.startsWith('/')) {
      return userInput;
    }
    
    // Check if it's a natural language command
    const detectedCommand = this.commandParser.parseCommand(userInput);
    if (detectedCommand) {
      this.ui.showInfo(`🤖 Detected command: ${detectedCommand}`);
      return detectedCommand;
    }
    
    return userInput;
  }

  /**
   * Handle regular chat interaction with the Spotify agent
   * @param userInput - The user input to process
   * @private
   */
  private async handleChatInteraction(userInput: string): Promise<void> {
    if (!agents) {
      this.ui.showError('Agents not initialized', 'Please wait for the system to connect');
      return;
    }

    try {
      this.ui.startSpinner('Processing your request...');
      
      // Add user message to conversation history
      this.conversation.addUserMessage(userInput);
      
      // Create input with conversation context
      const contextualInput = this.conversation.getFormattedHistory() + ' ' + userInput;
      
      // Use the Spotify agent for all user interactions
      const result = await run(agents.spotify, contextualInput);
      this.ui.stopSpinner();
      
      const response = result.finalOutput || 'No response received';
      
      // Add assistant response to conversation history
      this.conversation.addAssistantMessage(response);
      
      console.log(this.ui.formatBotResponse(response) + '\n');
    } catch (error) {
      this.ui.stopSpinner();
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.ui.showError('Something went wrong', errorMessage);
      if (error instanceof Error && error.stack) {
        console.log(this.ui.formatBotResponse('Stack trace: ' + error.stack));
      }
      console.log('');
    }
  }
}

/**
 * Main entry point for the Spotify Agent CLI
 * 
 * Performs environment validation and starts the ChatBot interface
 */
async function main(): Promise<void> {
  const ui = new UIManager();
  
  // Show debug status if enabled
  if (debug.isDebugEnabled()) {
    ui.showInfo(SUCCESS_MESSAGES.DEBUG_ENABLED);
  }
  
  // Validate required environment variables
  if (!process.env.OPENAI_API_KEY) {
    ui.showError('Missing OpenAI API key', ERROR_MESSAGES.MISSING_OPENAI_KEY);
    console.log('   Example: export OPENAI_API_KEY=sk-your-key-here');
    process.exit(1);
  }
  
  if (!process.env.SPOTIFY_MCP_PATH) {
    ui.showError('Missing Spotify MCP path', ERROR_MESSAGES.MISSING_SPOTIFY_PATH);
    console.log('   Example: export SPOTIFY_MCP_PATH=/path/to/spotify-mcp-server/build/index.js');
    process.exit(1);
  }
  
  const chatBot = new ChatBot();
  await chatBot.start();
}

// Start the application
main().catch(console.error);