/**
 * Unified Command Router - Clean, single-responsibility routing system
 */

import { SpotifyOrchestratorConfig } from '../types';
import { UIManager } from '../ui';
import { ConversationSession } from '../conversation';
import { QueueMonitorService } from '../queueMonitor';
import { debug } from '../debug';

export interface CommandRoute {
  type: 'system' | 'music' | 'error';
  action?: string;
  content?: string;
  error?: string;
}

export class UnifiedCommandRouter {
  private orchestratorConfig: SpotifyOrchestratorConfig | null = null;
  private ui: UIManager;
  private conversation: ConversationSession;
  private queueMonitor: QueueMonitorService;

  constructor(
    ui: UIManager,
    conversation: ConversationSession,
    queueMonitor: QueueMonitorService
  ) {
    this.ui = ui;
    this.conversation = conversation;
    this.queueMonitor = queueMonitor;
  }

  /**
   * Update orchestrator config when available
   */
  updateOrchestratorConfig(config: SpotifyOrchestratorConfig): void {
    this.orchestratorConfig = config;
  }

  /**
   * Route any command to the appropriate handler
   */
  routeCommand(input: string): CommandRoute {
    const trimmed = input.trim();
    
    // 1. System commands (slash + natural language)
    const systemRoute = this.trySystemCommand(trimmed);
    if (systemRoute) {
      return systemRoute;
    }

    // 2. Music commands (everything else goes to orchestrator)
    return {
      type: 'music',
      content: trimmed
    };
  }

  /**
   * Try to match system commands (both slash and natural language)
   */
  private trySystemCommand(input: string): CommandRoute | null {
    const lower = input.toLowerCase();

    // Help commands
    if (this.matchesAny(lower, ['/help', 'help', 'commands', 'what can you do'])) {
      return this.createSystemRoute('help');
    }

    // Clear conversation
    if (this.matchesAny(lower, ['/clear', 'clear conversation', 'clear chat', 'reset conversation'])) {
      return this.createSystemRoute('clear_conversation');
    }

    // Conversation history
    if (this.matchesAny(lower, ['/history', 'conversation history', 'chat history'])) {
      return this.createSystemRoute('conversation_history');
    }

    // Agent status
    if (this.matchesAny(lower, ['/agents', 'agent status', 'system status', 'show agents'])) {
      return this.createSystemRoute('agent_status');
    }

    // Auto-queue start
    if (this.matchesAny(lower, [
      '/start-queue', '/auto-queue',
      'start auto queue', 'start auto mode', 'enable auto queue',
      'turn on auto queue', 'start continuous play'
    ])) {
      return this.createSystemRoute('start_auto_queue');
    }

    // Auto-queue stop
    if (this.matchesAny(lower, [
      '/stop-queue',
      'stop auto queue', 'stop auto mode', 'disable auto queue',
      'turn off auto queue', 'stop continuous play'
    ])) {
      return this.createSystemRoute('stop_auto_queue');
    }

    // Pool stats
    if (this.matchesAny(lower, [
      '/pool-stats',
      'show pool stats', 'pool statistics', 'pool info', 'show pool'
    ])) {
      return this.createSystemRoute('pool_stats');
    }

    // Pool refresh
    if (this.matchesAny(lower, [
      '/refresh-pool',
      'refresh pool', 'reload pool', 'update pool'
    ])) {
      return this.createSystemRoute('refresh_pool');
    }

    // Song history
    if (this.matchesAny(lower, [
      '/history-songs',
      'show song history', 'song history', 'what did i play', 'recent songs'
    ])) {
      return this.createSystemRoute('song_history');
    }

    // Clear song history
    if (this.matchesAny(lower, [
      '/clear-history-songs',
      'clear song history', 'clear history', 'reset history'
    ])) {
      return this.createSystemRoute('clear_song_history');
    }

    return null;
  }

  /**
   * Create a system command route
   */
  private createSystemRoute(action: string): CommandRoute {
    return {
      type: 'system',
      action
    };
  }

