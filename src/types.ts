/**
 * Type definitions for the Spotify Agent application
 * 
 * This module contains all the core type definitions used throughout
 * the application, including conversation management, music data structures,
 * and agent configuration interfaces.
 */

/** 
 * Represents a single message in the conversation history
 * 
 * Used to track the back-and-forth conversation between the user
 * and the agents to maintain context across interactions.
 */
export interface ConversationMessage {
  /** Role of the message sender (user or AI assistant) */
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

/** 
 * Agent configuration structure
 * 
 * Contains the two main agents used in the multi-agent system:
 * - Playback Agent: Handles music playback actions
 * - Lookup Agent: Handles information retrieval
 */
export interface AgentConfig {
  /** Playback agent for executing music actions */
  playback: import('@openai/agents').Agent;
  /** Lookup agent for retrieving music information */
  lookup: import('@openai/agents').Agent;
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