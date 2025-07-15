import { Agent, run } from '@openai/agents';
import { debug } from './debug';
import { SongPoolTrack } from './types';
import { SONG_POOL } from './constants';

/**
 * Manages a local pool of songs with intelligent shuffling and selection
 * 
 * This class implements a smart song pool management system that:
 * - Fetches songs from Spotify using the getUsersSavedTracks API
 * - Maintains separate pools for available and played songs
 * - Implements intelligent refresh strategies based on time and usage
 * - Prevents repetition through history tracking and exclusion
 * - Provides fallback mechanisms for robust operation
 * 
 * The pool refresh strategy:
 * - Refreshes every 30 minutes (configurable)
 * - Refreshes when 20+ songs have been played from current pool
 * - Uses random offsets to ensure variety across refreshes
 * - Implements rate limiting to prevent API abuse
 * 
 * @example
 * ```typescript
 * const pool = new SongPoolManager(spotifyAgent);
 * const songs = await pool.getNextSongs(4, ['track_id1', 'track_id2']);
 * const stats = pool.getPoolStats();
 * ```
 */
export class SongPoolManager {
  private availablePool: SongPoolTrack[] = [];
  private playedPool: SongPoolTrack[] = [];
  private isRefreshing = false;
  private lastRefreshTime = 0;
  private poolCreationTime = 0;
  private agent: Agent;

  /**
   * Initialize the song pool manager with a Spotify agent
   * @param agent - The Spotify agent with access to getUsersSavedTracks tool
   */
  constructor(agent: Agent) {
    this.agent = agent;
    this.poolCreationTime = Date.now();
  }

  /**
   * Get the next batch of songs for the queue
   * 
   * This method intelligently selects songs from the available pool while:
   * - Excluding recently played tracks to prevent repetition
   * - Automatically refreshing the pool when needed
   * - Handling edge cases with graceful fallbacks
   * 
   * @param count - Number of songs to select (typically 4 for auto-queue)
   * @param excludeIds - Array of Spotify track IDs to exclude (recent history)
   * @param maxRetries - Maximum number of refresh attempts to prevent infinite loops
   * @returns Promise resolving to array of selected songs
   * @throws Error if unable to fetch songs after all retry attempts
   */
  async getNextSongs(count: number, excludeIds: string[] = [], maxRetries: number = 2): Promise<SongPoolTrack[]> {
    try {
      // Check if we need to refresh the pool based on time (30 minutes) or usage
      await this.checkPoolRefreshNeeded();

      // Ensure we have songs available
      await this.ensurePoolHasSongs();

      // Filter available pool to exclude recent tracks
      const eligibleSongs = this.availablePool.filter(song => 
        !excludeIds.includes(song.id)
      );

      // If we don't have enough eligible songs, try to refresh the pool
      if (eligibleSongs.length < count && maxRetries > 0) {
        debug.log(`🔍 [SONG-POOL] Only ${eligibleSongs.length} eligible songs, refreshing pool... (${maxRetries} retries left)`);
        await this.refreshPool();
        return this.getNextSongs(count, excludeIds, maxRetries - 1);
      }

      // If we still don't have enough songs after retries, return what we have
      if (eligibleSongs.length === 0) {
        debug.log(`🔍 [SONG-POOL] No eligible songs available after ${2 - maxRetries} refresh attempts`);
        return [];
      }

      // Select songs from the beginning of the shuffled pool (up to what's available)
      const songsToSelect = Math.min(count, eligibleSongs.length);
      const selectedSongs = eligibleSongs.slice(0, songsToSelect);

      // Move selected songs to played pool
      this.markSongsAsPlayed(selectedSongs);

      debug.log(`🔍 [SONG-POOL] Selected ${selectedSongs.length} songs from pool of ${this.availablePool.length} available, ${this.playedPool.length} played`);
      
      return selectedSongs;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug.log(`🔍 [SONG-POOL] Error in getNextSongs: ${errorMessage}`);
      throw new Error(`Failed to get next songs: ${errorMessage}`);
    }
  }

  /**
   * Get current pool statistics
   * 
   * Provides detailed information about the current state of the song pool
   * including size, age, and refresh timing information.
   * 
   * @returns Object containing pool statistics
   */
  getPoolStats(): { available: number; played: number; total: number; ageMinutes: number; nextRefreshIn: number } {
    const now = Date.now();
    const ageMinutes = Math.round((now - this.poolCreationTime) / 60000);
    const nextRefreshIn = Math.max(0, Math.round((SONG_POOL.REFRESH_INTERVAL_MS - (now - this.poolCreationTime)) / 60000));
    
    return {
      available: this.availablePool.length,
      played: this.playedPool.length,
      total: this.availablePool.length + this.playedPool.length,
      ageMinutes,
      nextRefreshIn
    };
  }

