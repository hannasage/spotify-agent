import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { debug } from '../src/debug';
import { createAgents, cleanupMCPServer } from '../src/agents';
import { ConversationSession } from '../src/conversation';
import { run } from '@openai/agents';
import { runWithToolCallTracing } from '../src/lib/toolCallTracer';
import { createTraceIntegration } from '../src/lib/traceIntegration';
import { AgentConfig } from '../src/types';

// Load environment variables
dotenv.config();

/**
 * Web interface server for Spotify Agent
 * 
 * Provides a lightweight web UI for interacting with the Spotify agents
 * through a real-time Socket.IO interface. Supports the same functionality
 * as the CLI version with a visual chat interface.
 */

class SpotifyAgentWebServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private io: Server;
  private agents: AgentConfig | null = null;
  private conversation: ConversationSession;
  private traceIntegration: ReturnType<typeof createTraceIntegration>;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server);
    this.conversation = new ConversationSession();
    
    // Initialize trace integration (conditionally based on --no-trace flag)
    const traceDir = process.env.TRACE_DIRECTORY || './data/traces';
    this.traceIntegration = createTraceIntegration(traceDir, debug.isTracingEnabled());

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  private setupMiddleware(): void {
    // Serve static files from public directory
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // Basic logging middleware
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      debug.log(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Serve the main interface at root
    this.app.get('/', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        agents: this.agents ? 'initialized' : 'not initialized',
        tracing: debug.isTracingEnabled()
      });
    });
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('🌐 Web client connected:', socket.id);
      
      // Send connection confirmation
      socket.emit('connected', { 
        message: 'Connected to Spotify Agent Web Interface',
        agentsReady: !!this.agents,
        tracingEnabled: debug.isTracingEnabled()
      });

      // Handle chat messages from client
      socket.on('chat_message', async (data: { message: string; agent: string }) => {
        const { message } = data;
        
        if (!this.agents) {
          socket.emit('agent_response', {
            message: 'Agents are not initialized yet. Please wait...',
            type: 'error'
          });
          return;
        }

        try {
          // Add user message to conversation
          this.conversation.addUserMessage(message);
          
          // Emit user message to all clients
          this.io.emit('user_message', { message, timestamp: new Date().toISOString() });

          // Determine which agent to use (similar to CLI logic)
          // Use the Spotify Agent for all requests
          const selectedAgent = this.agents.spotify;
          const agentType = 'spotify';

          // Get conversation context
          const contextualInput = this.conversation.getFormattedHistory() + ' ' + message;

          // Execute agent with or without tracing
          const result = debug.isTracingEnabled() 
            ? await runWithToolCallTracing(
                selectedAgent,
                contextualInput,
                async (trace) => await this.traceIntegration.processTraceEvent(trace),
                () => this.traceIntegration.getCurrentSession().sessionId
              )
            : await run(selectedAgent, contextualInput);

          const response = result.finalOutput || 'No response received';
          
          // Add assistant response to conversation
          this.conversation.addAssistantMessage(response);

          // Send response to all clients
          this.io.emit('agent_response', {
            message: response,
            agent: agentType,
            timestamp: new Date().toISOString(),
            type: 'success'
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Agent error:', errorMessage);
          
          socket.emit('agent_response', {
            message: `Error: ${errorMessage}`,
            type: 'error',
            timestamp: new Date().toISOString()
          });
        }
      });

      // Removed clear conversation handler per user request

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('🌐 Web client disconnected:', socket.id);
      });
    });
  }

  private isPlaybackAction(input: string): boolean {
    const playbackKeywords = [
      'play', 'pause', 'skip', 'next', 'previous', 'queue', 'add', 'remove',
      'volume', 'shuffle', 'repeat', 'stop', 'resume', 'start'
    ];
    
    const lowerInput = input.toLowerCase();
    return playbackKeywords.some(keyword => lowerInput.includes(keyword));
  }

  async start(): Promise<void> {
    try {
      // Initialize trace integration
      await this.traceIntegration.initialize();
      
      // Initialize agents
      console.log('🤖 Initializing agents...');
      this.agents = debug.isTracingEnabled() 
        ? await createAgents(
            async (trace) => await this.traceIntegration.processTraceEvent(trace),
            () => this.traceIntegration.getCurrentSession().sessionId
          )
        : await createAgents();
      
      console.log('✅ Agents initialized successfully');

      // Start the server
      this.server.listen(this.port, () => {
        console.log(`🌐 Spotify Agent Web Interface running at http://localhost:${this.port}`);
        console.log(`🎵 Playback Agent ready`);
        console.log(`🔍 Lookup Agent ready`);
        if (debug.isTracingEnabled()) {
          console.log(`📊 Tracing enabled`);
        } else {
          console.log(`📊 Tracing disabled (--no-trace)`);
        }
      });

    } catch (error) {
      console.error('❌ Failed to start web server:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    console.log('🔄 Shutting down web server...');
    
    // Close Socket.IO connections
    this.io.close();
    
    // Close HTTP server
    this.server.close();
    
    // Cleanup trace integration
    await this.traceIntegration.flush();
    
    // Cleanup MCP server
    await cleanupMCPServer();
    
    console.log('✅ Web server shut down complete');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
const port = process.env.WEB_PORT ? parseInt(process.env.WEB_PORT) : 3000;
const server = new SpotifyAgentWebServer(port);
server.start().catch(console.error);