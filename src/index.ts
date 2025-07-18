import { run } from '@openai/agents';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { UIManager } from './ui';
import { debug } from './debug';
import { AgentConfig } from './types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from './constants';
import { ConversationSession } from './conversation';
import { QueueMonitorService } from './queueMonitor';
import { createAgents, cleanupMCPServer } from './agents';
import { CommandRouter, SystemContext } from './tools';

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
  private commandRouter: CommandRouter;

  constructor() {
    this.ui = new UIManager();
    this.conversation = new ConversationSession();
    this.queueMonitor = new QueueMonitorService(this.ui, this.conversation);
    
    // Initialize command router with system context
    const systemContext: SystemContext = {
      ui: this.ui,
      conversation: this.conversation,
      queueMonitor: this.queueMonitor,
      agents: null // Will be updated when agents are initialized
    };
    this.commandRouter = new CommandRouter(systemContext);
    
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
        this.ui.showInfo('🎵 Playback Agent: Handles music playback actions and queue management');
        this.ui.showInfo('🔍 Lookup Agent: Specializes in music information retrieval and search');
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
      
      // Update command router context with initialized agents
      const updatedContext: SystemContext = {
        ui: this.ui,
        conversation: this.conversation,
        queueMonitor: this.queueMonitor,
        agents: agents
      };
      this.commandRouter.updateContext(updatedContext);
      
      this.ui.showConnectionStatus('connected');
      this.ui.showWelcomeInstructions();
      this.ui.showInfo('🤖 Multi-agent system ready! Playback Agent + Lookup Agent + Command Router available.');
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
    
    try {
      // Use command router for intelligent parsing
      debug.log(`📥 [INPUT] Processing: "${userInput}"`);
      const routerResult = await this.commandRouter.routeCommand(userInput);
      
      switch (routerResult.type) {
        case 'system_success':
          // System command executed successfully
          debug.log(`✅ [INPUT] System command completed: ${routerResult.content}`);
          this.rl.prompt();
          return;
          
        case 'error':
          // System command failed
          this.ui.showError('Command failed', routerResult.content);
          this.rl.prompt();
          return;
          
        case 'clarification':
          // Agent needs clarification
          this.ui.showInfo(`🤖 ${routerResult.content}`);
          this.rl.prompt();
          return;
          
        case 'playback':
          // Route to Playback agent
          await this.handlePlaybackInteraction(routerResult.content);
          this.rl.prompt();
          return;
          
        case 'lookup':
          // Route to Lookup agent
          await this.handleLookupInteraction(routerResult.content);
          this.rl.prompt();
          return;
          
        default:
          // Default to Lookup interaction
          await this.handleLookupInteraction(userInput);
          this.rl.prompt();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug.log(`❌ [INPUT] Error processing input: ${errorMessage}`);
      
      // Fallback to Lookup interaction on any error
      await this.handleLookupInteraction(userInput);
      this.rl.prompt();
    }
  }


  /**
   * Handle Playback interaction with the Playback agent
   * @param userInput - The user input to process (playback actions)
   * @private
   */
  private async handlePlaybackInteraction(userInput: string): Promise<void> {
    if (!agents) {
      this.ui.showError('Agents not initialized', 'Please wait for the system to connect');
      return;
    }

    try {
      this.ui.startSpinner('Executing playback action...');
      
      // Add user message to conversation history
      this.conversation.addUserMessage(userInput);
      
      // Create input with conversation context
      const contextualInput = this.conversation.getFormattedHistory() + ' ' + userInput;
      
      // Use the Playback agent for action requests
      const result = await run(agents.playback, contextualInput);
      this.ui.stopSpinner();
      
      const response = result.finalOutput || 'No response received';
      
      // Add assistant response to conversation history
      this.conversation.addAssistantMessage(response);
      
      console.log(this.ui.formatBotResponse(response) + '\n');
    } catch (error) {
      this.ui.stopSpinner();
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.ui.showError('Playback action failed', errorMessage);
      if (error instanceof Error && error.stack) {
        console.log(this.ui.formatBotResponse('Stack trace: ' + error.stack));
      }
      console.log('');
    }
  }

  /**
   * Handle Lookup interaction with the Lookup agent
   * @param userInput - The user input to process (information requests)
   * @private
   */
  private async handleLookupInteraction(userInput: string): Promise<void> {
    if (!agents) {
      this.ui.showError('Agents not initialized', 'Please wait for the system to connect');
      return;
    }

    try {
      this.ui.startSpinner('Looking up information...');
      
      // Add user message to conversation history
      this.conversation.addUserMessage(userInput);
      
      // Create input with conversation context
      const contextualInput = this.conversation.getFormattedHistory() + ' ' + userInput;
      
      // Use the Lookup agent for information requests
      const result = await run(agents.lookup, contextualInput);
      this.ui.stopSpinner();
      
      const response = result.finalOutput || 'No response received';
      
      // Add assistant response to conversation history
      this.conversation.addAssistantMessage(response);
      
      console.log(this.ui.formatBotResponse(response) + '\n');
    } catch (error) {
      this.ui.stopSpinner();
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.ui.showError('Information lookup failed', errorMessage);
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