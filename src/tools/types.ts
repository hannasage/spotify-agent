/**
 * Type definitions for the custom tools system
 */

import { UIManager } from '../ui';
import { ConversationSession } from '../conversation';
import { QueueMonitorService } from '../queueMonitor';
import { AgentConfig, SpotifyOrchestratorConfig } from '../types';

/**
 * Context object passed to all system tools
 * Provides access to system components and state
 */
export interface SystemContext {
  /** UI manager for displaying messages and status */
  ui: UIManager;
  /** Conversation session for history management */
  conversation: ConversationSession;
  /** Queue monitoring service */
  queueMonitor: QueueMonitorService;
  /** Agent configuration (nullable during startup) */
  agents: AgentConfig | null;
  /** Orchestrator configuration (available after startup) */
  orchestratorConfig?: SpotifyOrchestratorConfig;
}

/**
 * Result returned by system tools
 */
export interface ToolResult {
  /** Whether the tool execution was successful */
  success: boolean;
  /** Message to display to the user */
  message: string;
  /** Optional error details for logging */
  error?: string;
}

/**
 * Base interface for all system tools
 */
export interface SystemTool {
  /** Tool name for identification */
  name: string;
  /** Description for the agent */
  description: string;
  /** Execute the tool with given context */
  execute(context: SystemContext): Promise<ToolResult>;
}