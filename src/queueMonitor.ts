import { Agent, run } from '@openai/agents';
import { UIManager } from './ui';
import { SongHistoryTracker } from './history';
import { SongPoolManager } from './songPool';
import { ConversationSession } from './conversation';
import { debug } from './debug';
import { AgentConfig } from './types';
import { AUTO_QUEUE, ERROR_MESSAGES, SUCCESS_MESSAGES, SONG_HISTORY, SONG_POOL } from './constants';
import { getMCPServer } from './agents';
import { loadPrompt } from './utils';

/**
 * Monitors and manages the automatic queue system
 * 
 * This service handles the continuous addition of songs to the Spotify queue
 * at regular intervals, ensuring a steady flow of music while avoiding
 * repetition through intelligent song selection and history tracking.
 * 
 * @example
 * ```typescript
 * const monitor = new QueueMonitorService(uiManager, conversation);
 * monitor.start(); // Begin auto-queue every 10 minutes
 * monitor.showPoolStats(); // Check song pool status
 * monitor.stop(); // Stop auto-queue
 * ```
 */
export class QueueMonitorService {
  private isActive = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private ui: UIManager;
  private historyTracker: SongHistoryTracker;
  private songPool: SongPoolManager | null = null;

  constructor(ui: UIManager, _conversation: ConversationSession) {
    this.ui = ui;
    this.historyTracker = new SongHistoryTracker();
  }

  /**
   * Initialize the song pool (can be called independently of auto-queue)
   * @param agents - The agent configuration containing the Spotify agent
   */
  initializeSongPool(agents: AgentConfig): void {
    if (!this.songPool && agents) {
      this.songPool = new SongPoolManager(agents.spotify);
      debug.log('🔍 [SONG-POOL] Song pool initialized');
    }
  }

  /**
   * Start the automatic queue monitoring system
   * @param agents - The agent configuration containing the Spotify agent
   */
  start(agents: AgentConfig): void {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Initialize song pool if not already done
    this.initializeSongPool(agents);
    
    this.ui.showInfo(SUCCESS_MESSAGES.AUTO_QUEUE_STARTED);
    
    // Add 4 songs immediately when starting
    this.checkQueueStatus(agents);
    
    // Check at regular intervals for queue status
    this.monitorInterval = setInterval(() => {
      this.checkQueueStatus(agents);
    }, AUTO_QUEUE.INTERVAL_MS);
  }

