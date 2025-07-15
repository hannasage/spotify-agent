# Spotify Agent Chatbot

A TypeScript chatbot built with OpenAI Agents SDK that will eventually control Spotify accounts through MCP server integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your OpenAI API key:
```bash
export OPENAI_API_KEY=sk-your-key-here
```

3. Run the development server:
```bash
npm run dev
```

## Usage

The chatbot provides a REPL interface where you can interact with the agent. Currently supports:
- General conversation
- Current time queries
- Extensible tool system ready for Spotify integration

Type "exit" to quit the chat.

## Commands

- `npm run dev` - Start the development server
- `npm run build` - Build the TypeScript code
- `npm run start` - Run the built application

## Future Features

- MCP server integration
- Spotify API control
- Music playback management
- Playlist operations