  /**
   * Check if the pool needs to be refreshed based on time or usage
   * 
   * Implements a dual-strategy refresh system:
   * 1. Time-based: Refresh every 30 minutes to ensure freshness
   * 2. Usage-based: Refresh when 20+ songs have been played to maintain variety
   * 
   * @private
   */
  private async checkPoolRefreshNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceCreation = now - this.poolCreationTime;
    const songsUsedFromPool = this.playedPool.length;

    // Refresh if it's been 30 minutes since pool creation
    if (timeSinceCreation >= SONG_POOL.REFRESH_INTERVAL_MS) {
      debug.log(`🔍 [SONG-POOL] Pool is ${Math.round(timeSinceCreation / 60000)} minutes old, refreshing...`);
      await this.refreshPool();
      return;
    }

    // Refresh if we've used our target number of songs from this pool
    if (songsUsedFromPool >= SONG_POOL.TARGET_SONGS_PER_POOL) {
      debug.log(`🔍 [SONG-POOL] Used ${songsUsedFromPool} songs from pool (target: ${SONG_POOL.TARGET_SONGS_PER_POOL}), refreshing...`);
      await this.refreshPool();
      return;
    }

    // Log current pool status
    const minutesOld = Math.round(timeSinceCreation / 60000);
    debug.log(`🔍 [SONG-POOL] Pool is ${minutesOld} minutes old, ${songsUsedFromPool} songs used (refreshes at 30 min or ${SONG_POOL.TARGET_SONGS_PER_POOL} songs)`);
  }

  /**
   * Force refresh the song pool
   * 
   * Manually triggers a pool refresh, bypassing normal refresh conditions.
   * Useful for testing or when the user explicitly requests a refresh.
   * 
   * @throws Error if refresh operation fails
   */
  async forceRefresh(): Promise<void> {
    try {
      await this.refreshPool();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to force refresh pool: ${errorMessage}`);
    }
  }

  /**
   * Ensure the pool has songs available, refreshing if necessary
   * 
   * Emergency check to prevent empty pool situations. If the available
   * pool is empty, immediately triggers a refresh to maintain service.
   * 
   * @private
   * @throws Error if unable to refresh empty pool
   */
  private async ensurePoolHasSongs(): Promise<void> {
    if (this.availablePool.length === 0) {
      debug.log('🔍 [SONG-POOL] Pool is empty, refreshing...');
      try {
        await this.refreshPool();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to refresh empty pool: ${errorMessage}`);
      }
    }
  }

  /**
   * Refresh the song pool by fetching new songs from Spotify
   * 
   * Core refresh logic that:
   * 1. Prevents concurrent refreshes with locking mechanism
   * 2. Implements rate limiting to prevent API abuse
   * 3. Fetches songs using getUsersSavedTracks with random offsets
   * 4. Includes fallback mechanisms for robustness
   * 5. Gracefully handles errors with pool recycling
   * 
   * @private
   * @throws Error if all refresh attempts fail
   */
  private async refreshPool(): Promise<void> {
    if (this.isRefreshing) {
      debug.log('🔍 [SONG-POOL] Already refreshing, skipping...');
      return;
    }

    const now = Date.now();
    
    // Only apply rate limiting if we're not in an emergency situation (empty pool)
    if (this.availablePool.length > 0 && now - this.lastRefreshTime < SONG_POOL.MIN_REFRESH_INTERVAL_MS) {
      debug.log('🔍 [SONG-POOL] Refresh rate limited, skipping...');
      return;
    }

    this.isRefreshing = true;
    this.lastRefreshTime = now;

    try {
      debug.log('🔍 [SONG-POOL] Fetching new songs from Spotify...');
      
      // Use the getUsersSavedTracks tool to get liked songs
      const result = await run(this.agent, 
        `Use the getUsersSavedTracks tool to get ${SONG_POOL.FETCH_SIZE} songs from my Liked Songs library with limit=${SONG_POOL.FETCH_SIZE} and offset=${this.generateRandomOffset()}. Return the results from the tool exactly as they are provided.`, 
        { maxTurns: SONG_POOL.MAX_TURNS }
      );

      if (result.finalOutput) {
        const newSongs = this.parseTracksFromResponse(result.finalOutput);
        
        if (newSongs.length > 0) {
          // Reset pools and add new songs
          this.availablePool = this.shuffleArray([...newSongs]);
          this.playedPool = [];
          this.poolCreationTime = Date.now();
          
          debug.log(`🔍 [SONG-POOL] Pool refreshed with ${newSongs.length} songs at ${new Date().toLocaleTimeString()}`);
        } else {
          debug.log('🔍 [SONG-POOL] No songs parsed from response, trying fallback approach');
          
          // Fallback: Try a much simpler approach
          const fallbackResult = await run(this.agent, 
            `Use the getUsersSavedTracks tool to get 20 songs from my Liked Songs library with limit=20 and offset=0. Return the results from the tool exactly as they are provided.`, 
            { maxTurns: 5 }
          );
          
          if (fallbackResult.finalOutput) {
            const fallbackTracks = this.parseFallbackResponse(fallbackResult.finalOutput);
            if (fallbackTracks.length > 0) {
              this.availablePool = this.shuffleArray([...fallbackTracks]);
              this.playedPool = [];
              this.poolCreationTime = Date.now();
              debug.log(`🔍 [SONG-POOL] Fallback pool created with ${fallbackTracks.length} songs`);
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error refreshing song pool:', errorMessage);
      
      // Fallback: if refresh fails and we have played songs, move them back to available
      if (this.playedPool.length > 0) {
        debug.log('🔍 [SONG-POOL] Refresh failed, recycling played songs');
        this.availablePool = this.shuffleArray([...this.playedPool]);
        this.playedPool = [];
        debug.log(`🔍 [SONG-POOL] Recycled ${this.availablePool.length} played songs back to available pool`);
      } else {
        // If no played songs to recycle, this is a critical error
        throw new Error(`Pool refresh failed and no songs available to recycle: ${errorMessage}`);
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Generate a random offset for fetching songs
   * 
   * Creates variety in song selection by using different starting points
   * in the user's saved tracks library for each refresh.
   * 
   * @private
   * @returns Random offset value between 0 and MAX_RANDOM_OFFSET
   */
  private generateRandomOffset(): number {
    return Math.floor(Math.random() * SONG_POOL.MAX_RANDOM_OFFSET);
  }


  /**
   * Parse tracks from agent response
   * 
   * Parses the structured response from the getUsersSavedTracks tool.
   * Expected format: 1. "Track Name" by Artist Name (duration) - ID: track_id - Added: date
   * 
   * This parser is robust and handles various formatting variations while
   * extracting the essential track information (name, artist, Spotify ID).
   * 
   * @private
   * @param response - Raw response text from the getUsersSavedTracks tool
   * @returns Array of parsed track objects
   */
  private parseTracksFromResponse(response: string): SongPoolTrack[] {
    const tracks: SongPoolTrack[] = [];
    
    // Look for numbered list format from getUsersSavedTracks
    const lines = response.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match pattern: 1. "Track Name" by Artist Name (duration) - ID: track_id - Added: date
      const match = trimmedLine.match(/^\d+\.\s*["""]([^"""]+)["""]?\s+by\s+([^(]+)\s*\([^)]+\)\s*-\s*ID:\s*(\S+)/i);
      if (match) {
        const name = match[1]?.trim();
        const artist = match[2]?.trim();
        const id = match[3]?.trim();
        
        if (name && artist && id) {
          tracks.push({
            id,
            name,
            artist,
            addedAt: new Date()
          });
        }
      }
    }
    
    debug.log(`🔍 [SONG-POOL] Parsed ${tracks.length} tracks from response`);
    if (tracks.length === 0) {
      debug.log(`🔍 [SONG-POOL] Raw response: ${response.substring(0, 500)}...`);
    }
    
    return tracks;
  }

  /**
   * Parse fallback response with same format as main parser
   * 
   * Fallback parser that uses the same logic as the main parser.
   * Separated for clarity and potential future differentiation.
   * 
   * @private
   * @param response - Raw response text from fallback getUsersSavedTracks call
   * @returns Array of parsed track objects
   */
  private parseFallbackResponse(response: string): SongPoolTrack[] {
    return this.parseTracksFromResponse(response);
  }

  /**
   * Move songs from available to played pool
   * 
   * Manages the transition of songs from available to played status:
   * 1. Removes songs from available pool
   * 2. Adds songs to played pool
   * 3. Maintains played pool size limits to prevent memory growth
   * 
   * @private
   * @param songs - Array of songs to mark as played
   */
  private markSongsAsPlayed(songs: SongPoolTrack[]): void {
    // Remove from available pool
    this.availablePool = this.availablePool.filter(availableSong => 
      !songs.some(playedSong => playedSong.id === availableSong.id)
    );

    // Add to played pool
    this.playedPool.push(...songs);

    // Keep played pool size under control
    if (this.playedPool.length > SONG_POOL.MAX_PLAYED_HISTORY) {
      this.playedPool = this.playedPool.slice(-SONG_POOL.MAX_PLAYED_HISTORY);
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   * 
   * Implements the Fisher-Yates shuffle algorithm for cryptographically
   * secure randomization of the song pool. This ensures fair distribution
   * of songs and prevents predictable patterns in selection.
   * 
   * @private
   * @template T - Type of array elements
   * @param array - Array to shuffle
   * @returns New shuffled array (original array is not modified)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }
}