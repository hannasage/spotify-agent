/**
 * Types for the Spotify Orchestrator system
 */

import { Agent } from '@openai/agents';

/**
 * Configuration for all specialized Spotify agents
 */
export interface SpotifyAgentConfig {
  /** Playback control agent */
  playback: Agent;
  /** Search and discovery agent */
  search: Agent;
  /** Library management agent */
  library: Agent;
  /** Queue management agent */
  queue: Agent;
}

/**
 * Task types that can be handled by the orchestrator
 */
export enum TaskType {
  PLAYBACK_CONTROL = 'playback_control',
  SEARCH_DISCOVERY = 'search_discovery',
  LIBRARY_MANAGEMENT = 'library_management',
  QUEUE_MANAGEMENT = 'queue_management',
  COMPLEX_MULTI_AGENT = 'complex_multi_agent'
}

/**
 * Result from task analysis
 */
export interface TaskAnalysis {
  /** Primary task type */
  taskType: TaskType;
  /** Primary agent to handle the task */
  primaryAgent: keyof SpotifyAgentConfig;
  /** Secondary agents that might be needed */
  secondaryAgents?: (keyof SpotifyAgentConfig)[] | undefined;
  /** Complexity level (1-5) */
  complexity: number;
  /** Reasoning for the task assignment */
  reasoning: string;
}

/**
 * Result from agent execution
 */
export interface AgentResult {
  /** Success status */
  success: boolean;
  /** Response content */
  content: string;
  /** Agent that processed the request */
  agent: keyof SpotifyAgentConfig;
  /** Whether this requires clarification from user */
  requiresClarification?: boolean;
  /** Any additional context for coordination */
  context?: Record<string, any>;
}

/**
 * Orchestrator execution result
 */
export interface OrchestratorResult {
  /** Success status */
  success: boolean;
  /** Final response to user */
  response: string;
  /** Agents that were involved */
  agentsUsed: (keyof SpotifyAgentConfig)[];
  /** Execution time in milliseconds */
  executionTime: number;
  /** Whether this requires clarification from user */
  requiresClarification?: boolean | undefined;
  /** Context for continuing the conversation */
  clarificationContext?: Record<string, any> | undefined;
}