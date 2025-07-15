/**
 * Type definitions for the Spotify Agent application
 */

/** Represents a single message in the conversation history */
export interface ConversationMessage {
  /** Role of the message sender */
  role: 'user' | 'assistant';
  /** Content of the message */
  content: string;
  /** Timestamp when the message was created */
  timestamp: Date;
}

/** Represents a track in the song history */
export interface HistoryTrack {
  /** Spotify track ID (optional for backward compatibility) */
  id?: string;
  /** Name of the song */
  name: string;
  /** Artist name */
  artist: string;
  /** Timestamp when the track was added to history */
  timestamp: Date;
}

/** Represents a track in the song pool */
export interface SongPoolTrack {
  /** Spotify track ID */
  id: string;
  /** Name of the song */
  name: string;
  /** Artist name */
  artist: string;
  /** Timestamp when the track was added to pool */
  addedAt: Date;
}

/** Configuration for song pool management */
export interface SongPoolConfig {
  /** Number of songs to fetch per refresh */
  fetchSize: number;
  /** Maximum random offset for fetching */
  maxRandomOffset: number;
  /** Maximum turns for pool refresh */
  maxTurns: number;
  /** Minimum time between refreshes in milliseconds */
  minRefreshIntervalMs: number;
  /** Maximum number of played songs to remember */
  maxPlayedHistory: number;
}

/** Configuration for connection status display */
export interface ConnectionStatusConfig {
  /** Chalk color function */
  color: (text: string) => string;
  /** Icon to display */
  icon: string;
  /** Title text */
  title: string;
  /** Default message */
  defaultMessage: string;
}

/** Status types for connection display */
export type ConnectionStatus = 'connecting' | 'connected' | 'error';

/** Agent configuration structure */
export interface AgentConfig {
  /** Collection of created agents */
  spotify: import('@openai/agents').Agent;
  queue: import('@openai/agents').Agent;
}

/** Auto-queue monitor state */
export interface QueueMonitorState {
  /** Whether the monitor is currently active */
  isActive: boolean;
  /** The interval timer reference */
  monitorInterval: NodeJS.Timeout | null;
}

/** Error types for better error handling */
export class MaxTurnsExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaxTurnsExceededError';
  }
}

export class MCPServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MCPServerError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/** Debug utility interface */
export interface DebugUtility {
  /** Check if debug mode is enabled */
  isDebugEnabled(): boolean;
  /** Log a debug message */
  log(message: string, ...args: any[]): void;
  /** Log a debug error */
  error(message: string, ...args: any[]): void;
  /** Log a debug warning */
  warn(message: string, ...args: any[]): void;
}

/** Spinner configuration options */
export interface SpinnerConfig {
  /** Text to display with spinner */
  text: string;
  /** Spinner type */
  spinner: string;
  /** Spinner color */
  color: string;
  /** Whether to discard stdin */
  discardStdin: boolean;
}