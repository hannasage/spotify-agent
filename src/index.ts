import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { UIManager } from './ui';
import { debug } from './debug';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from './constants';
import { ConversationSession } from './conversation';
import { QueueMonitorService } from './queueMonitor';
import { createSpotifyOrchestrator, cleanupMCPServer } from './agents';
import { CommandRouter, SystemContext } from './tools';
import { SpotifyOrchestratorConfig } from './types';

dotenv.config();


let orchestratorConfig: SpotifyOrchestratorConfig | null = null;


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
      agents: null // Legacy support for queue monitor
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
        this.ui.showInfo('Hierarchical multi-agent system status:');
        this.ui.showInfo('🎵 Spotify Orchestrator: Coordinates specialized agents for optimal performance');
        this.ui.showInfo('🎮 Playback Agent: Handles real-time playback control and device management');
        this.ui.showInfo('🔍 Search Agent: Specializes in content discovery and music search');
        this.ui.showInfo('📚 Library Agent: Manages playlists, saved music, and personal collections');
        this.ui.showInfo('🎯 Queue Agent: Intelligent queue building and music curation');
        this.ui.showInfo('💬 Communication: Orchestrator analyzes requests and routes to appropriate agents');
        this.ui.showInfo(`🤖 Auto-queue monitor: ${this.queueMonitor.isRunning() ? 'ACTIVE' : 'INACTIVE'}`);
        return true;
        
      case '/start-queue':
      case '/auto-queue':
        if (!orchestratorConfig) {
          this.ui.showError('Orchestrator not initialized', 'Please wait for the system to connect');
          return true;
        }
        // Create legacy agent config for queue monitor compatibility
        const legacyAgents = {
          spotify: orchestratorConfig.agents.search, // Use search agent as fallback
          queue: orchestratorConfig.agents.queue
        };
        this.queueMonitor.start(legacyAgents);
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
        if (!orchestratorConfig) {
          this.ui.showError('Orchestrator not initialized', 'Please wait for the system to connect');
          return true;
        }
        // Create legacy agent config for queue monitor compatibility
        const legacyAgentsForStats = {
          spotify: orchestratorConfig.agents.search,
          queue: orchestratorConfig.agents.queue
        };
        this.queueMonitor.showPoolStats(legacyAgentsForStats);
        return true;
        
      case '/refresh-pool':
        if (!orchestratorConfig) {
          this.ui.showError('Orchestrator not initialized', 'Please wait for the system to connect');
          return true;
        }
        // Create legacy agent config for queue monitor compatibility
        const legacyAgentsForRefresh = {
          spotify: orchestratorConfig.agents.search,
          queue: orchestratorConfig.agents.queue
        };
        await this.queueMonitor.refreshSongPool(legacyAgentsForRefresh);
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
      // Initialize the new orchestrator system
      orchestratorConfig = await createSpotifyOrchestrator();
      
      // Update command router context (agents set to null as we use orchestrator now)
      const updatedContext: SystemContext = {
        ui: this.ui,
        conversation: this.conversation,
        queueMonitor: this.queueMonitor,
        agents: null
      };
      this.commandRouter.updateContext(updatedContext);
      
      this.ui.showConnectionStatus('connected');
      this.ui.showWelcomeInstructions();
      this.ui.showInfo('🤖 Hierarchical multi-agent system ready! Orchestrator + Specialized Agents + Command Router available.');
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
          
        case 'orchestrator':
          // Route to Spotify Orchestrator (new hierarchical system)
          await this.handleOrchestratorInteraction(routerResult.content);
          this.rl.prompt();
          return;
          
        case 'spotify':
          // Legacy support - route to orchestrator
          await this.handleOrchestratorInteraction(routerResult.content);
          this.rl.prompt();
          return;
          
        default:
          // Default to Orchestrator interaction
          await this.handleOrchestratorInteraction(userInput);
          this.rl.prompt();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug.log(`❌ [INPUT] Error processing input: ${errorMessage}`);
      
      // Fallback to Orchestrator interaction on any error
      await this.handleOrchestratorInteraction(userInput);
      this.rl.prompt();
    }
  }

  /**
   * Handle Spotify interaction with the new Orchestrator system
   * @param userInput - The user input to process (music-related requests)
   * @private
   */
  private async handleOrchestratorInteraction(userInput: string): Promise<void> {
    if (!orchestratorConfig) {
      this.ui.showError('Orchestrator not initialized', 'Please wait for the system to connect');
      return;
    }

    try {
      this.ui.startSpinner('Processing your request...');
      
      // Add user message to conversation history
      this.conversation.addUserMessage(userInput);
      
      // Get conversation context
      const conversationContext = this.conversation.getFormattedHistory();
      
      // Use the Spotify Orchestrator for intelligent agent coordination
      const result = await orchestratorConfig.orchestrator.processRequest(userInput, conversationContext);
      this.ui.stopSpinner();
      
      if (result.success) {
        // Add assistant response to conversation history
        this.conversation.addAssistantMessage(result.response);
        
        // Show which agents were used for transparency
        if (result.agentsUsed.length > 0) {
          debug.log(`🎵 [ORCHESTRATOR] Used agents: ${result.agentsUsed.join(', ')}`);
        }
        
        // Handle clarification requests
        if (result.requiresClarification) {
          debug.log(`🎵 [ORCHESTRATOR] Response requires clarification`);
          // Add clarification context to conversation history for next turn
          if (result.clarificationContext) {
            const contextInfo = `\nOriginal request: ${result.clarificationContext.originalRequest}\nPrimary agent: ${result.clarificationContext.primaryAgent}\nSecondary agents: ${result.clarificationContext.secondaryAgents?.join(', ') || 'none'}`;
            this.conversation.addAssistantMessage(contextInfo);
          }
        }
        
        console.log(this.ui.formatBotResponse(result.response) + '\n');
      } else {
        this.ui.showError('Request failed', result.response);
      }
      
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