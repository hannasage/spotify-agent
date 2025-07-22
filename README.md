# Spotify Agent

An AI-powered Spotify control agent that provides intelligent music queue management and natural language interaction with your Spotify account.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![OpenAI Agents](https://img.shields.io/badge/OpenAI%20Agents-0.0.11-green.svg)](https://github.com/openai/agents)
[![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-1.15.1-purple.svg)](https://modelcontextprotocol.io/)

## Features

### 💬 **Natural Language Control**
```bash
🎧 You: start auto queue please
🤖 Agent: Auto-queue started! Adding 4 songs every 10 minutes.

🎧 You: queue something by radiohead
🤖 Agent: I'll search for Radiohead and add it to your queue...

🎧 You: what's playing?
🤖 Agent: Currently playing "Everything In Its Right Place" by Radiohead
```

### 🎵 **Auto-Queue**
- **Pool Management**: Fetches 50 songs from your library, uses 20, refreshes every 30 minutes
- **Anti-Repetition**: Remembers your last 12 tracks to avoid musical déjà vu
- **Seamless Experience**: Adds 4 songs every 10 minutes for continuous playback

### 🛠️ **System Commands**
- `/help` - Show available commands
- `/auto-queue` - Start intelligent queue monitoring
- `/stop-queue` - Stop auto-queue
- `/pool-stats` - View song pool statistics
- `/history-songs` - Show recent track history
- `/refresh-pool` - Force refresh song pool

> 🗣️ **Natural Language Commands** —
All system commands can also be triggered using natural language:


## Quick Start

### Prerequisites
- Node.js 18+
- Spotify Premium account
- Spotify Developer application
- OpenAI API key
- Spotify MCP Server ([repo](https://github.com/hannasage/spotify-mcp-server))

### Installation

1. **Clone the required repositories**
```bash
mkdir spotify-ai && cd spotify-ai
git clone https://github.com/hannasage/spotify-mcp-server.git
git clone https://github.com/hannasage/spotify-agent.git
```

2. **Setup the Spotify MCP Server**
> You'll also need to configure an app on the spotify developer dashboard to configure the Spotify MCP server.
```bash
cd spotify-mcp-server
cp spotify-config.example.json spotify-config.json
# Edit the contents with the required params
```

3. **Setup the Spotify Agent**
```bash
cd ../spotify-agent
npm install
cp .env.example .env
```

4. **Configure environment variables**
```bash
# Add to .env file
OPENAI_API_KEY=your_openai_api_key_here
SPOTIFY_MCP_PATH=../spotify-mcp-server/dist/index.js
```

5. **Run the agent**
```bash
npm run build
npm start
```

### Web Interface (Optional)
For a visual chat interface, you can also run the web version:
```bash
npm run web
```
Then open http://localhost:3000 in your browser for a real-time chat interface.

### First Experience
```bash
🎵 SPOTIFY AGENT
✅ Multi-agent system ready! Spotify Assistant + Queue Manager + Command Router available.

🎧 You: start auto queue
🎯 Auto-queue monitor started! Will add 4 songs every 10 minutes.
🎵 ANA-LOG AUTO: Added 4 songs to queue
   • "Paranoid Android" by Radiohead
   • "Karma Police" by Radiohead  
   • "Creep" by Radiohead
   • "No Surprises" by Radiohead
```

## Architecture

### Enhanced Multi-Agent System
- **Spotify Assistant**: Primary agent handling user interaction and music control with integrated tracing
- **Queue Manager**: Specialized agent for intelligent music curation and queue management
- **Command Router**: Routes natural language to appropriate tools and agents with performance monitoring
- **MCP Tool Call Interceptor**: Real-time monitoring of all Spotify API interactions
- **Tool Call Tracer**: Comprehensive agent execution tracking and performance analysis

### Key Components
- **Song Pool Manager**: Intelligent song selection from your library
- **Queue Monitor**: Autonomous queue management with anti-repetition
- **History Tracker**: Persistent track history to avoid repetition
- **Tool Registry**: Modular system for extending functionality
- **Performance Evaluation**: Real-time trace collection and system analysis
- **Tool Call Interceptor**: Detailed MCP tool call monitoring and metrics

### Technology Stack
- **OpenAI Agents SDK**: Multi-agent orchestration
- **Model Context Protocol (MCP)**: AI-to-API communication
- **TypeScript**: Type-safe development
- **Spotify Web API**: Music control and library access
- **Evaluation System**: Comprehensive performance tracking and analysis

## Evaluation System

### Performance Monitoring
The Spotify Agent includes a comprehensive evaluation system for tracking performance, accuracy, and user experience metrics:

```bash
# Run evaluations on collected trace data
npm run eval

# Example evaluation output:
📊 SPOTIFY AGENT EVALUATION REPORT
Session: session_2025_07_19_152437
Grade: A (Score: 92.3/100)

🎯 Performance Metrics:
• Average Response Time: 1.2s
• Tool Call Success Rate: 98.5%
• Agent Execution Time: 850ms

🎵 Accuracy Metrics:
• Command Routing: 94.2%
• Playback Success: 96.8%
• Query Relevance: 89.3%

👤 User Experience:
• Session Duration: 180s
• Interactions: 12
• Conversation Flow: 8.5/10
```

### Trace Collection
Real-time monitoring captures detailed execution traces:
- **MCP Tool Calls**: Spotify API interactions with timing and success rates
- **Agent Executions**: Multi-agent coordination and decision-making
- **User Interactions**: Input classification and response quality
- **System Health**: Error rates, connection stability, and performance

### Evaluation Dimensions
- **Routing**: Input classification accuracy and agent selection
- **Tool Calls**: MCP server interaction performance and reliability
- **Agents**: Individual agent execution metrics and success rates
- **Interactions**: User experience quality and conversation flow

## Development

### Project Structure
```
src/
├── agents.ts          # Multi-agent configuration
├── queueMonitor.ts    # Auto-queue management
├── songPool.ts        # Intelligent song selection
├── tools/             # Modular tool system
│   ├── autoQueueTools.ts
│   ├── poolTools.ts
│   ├── historyTools.ts
│   └── systemTools.ts
├── evaluations/       # Performance evaluation system
│   ├── evaluator.ts   # Comprehensive metrics analysis
│   ├── schema.ts      # Evaluation data structures
│   ├── cli.ts         # Evaluation CLI interface
│   └── index.ts       # Evaluation system exports
├── lib/               # Enhanced system libraries
│   ├── toolCallTracer.ts      # Agent tool call tracing
│   └── mcpToolCallInterceptor.ts  # MCP tool call monitoring
├── ui.ts              # Rich CLI interface
└── types.ts           # TypeScript definitions
```

### Available Scripts

#### CLI Interface
```bash
npm run build          # Build TypeScript
npm run dev            # Development mode with auth
npm run debug          # Debug mode with verbose logging
npm start              # Production mode
npm run clean          # Clean build artifacts
npm run eval           # Run evaluation system on trace data
```

#### Web Interface
```bash
npm run web            # Web interface (with tracing)
npm run web:dev        # Web interface (no tracing)
npm run web:debug      # Web interface (debug mode)
```

## Web Interface

### Features
- **Real-time Chat**: Socket.IO powered communication with agents
- **Beautiful UI**: Minimal design using Pico.css framework  
- **Mobile Responsive**: Works on desktop, tablet, and mobile
- **Agent Selection**: Choose between auto-detect, playback, or lookup agents
- **Conversation History**: Persistent chat history with timestamps
- **Connection Status**: Visual indicators for server connection and agent status
- **Trace Integration**: Optional trace viewing (respects --no-trace flag)

### Getting Started
1. Install dependencies: `npm install`
2. Start the web server: `npm run web:dev`
3. Open http://localhost:3000 in your browser
4. Start chatting with your Spotify agents!

### Web Interface Architecture
```
web/
├── server.ts          # Express + Socket.IO server
└── public/            # Static web files
    ├── index.html     # Main interface (Pico.css)
    └── app.js         # Socket.IO client + UI logic
```

### Simultaneous Usage
The web interface and CLI can run simultaneously:
- Use CLI for quick commands and development
- Use web interface for extended conversations and visual feedback
- Both share the same agent instances and conversation history

### Development Features
- **Enhanced Debugging**: Comprehensive trace collection with MCP tool call interception
- **Performance Monitoring**: Real-time metrics on agent execution and tool call success rates
- **Evaluation Framework**: Automated analysis of system performance with graded reports
- **Error Tracking**: Detailed error capture and recovery analysis

### Adding New Tools
1. Create a new tool class extending `BaseTool`
2. Register it in `src/tools/registry.ts`
3. Add appropriate agent instructions
4. Tool calls will be automatically traced and included in evaluation reports

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Areas for Contribution
- Enhanced recommendation algorithms
- Additional music service integrations
- Web interface development
- Mobile app development
- Playlist generation features
- Advanced evaluation metrics and analysis
- Machine learning-based performance optimization
- Custom trace collection and visualization tools

## License

ISC License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [OpenAI Agents](https://github.com/openai/agents)
- Uses [Model Context Protocol](https://modelcontextprotocol.io/) for AI-to-API communication
- Spotify integration via [spotify-mcp-server](https://github.com/marcelmarais/spotify-mcp-server)

---
_Made with_ ❤️ _and modern AI development practices_