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
git clone [your-repo] spotify-agent
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

### Multi-Agent System
- **Spotify Assistant**: Primary agent handling user interaction and music control
- **Queue Manager**: Specialized agent for intelligent music curation and queue management
- **Command Router**: Routes natural language to appropriate tools and agents

### Key Components
- **Song Pool Manager**: Intelligent song selection from your library
- **Queue Monitor**: Autonomous queue management with anti-repetition
- **History Tracker**: Persistent track history to avoid repetition
- **Tool Registry**: Modular system for extending functionality

### Technology Stack
- **OpenAI Agents SDK**: Multi-agent orchestration
- **Model Context Protocol (MCP)**: AI-to-API communication
- **TypeScript**: Type-safe development
- **Spotify Web API**: Music control and library access

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
├── ui.ts              # Rich CLI interface
└── types.ts           # TypeScript definitions
```

### Available Scripts
```bash
npm run build          # Build TypeScript
npm run dev            # Development mode with auth
npm run debug          # Debug mode with verbose logging
npm start              # Production mode
npm run clean          # Clean build artifacts
```

### Adding New Tools
1. Create a new tool class extending `BaseTool`
2. Register it in `src/tools/registry.ts`
3. Add appropriate agent instructions

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Areas for Contribution
- Enhanced recommendation algorithms
- Additional music service integrations
- Web interface development
- Mobile app development
- Playlist generation features

## License

ISC License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [OpenAI Agents](https://github.com/openai/agents)
- Uses [Model Context Protocol](https://modelcontextprotocol.io/) for AI-to-API communication
- Spotify integration via [spotify-mcp-server](https://github.com/marcelmarais/spotify-mcp-server)

---
_Made with_ ❤️ _and modern AI development practices_