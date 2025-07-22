// run function used via runWithToolCallTracing import
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { UIManager } from './ui';
import { debug } from './debug';
import { AgentConfig } from './types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from './constants';
import { ConversationSession } from './conversation';
import { QueueMonitorService } from './queueMonitor';
import { createAgents, cleanupMCPServer } from './agents';
import { SystemContext } from './tools';
import { createTraceIntegration } from './lib/traceIntegration';
import { runWithToolCallTracing } from './lib/toolCallTracer';
import { run } from '@openai/agents';

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
  private traceIntegration: ReturnType<typeof createTraceIntegration>;

  constructor() {
    this.ui = new UIManager();
    this.conversation = new ConversationSession();
    this.queueMonitor = new QueueMonitorService(this.ui, this.conversation);
    
    // Initialize trace integration (conditionally based on --no-trace flag)
    const traceDir = process.env.TRACE_DIRECTORY || './data/traces';
    this.traceIntegration = createTraceIntegration(traceDir, debug.isTracingEnabled());
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.ui.getPrompt()
    });
  }

  /**
   * Generate a unique trace ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Trace an event
   */
  private async traceEvent(type: string, data: any): Promise<void> {
    try {
      await this.traceIntegration.processTraceEvent({
        id: this.generateTraceId(),
        type,
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      // Don't let trace errors affect the main application
      console.error('Trace error:', error);
    }
  }
  
  /**
   * Execute a system command (slash command)
   * @param command - The command to execute
   * @returns True if command was handled, false otherwise
   */
  async executeSystemCommand(command: string): Promise<boolean> {
    const cmd = command.toLowerCase();
    
    // Trace system command execution
    await this.traceEvent('system_command', {
      command: cmd,
      originalCommand: command
    });
    
    switch (cmd) {
      case '/help':
        this.ui.showHelp();
        return true;
        
      case '/clear':
        this.conversation.clearHistory();
        this.ui.showInfo('Conversation history cleared. Starting fresh conversation.');
        await this.traceEvent('conversation_cleared', {
          messageCount: this.conversation.getMessageCount()
        });
        return true;
        
      case '/history':
        const count = this.conversation.getMessageCount();
        this.ui.showInfo(`Conversation has ${count} messages in history.`);
        await this.traceEvent('history_requested', { messageCount: count });
        return true;
        
      case '/agents':
        this.ui.showInfo('Spotify Agent system status:');
        this.ui.showInfo('🎵 Spotify Agent: Handles all music operations - playback, information, and system commands');
        this.ui.showInfo('💬 Single Point of Contact: No routing overhead, direct intelligent responses');
        this.ui.showInfo(`🤖 Auto-queue monitor: ${this.queueMonitor.isRunning() ? 'ACTIVE' : 'INACTIVE'}`);
        await this.traceEvent('agents_status_requested', {
          queueMonitorRunning: this.queueMonitor.isRunning()
        });
        return true;
        
      case '/start-queue':
      case '/auto-queue':
        if (!agents) {
          this.ui.showError('Agents not initialized', 'Please wait for the system to connect');
          await this.traceEvent('queue_start_failed', { reason: 'agents_not_initialized' });
          return true;
        }
        this.queueMonitor.start(agents);
        await this.traceEvent('queue_started', { success: true });
        return true;
        
      case '/stop-queue':
        this.queueMonitor.stop();
        await this.traceEvent('queue_stopped', { success: true });
        return true;
        
      case '/history-songs':
        this.queueMonitor.showSongHistory();
        await this.traceEvent('song_history_requested', { success: true });
        return true;
        
      case '/clear-history-songs':
        this.queueMonitor.clearSongHistory();
        await this.traceEvent('song_history_cleared', { success: true });
        return true;
        
      case '/pool-stats':
        if (!agents) {
          this.ui.showError('Agents not initialized', 'Please wait for the system to connect');
          await this.traceEvent('pool_stats_failed', { reason: 'agents_not_initialized' });
          return true;
        }
        this.queueMonitor.showPoolStats(agents);
        await this.traceEvent('pool_stats_requested', { success: true });
        return true;
        
      case '/refresh-pool':
        if (!agents) {
          this.ui.showError('Agents not initialized', 'Please wait for the system to connect');
          await this.traceEvent('pool_refresh_failed', { reason: 'agents_not_initialized' });
          return true;
        }
        await this.queueMonitor.refreshSongPool(agents);
        await this.traceEvent('pool_refreshed', { success: true });
        return true;
        
      case '/traces':
        const stats = this.traceIntegration.getStats();
        const currentSession = this.traceIntegration.getCurrentSession();
        this.ui.showInfo('Trace Statistics:');
        this.ui.showInfo(`Total trace files: ${stats.totalFiles}`);
        this.ui.showInfo(`Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
        this.ui.showInfo(`Current session: ${currentSession.sessionId}`);
        this.ui.showInfo(`Current file: ${currentSession.traceFile}`);
        this.ui.showInfo(`Current traces: ${currentSession.stats.traceCount}`);
        this.ui.showInfo(`Current file size: ${(currentSession.stats.fileSize / 1024).toFixed(2)} KB`);
        if (stats.oldestFile) this.ui.showInfo(`Oldest file: ${stats.oldestFile}`);
        if (stats.newestFile) this.ui.showInfo(`Newest file: ${stats.newestFile}`);
        await this.traceEvent('trace_stats_requested', { ...stats, currentSession });
        return true;
        
      case '/cleanup-traces':
        await this.traceIntegration.cleanupOldTraces(7);
        this.ui.showInfo('Cleaned up traces older than 7 days');
        await this.traceEvent('traces_cleaned_up', { maxAgeDays: 7 });
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
    
    // Trace cleanup event
    await this.traceEvent('application_cleanup', {
      messageCount: this.conversation.getMessageCount(),
      queueMonitorRunning: this.queueMonitor.isRunning()
    });
    
    // Flush traces to ensure they're saved
    await this.traceIntegration.flush();
    
    try {
      await cleanupMCPServer();
      this.ui.showInfo('MCP server connection closed');
    } catch (error) {
      this.ui.showError('Error closing MCP server', error instanceof Error ? error.message : String(error));
      await this.traceEvent('cleanup_error', {
        error: error instanceof Error ? error.message : String(error),
        context: 'mcp_server_cleanup'
      });
    }
  }

  /**
   * Start the ChatBot interface and initialize the agent system
   */
  async start(): Promise<void> {
    // Initialize trace integration
    await this.traceIntegration.initialize();
    
    // Initialize rich CLI interface
    this.ui.clearConsole();
    this.ui.showBanner();
    this.ui.showConnectionStatus('connecting');
    
    // Trace application start
    await this.traceEvent('application_started', {
      timestamp: new Date().toISOString()
    });
    
    try {
      // Create system context for agent initialization
      const systemContext: SystemContext = {
        ui: this.ui,
        conversation: this.conversation,
        queueMonitor: this.queueMonitor,
        agents: null // Will be set after agent creation
      };
      
      // Only pass trace callbacks if tracing is enabled
      agents = debug.isTracingEnabled() 
        ? await createAgents(
            async (trace) => await this.traceIntegration.processTraceEvent(trace),
            () => this.traceIntegration.getCurrentSession().sessionId,
            systemContext
          )
        : await createAgents(undefined, undefined, systemContext);
      
      // Update system context with the created agent
      systemContext.agents = agents;
      
      this.ui.showConnectionStatus('connected');
      this.ui.showWelcomeInstructions();
      this.ui.showInfo('🤖 Spotify Agent ready! All music operations handled by single intelligent agent.');
      
      // Trace successful initialization
      await this.traceEvent('agents_initialized', {
        success: true,
        agentCount: agents ? Object.keys(agents).length : 0
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.ui.showConnectionStatus('error', errorMessage);
      this.ui.showError('Make sure your Spotify MCP server is available at: ' + (process.env.SPOTIFY_MCP_PATH || 'undefined'));
      
      // Trace initialization error
      await this.traceEvent('agents_initialization_failed', {
        error: errorMessage,
        spotifyMcpPath: process.env.SPOTIFY_MCP_PATH || 'undefined'
      });
      
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
      await this.traceEvent('user_exit', { input: userInput });
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
    
    // Trace user input
    await this.traceEvent('user_input', {
      input: userInput,
      inputLength: userInput.length
    });
    
    try {
      // Use unified agent for all requests
      debug.log(`📥 [INPUT] Processing with unified agent: "${userInput}"`);
      
      // Trace unified agent interaction start
      await this.traceEvent('unified_agent_interaction_start', {
        input: userInput,
        messageCount: this.conversation.getMessageCount()
      });
      
      await this.handleSpotifyAgentInteraction(userInput);
      this.rl.prompt();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug.log(`❌ [INPUT] Error processing input: ${errorMessage}`);
      
      // Trace error
      await this.traceEvent('input_processing_error', {
        input: userInput,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Show error to user
      this.ui.showError('Request failed', errorMessage);
      this.rl.prompt();
    }
  }


  /**
   * Handle interaction with the Spotify Agent
   * @param userInput - The user input to process (all types of requests)
   * @private
   */
  private async handleSpotifyAgentInteraction(userInput: string): Promise<void> {
    if (!agents) {
      await this.traceEvent('spotify_agent_not_initialized', { input: userInput });
      this.ui.showError('Agent not initialized', 'Please wait for the system to connect');
      return;
    }

    try {
      // Trace Spotify Agent interaction start
      await this.traceEvent('spotify_agent_interaction_start', {
        input: userInput,
        messageCount: this.conversation.getMessageCount()
      });
      
      this.ui.startSpinner('Processing your request...');
      
      // Add user message to conversation history
      this.conversation.addUserMessage(userInput);
      
      // Create input with conversation context
      const contextualInput = this.conversation.getFormattedHistory() + ' ' + userInput;
      
      // Use the Spotify Agent for all requests (with or without tracing)
      const result = debug.isTracingEnabled() 
        ? await runWithToolCallTracing(
            agents.spotify, 
            contextualInput,
            async (trace) => await this.traceIntegration.processTraceEvent(trace),
            () => this.traceIntegration.getCurrentSession().sessionId
          )
        : await run(agents.spotify, contextualInput);
      this.ui.stopSpinner();
      
      const response = result.finalOutput || 'No response received';
      
      // Add assistant response to conversation history
      this.conversation.addAssistantMessage(response);
      
      // Trace successful Spotify Agent interaction
      await this.traceEvent('spotify_agent_interaction_success', {
        input: userInput,
        response: response,
        responseLength: response.length,
        messageCount: this.conversation.getMessageCount()
      });
      
      console.log(this.ui.formatBotResponse(response) + '\n');
    } catch (error) {
      this.ui.stopSpinner();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Trace unified agent interaction error
      await this.traceEvent('unified_agent_interaction_error', {
        input: userInput,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      this.ui.showError('Request failed', errorMessage);
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