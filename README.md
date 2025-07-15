# Spotify Agent

**An AI-powered Spotify controller with intelligent auto-queue management**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![OpenAI Agents](https://img.shields.io/badge/OpenAI%20Agents-0.0.11-green.svg)](https://github.com/openai/agents)
[![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-1.15.1-purple.svg)](https://modelcontextprotocol.io/)

## 🎯 What This Project Demonstrates

This project showcases intermediate **AI/ML engineering skills** through a practical, working application that you can actually try. It demonstrates:

- **Modern AI Agent Architecture** with OpenAI's Agents SDK
- **Advanced Prompt Engineering** with context-aware interactions
- **Production-Ready TypeScript** with strict typing and error handling
- **Intelligent Automation** with anti-repetition algorithms
- **CLI/UX Design** with rich terminal interfaces
- **System Integration** using emerging MCP protocol

## 🚀 Try It Yourself

> **Want to see this in action?** Follow the setup below - it takes 5 minutes and you'll be controlling Spotify with natural language!

### Quick Setup

1. **Prerequisites**
   - Node.js 18+ installed
   - Spotify Premium account
   - OpenAI API key ([get one here](https://platform.openai.com/api-keys))

2. **One-Command Setup**
   ```bash
   # Create workspace and clone both repos
   mkdir spotify-ai-workspace && cd spotify-ai-workspace
   git clone https://github.com/marcelmarais/spotify-mcp-server.git
   git clone [your-repo-url] spotify-agent
   
   # Install dependencies
   cd spotify-mcp-server && npm install
   cd ../spotify-agent && npm install
   ```

3. **Configuration**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env with your API key
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

4. **Start the Agent**
   ```bash
   npm run build && npm run start
   ```

### What You'll Experience

```bash
🎵 SPOTIFY AGENT
🎵 AI-Powered Spotify Control • Built with OpenAI Agents & MCP

✅ CONNECTED - Successfully connected to Spotify MCP Server
🎶 Available Commands:
• play jazz music - Search and play music
• skip song - Skip to next track  
• what's playing? - Get current track info
• /auto-queue - Start intelligent auto-queue
• /help - Show all commands

🎧 You: play some lofi hip hop
🎵 ANA-LOG: I'll search for lofi hip hop music and start playing it for you...
```

## 🛠️ Technical Architecture

### Technology Stack

| Component | Technology | Skills Demonstrated |
|-----------|------------|-------------------|
| **AI/ML** | OpenAI Agents SDK | Advanced prompt engineering, agent orchestration |
| **Backend** | Node.js + TypeScript | Type-safe development, async programming |
| **Protocol** | Model Context Protocol (MCP) | Emerging tech adoption, API integration |
| **CLI/UX** | Chalk, Figlet, Boxen | User experience design, terminal interfaces |
| **Architecture** | Modular TypeScript | Clean architecture, separation of concerns |

### Key Features

#### 🎵 **Intelligent Auto-Queue**
- Automatically adds 4 songs every 10 minutes
- Avoids recently played tracks (last 12 songs)
- Fallback strategies for reliability
- Configurable intervals and batch sizes

#### 🎯 **Advanced Prompt Engineering**
- Context-aware conversation memory
- Error handling with graceful degradation
- Tool validation and result verification
- Dynamic prompt construction

#### 🔧 **Production-Ready Code**
- Comprehensive TypeScript configuration
- Centralized constants and configuration
- Proper error handling and logging
- Debug mode with conditional logging

## 📁 Project Structure

```
spotify-agent/
├── src/
│   ├── constants.ts      # Centralized configuration
│   ├── types.ts         # Type definitions
│   ├── debug.ts         # Debug utilities
│   ├── history.ts       # Song history tracking
│   ├── ui.ts           # Terminal UI management
│   └── index.ts        # Main application
├── dist/               # Compiled JavaScript
├── .env.example        # Configuration template
└── package.json        # Dependencies and scripts
```

## 🎮 Usage Examples

### Natural Language Commands
```bash
🎧 You: play some energetic music for coding
🎵 ANA-LOG: I'll find some energetic music perfect for coding...

🎧 You: skip this song, I don't like it
🎵 ANA-LOG: Skipping to the next track...

🎧 You: what's playing right now?
🎵 ANA-LOG: Currently playing **"Digital Love"** by **Daft Punk**...
```

### Auto-Queue Management
```bash
🎧 You: /auto-queue
🎯 Auto-queue monitor started! Will add 4 songs every 10 minutes.
🎵 ANA-LOG AUTO: Added **"Sunset"** by **Chillhop Music**, **"Focus"** by **Lo-fi Girl**...

🎧 You: /history-songs
🎵 Recent song history (last 12 tracks):
1. **"Sunset"** by **Chillhop Music** (2m ago)
2. **"Focus"** by **Lo-fi Girl** (2m ago)
...
```

### Debug Mode
```bash
# Enable detailed logging
npm run debug

🔍 Debug mode enabled
🔍 [HISTORY DEBUG] Avoiding 8 tracks: "Song A" by Artist A, "Song B" by Artist B...
🔍 [HISTORY DEBUG] Parsed 4 tracks from response: ["New Song" by New Artist...]
```

## 🏗️ Skills Demonstrated

### AI/ML Engineering
- **Agent Architecture**: Multi-turn conversation handling
- **Prompt Engineering**: Context-aware, error-resistant prompts
- **Fallback Systems**: Graceful degradation strategies
- **Memory Management**: Conversation and song history tracking

### Software Development
- **TypeScript Mastery**: Strict typing, advanced configurations
- **Error Handling**: Comprehensive exception management
- **Testing Strategy**: Unit and integration test patterns
- **Performance**: Efficient algorithms and memory management

### System Design
- **Modular Architecture**: Clean separation of concerns
- **Configuration Management**: Environment-based settings
- **Logging & Debugging**: Conditional debug output
- **User Experience**: Rich terminal interfaces

### Innovation
- **Emerging Technologies**: Early adoption of MCP protocol
- **Creative Problem Solving**: Anti-repetition algorithms
- **Process Automation**: Intelligent auto-queue system
- **API Integration**: Complex third-party service coordination

## 🔄 Development Commands

```bash
# Standard development
npm run dev              # Development with hot reload
npm run build           # TypeScript compilation
npm start              # Production execution

# Debug mode
npm run debug          # Development with debug logging
npm run debug -- -d    # Alternative debug flag

# Utilities
npm run auth           # Spotify authentication
npm run clean          # Clean build artifacts
```

## 🎯 For Technical Recruiters

### Why This Project Stands Out

1. **Real-World Application**: This _actually_ works with Spotify
2. **Try-It-Yourself**: You can run it and see the AI in action
3. **Modern Tech Stack**: Uses cutting-edge AI tools and protocols
4. **Production Quality**: Enterprise-grade code patterns and practices
5. **Innovation**: Creative solutions to complex problems (anti-repetition, fallback systems)

### Skills Showcased

- **AI/ML Engineering**: Practical application of LLMs and agent frameworks
- **Full-Stack Development**: TypeScript, Node.js, API integration
- **System Design**: Modular architecture, error handling, performance optimization
- **Developer Experience**: Rich CLI interfaces, debugging tools, documentation
- **Innovation**: Early adoption of emerging technologies (MCP, AI Agents)

---

*Built with ❤️ and modern AI engineering practices*