  /**
   * Check if input matches any of the provided patterns
   */
  private matchesAny(input: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      // Exact match
      if (input === pattern) return true;
      
      // For natural language, check if all words are present
      if (!pattern.startsWith('/')) {
        const patternWords = pattern.split(' ');
        const inputWords = input.split(' ');
        return patternWords.every(word => inputWords.includes(word));
      }
      
      return false;
    });
  }

  /**
   * Execute a system command directly
   */
  async executeSystemCommand(action: string): Promise<{ success: boolean; message?: string }> {
    debug.log(`🔀 [UNIFIED-ROUTER] Executing system command: ${action}`);

    switch (action) {
      case 'help':
        this.ui.showHelp();
        return { success: true };

      case 'clear_conversation':
        this.conversation.clearHistory();
        this.ui.showInfo('Conversation history cleared. Starting fresh conversation.');
        return { success: true };

      case 'conversation_history':
        const count = this.conversation.getMessageCount();
        this.ui.showInfo(`Conversation has ${count} messages in history.`);
        return { success: true };

      case 'agent_status':
        this.showAgentStatus();
        return { success: true };

      case 'start_auto_queue':
        return this.startAutoQueue();

      case 'stop_auto_queue':
        this.queueMonitor.stop();
        return { success: true };

      case 'pool_stats':
        return this.showPoolStats();

      case 'refresh_pool':
        return this.refreshPool();

      case 'song_history':
        this.queueMonitor.showSongHistory();
        return { success: true };

      case 'clear_song_history':
        this.queueMonitor.clearSongHistory();
        return { success: true };

      default:
        return { success: false, message: `Unknown system command: ${action}` };
    }
  }

  private showAgentStatus(): void {
    if (!this.orchestratorConfig) {
      this.ui.showInfo('Hierarchical multi-agent system status:');
      this.ui.showInfo('🎵 Spotify Orchestrator: Initializing...');
      this.ui.showInfo('🎮 Playback Agent: Waiting for orchestrator');
      this.ui.showInfo('🔍 Search Agent: Waiting for orchestrator');
      this.ui.showInfo('📚 Library Agent: Waiting for orchestrator');
      this.ui.showInfo('🎯 Queue Agent: Waiting for orchestrator');
      this.ui.showInfo('💬 Communication: System is starting up');
    } else {
      this.ui.showInfo('Hierarchical multi-agent system status:');
      this.ui.showInfo('🎵 Spotify Orchestrator: Coordinates specialized agents for optimal performance');
      this.ui.showInfo('🎮 Playback Agent: Handles real-time playback control and device management');
      this.ui.showInfo('🔍 Search Agent: Specializes in content discovery and music search');
      this.ui.showInfo('📚 Library Agent: Manages playlists, saved music, and personal collections');
      this.ui.showInfo('🎯 Queue Agent: Intelligent queue building and music curation');
      this.ui.showInfo('💬 Communication: Orchestrator analyzes requests and routes to appropriate agents');
    }
    this.ui.showInfo(`🤖 Auto-queue monitor: ${this.queueMonitor.isRunning() ? 'ACTIVE' : 'INACTIVE'}`);
  }

  private startAutoQueue(): { success: boolean; message?: string } {
    if (!this.orchestratorConfig) {
      this.ui.showError('System not ready', 'Agents are still initializing. Please wait a moment and try again.');
      return { success: false, message: 'System not ready' };
    }

    if (this.queueMonitor.isRunning()) {
      this.ui.showInfo('Auto-queue is already running');
      return { success: true };
    }

    const legacyAgents = {
      spotify: this.orchestratorConfig.agents.search,
      queue: this.orchestratorConfig.agents.queue
    };

    this.queueMonitor.start(legacyAgents);
    return { success: true };
  }

  private showPoolStats(): { success: boolean; message?: string } {
    if (!this.orchestratorConfig) {
      this.ui.showError('System not ready', 'Agents are still initializing. Please wait a moment and try again.');
      return { success: false, message: 'System not ready' };
    }

    const legacyAgents = {
      spotify: this.orchestratorConfig.agents.search,
      queue: this.orchestratorConfig.agents.queue
    };

    this.queueMonitor.showPoolStats(legacyAgents);
    return { success: true };
  }

  private async refreshPool(): Promise<{ success: boolean; message?: string }> {
    if (!this.orchestratorConfig) {
      this.ui.showError('System not ready', 'Agents are still initializing. Please wait a moment and try again.');
      return { success: false, message: 'System not ready' };
    }

    const legacyAgents = {
      spotify: this.orchestratorConfig.agents.search,
      queue: this.orchestratorConfig.agents.queue
    };

    try {
      await this.queueMonitor.refreshSongPool(legacyAgents);
      this.ui.showInfo('✅ Pool refreshed successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.ui.showError('Failed to refresh pool', errorMessage);
      return { success: false, message: errorMessage };
    }
  }
}