  /**
   * Stop the automatic queue monitoring system
   */
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.ui.showInfo(SUCCESS_MESSAGES.AUTO_QUEUE_STOPPED);
  }

  /**
   * Check if the auto-queue monitor is currently running
   * @returns True if auto-queue is active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Show song history (last 12 tracks)
   */
  showSongHistory(): void {
    const recentTracks = this.historyTracker.getRecentTracks();
    if (recentTracks.length === 0) {
      this.ui.showInfo('🎵 Song history is empty');
      return;
    }

    this.ui.showInfo(`🎵 Recent song history (last ${SONG_HISTORY.MAX_SIZE} tracks):`);
    recentTracks.forEach((track, index) => {
      const timeAgo = this.formatTimeAgo(track.timestamp);
      this.ui.showInfo(`${index + 1}. **"${track.name}"** by **${track.artist}** (${timeAgo})`);
    });
  }

  /**
   * Clear all song history
   */
  clearSongHistory(): void {
    this.historyTracker.clearHistory();
    this.ui.showInfo(SUCCESS_MESSAGES.HISTORY_CLEARED);
  }

  /**
   * Show song pool statistics
   * @param agents - The agent configuration containing the Spotify agent
   */
  showPoolStats(agents: AgentConfig): void {
    this.initializeSongPool(agents);
    
    if (!this.songPool) {
      this.ui.showInfo('🎵 Song pool not initialized - make sure agents are connected');
      return;
    }

    const stats = this.songPool.getPoolStats();
    this.ui.showInfo(`🎵 Song Pool Statistics:`);
    this.ui.showInfo(`   • Available songs: ${stats.available}`);
    this.ui.showInfo(`   • Played songs: ${stats.played}`);
    this.ui.showInfo(`   • Total songs: ${stats.total}`);
    this.ui.showInfo(`   • Pool age: ${stats.ageMinutes} minutes`);
    this.ui.showInfo(`   • Next refresh: ${stats.nextRefreshIn} minutes (or when ${SONG_POOL.TARGET_SONGS_PER_POOL} songs used)`);
  }

  /**
   * Force refresh the song pool
   * @param agents - The agent configuration containing the Spotify agent
   */
  async refreshSongPool(agents: AgentConfig): Promise<void> {
    this.initializeSongPool(agents);
    
    if (!this.songPool) {
      this.ui.showInfo('🎵 Song pool not initialized - make sure agents are connected');
      return;
    }

    try {
      this.ui.showInfo('🔄 Refreshing song pool...');
      await this.songPool.forceRefresh();
      const stats = this.songPool.getPoolStats();
      this.ui.showInfo(`✅ Pool refreshed with ${stats.total} songs`);
    } catch (error) {
      this.ui.showError('Failed to refresh song pool', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Check queue status and add songs if needed
   * @param agents - The agent configuration containing the Spotify agent
   */
  private async checkQueueStatus(agents: AgentConfig): Promise<void> {
    if (!this.isActive || !agents || !this.songPool) return;

    try {
      // Get recent track IDs from history for exclusion
      const recentTracks = this.historyTracker.getRecentTracks();
      const excludeIds = recentTracks.map(track => 
        // For history tracks without IDs, we'll use a simple string hash as fallback
        track.id || this.createSimpleHash(`${track.name}-${track.artist}`)
      );

      debug.log(`🔍 [AUTO-QUEUE] Requesting ${AUTO_QUEUE.SONGS_PER_BATCH} songs, excluding ${excludeIds.length} recent tracks`);

      // Get songs from the pool
      const selectedSongs = await this.songPool.getNextSongs(AUTO_QUEUE.SONGS_PER_BATCH, excludeIds);
      
      if (selectedSongs.length === 0) {
        debug.log('🔍 [AUTO-QUEUE] No songs available from pool');
        this.ui.showWarning('No songs available for auto-queue');
        return;
      }

      // Create fresh agent instance for auto-queue operation to reset turn counter
      const mcpServer = getMCPServer();
      if (!mcpServer) {
        debug.log('🔍 [AUTO-QUEUE] MCP server not available');
        return;
      }

      const freshAgent = new Agent({
        name: 'Auto-Queue Agent',
        model: 'gpt-4o-mini',
        instructions: loadPrompt('spotify-agent'),
        tools: [], // No additional tools needed beyond MCP
        mcpServers: [mcpServer]
      });

      // Add songs to queue using fresh agent with clean turn counter
      const trackIdsForPrompt = selectedSongs.map(song => `${song.id} ("${song.name}" by ${song.artist})`).join(', ');
      
      const result = await run(freshAgent, 
        `Use the addToQueue tool to add these track IDs directly to the current playback queue: ${trackIdsForPrompt}. Do NOT search - use the IDs provided directly. Respond with confirmation only.`, 
        { maxTurns: AUTO_QUEUE.MAX_TURNS_FALLBACK }
      );
      
      // Fresh agent instance will be garbage collected automatically after this function
      debug.log(`🔍 [AUTO-QUEUE] Fresh agent completed with ${result.finalOutput ? 'success' : 'failure'}`);
      
      if (result.finalOutput) {
        // Add to history tracker
        const historyTracks = selectedSongs.map(song => ({
          id: song.id,
          name: song.name,
          artist: song.artist,
          timestamp: new Date()
        }));
        
        this.historyTracker.addTracks(historyTracks);
        
        // Show pool stats for debugging
        const poolStats = this.songPool.getPoolStats();
        debug.log(`🔍 [AUTO-QUEUE] Pool stats: ${poolStats.available} available, ${poolStats.played} played, ${poolStats.total} total`);
        
        this.ui.showInfo(`🎵 ANA-LOG AUTO: Added ${selectedSongs.length} songs to queue`);
        
        // Show the actual songs added
        selectedSongs.forEach(song => {
          this.ui.showInfo(`   • **"${song.name}"** by **${song.artist}**`);
        });
      }
    } catch (error) {
      console.error('Auto-queue error:', error);
      this.ui.showWarning(ERROR_MESSAGES.QUEUE_MONITOR_FAILED);
    }
  }

  /**
   * Format time difference into human-readable string
   * @param timestamp - The timestamp to format
   * @returns Human-readable time difference
   */
  private formatTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  /**
   * Create a simple hash for track identification when Spotify ID is not available
   * @param input - String to hash
   * @returns Simple hash string
   */
  private createSimpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}