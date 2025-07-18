# Spotify Agent

An intelligent hierarchical multi-agent system that provides advanced Spotify control through specialized AI agents working in concert to deliver seamless music experiences.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![OpenAI Agents](https://img.shields.io/badge/OpenAI%20Agents-0.0.11-green.svg)](https://github.com/openai/agents)
[![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-1.15.1-purple.svg)](https://modelcontextprotocol.io/)

## Features

### 🎭 **Hierarchical Multi-Agent System**
Four specialized AI agents work together under an intelligent orchestrator:
- **🎮 Playback Agent**: Real-time playback control and device management
- **🔍 Search Agent**: Content discovery with clarifying questions for ambiguous requests
- **📚 Library Agent**: Personal music collection and playlist management
- **🎯 Queue Agent**: Smart music curation and management

### 💬 **Natural Language Control**
```bash
🎧 You: start auto queue please
🤖 Orchestrator: Auto-queue started! Adding 4 songs every 10 minutes.

🎧 You: do i have any kendrick in my library?
🤖 Search Agent: I found several Kendrick Lamar albums in your library...
🤖 Library Agent: You have 23 Kendrick Lamar tracks saved, including "HUMBLE." and "DNA."

🎧 You: what's playing?
🤖 Playback Agent: Currently playing "Everything In Its Right Place" by Radiohead
```

### 🎵 **Auto-Queue**
- **Smart Pool Management**: Queue Agent fetches 50 songs from your library, uses 20, refreshes every 30 minutes
- **Anti-Repetition**: Remembers your last 12 tracks to avoid musical déjà vu  
- **Seamless Experience**: Adds 4 songs every 10 minutes for continuous playback
- **Multi-Agent Coordination**: Search Agent discovers content, Library Agent verifies availability, Queue Agent curates flow

### 🛠️ **Unified Command System**
- `/help` - Show available commands and agent status
- `/agents` - View multi-agent system status
- `/auto-queue` - Start intelligent queue monitoring
- `/stop-queue` - Stop auto-queue
- `/pool-stats` - View song pool statistics
- `/history-songs` - Show recent track history
- `/refresh-pool` - Force refresh song pool

> 🗣️ **Natural Language Commands** —
All system commands work through natural language via the Unified Command Router:
> - "start auto mode" → `/auto-queue`
> - "show agent status" → `/agents`
> - "clear conversation" → `/clear`


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

### First Experience
```bash
🎵 SPOTIFY AGENT
✅ Hierarchical multi-agent system ready! Orchestrator + Specialized Agents + Command Router available.

🎧 You: start auto queue
🤖 Orchestrator: Auto-queue started! Adding 4 songs every 10 minutes.
🎵 ANA-LOG AUTO: Added 4 songs to queue
   • "Paranoid Android" by Radiohead
   • "Karma Police" by Radiohead  
   • "Creep" by Radiohead
   • "No Surprises" by Radiohead

🎧 You: do i have any pink floyd albums?
🤖 Search Agent: I found several Pink Floyd albums in your library...
🤖 Library Agent: You have "The Dark Side of the Moon" and "Wish You Were Here" saved!
```

## Architecture

### Hierarchical Multi-Agent System
The system uses a sophisticated orchestrator pattern with specialized agents:

```
User Input → Unified Command Router → System Commands OR Music Commands → Spotify Orchestrator → Specialized Agents
```

- **🎵 Spotify Orchestrator**: Central coordinator that analyzes requests and routes to appropriate agents
- **🎮 Playback Agent**: Handles real-time playback control, device management, and volume control
- **🔍 Search Agent**: Specializes in content discovery, search queries, and clarifying ambiguous requests
- **📚 Library Agent**: Manages personal music collections, playlists, and saved music operations
- **🎯 Queue Agent**: "Dumb" music shuffling and **no** recommendation algorithms
- **🔀 Unified Command Router**: Clean routing system supporting slash commands and natural language

### Multi-Agent Coordination
- **Task Analysis**: Orchestrator determines which agent(s) to use based on request complexity
- **Agent Handoffs**: Seamless coordination between agents for complex workflows
- **Search → Library Workflows**: Search Agent finds content, Library Agent verifies availability
- **Clarification Support**: Interactive clarification for ambiguous requests with conversation context
- **Result Synthesis**: Orchestrator combines results from multiple agents into coherent responses

### Technology Stack
- **OpenAI Agents SDK**: Multi-agent orchestration and coordination
- **Model Context Protocol (MCP)**: AI-to-API communication layer
- **TypeScript**: Type-safe development with strict optional properties
- **Spotify Web API**: Music control and library access via MCP server

## Development

### Project Structure
```
src/
├── orchestrator/      # Hierarchical orchestrator system
│   ├── SpotifyOrchestrator.ts  # Central coordinator
│   └── types.ts       # Orchestrator type definitions
├── routing/           # Unified command routing
│   └── UnifiedCommandRouter.ts
├── prompts/           # Specialized agent prompts
│   ├── spotify-orchestrator.md
│   ├── playback-agent.md
│   ├── search-agent.md
│   ├── library-agent.md
│   └── queue-manager.md
├── agents.ts          # Multi-agent configuration
├── queueMonitor.ts    # Auto-queue management
├── songPool.ts        # Song selection
├── tools/             # Legacy tool system (orchestrator-compatible)
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

### Adding New Agents
1. Create a new agent prompt in `src/prompts/`
2. Add agent configuration to `SpotifyAgentConfig` in `src/orchestrator/types.ts`
3. Update orchestrator initialization in `src/agents.ts`
4. Add task analysis logic in `SpotifyOrchestrator.ts`

### Extending Agent Capabilities
1. Modify existing agent prompts to add new capabilities
2. Update task analysis logic to route appropriate requests
3. Add multi-agent coordination workflows for complex tasks

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Areas for Contribution
- **Agent Specialization**: New specialized agents for specific music tasks
- **Multi-Agent Workflows**: Enhanced coordination patterns between agents
- **Recommendation Algorithms**: Advanced music curation and discovery
- **Additional Integrations**: Other music service support (Apple Music, YouTube Music)
- **Web Interface**: Browser-based interface for the multi-agent system
- **Mobile App**: Native mobile app with agent coordination
- **Voice Interface**: Voice control integration with agent orchestration

## License

ISC License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [OpenAI Agents](https://github.com/openai/agents) for multi-agent orchestration
- Uses [Model Context Protocol](https://modelcontextprotocol.io/) for AI-to-API communication
- Spotify integration via [spotify-mcp-server](https://github.com/marcelmarais/spotify-mcp-server)
- Inspired by hierarchical agent systems like Microsoft's Magentic-One and AWS Multi-Agent Orchestrator

---
_Made with_ ❤️ _and cutting-edge multi-agent AI architecture_