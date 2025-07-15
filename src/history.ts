import * as fs from 'fs';
import * as path from 'path';
import { debug } from './debug';
import { HistoryTrack } from './types';
import { SONG_HISTORY } from './constants';

/**
 * Manages song history to prevent repetition in auto-queue
 */
export class SongHistoryTracker {
  private history: HistoryTrack[] = [];
  private readonly maxSize = SONG_HISTORY.MAX_SIZE;
  private readonly historyFile = path.join(process.cwd(), SONG_HISTORY.FILE_NAME);

  constructor() {
    this.loadFromFile();
  }

  /**
   * Add tracks to history (newest first)
   * @param tracks - Array of tracks to add to history
   */
  addTracks(tracks: HistoryTrack[]): void {
    // Add new tracks to the beginning
    this.history.unshift(...tracks);
    
    // Keep only the most recent maxSize tracks
    this.history = this.history.slice(0, this.maxSize);
    
    // Save to file
    this.saveToFile();
  }

  /**
   * Get recent tracks (up to maxSize)
   * @returns Copy of current history array
   */
  getRecentTracks(): HistoryTrack[] {
    return [...this.history];
  }

  /**
   * Get formatted avoid list for agent prompt
   * @returns Comma-separated string of tracks to avoid
   */
  getAvoidList(): string {
    if (this.history.length === 0) return '';
    
    const avoidList = this.history
      .map(track => `"${track.name}" by ${track.artist}`)
      .join(', ');
    
    debug.log(`🔍 [HISTORY DEBUG] Avoiding ${this.history.length} tracks: ${avoidList}`);
    
    return avoidList;
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];
    this.saveToFile();
  }

  /**
   * Get current history size
   * @returns Number of tracks in history
   */
  getHistorySize(): number {
    return this.history.length;
  }

  /**
   * Parse agent response to extract track information
   * @param response - Agent response text containing track information
   * @returns Array of parsed tracks with timestamps
   */
  parseTracksFromResponse(response: string): HistoryTrack[] {
    const tracks: HistoryTrack[] = [];
    const timestamp = new Date();
    
    // Look for patterns like:
    // 1. "Song Name" by Artist Name
    // 1. **"Song Name"** by **Artist Name**
    // "Song Name" by Artist Name
    const trackRegex = /(?:\d+\.\s+)?(?:\*\*)?[""]([^"""]+)[""](?:\*\*)?\s+by\s+(?:\*\*)?([^\n,*]+?)(?:\*\*)?(?:\s|$)/g;
    let match;
    
    while ((match = trackRegex.exec(response)) !== null) {
      const name = match[1]?.trim();
      const artist = match[2]?.trim();
      
      if (name && artist) {
        tracks.push({
          name,
          artist,
          timestamp
        });
      }
    }
    
    debug.log(`🔍 [HISTORY DEBUG] Parsed ${tracks.length} tracks from response:`, tracks.map(t => `"${t.name}" by ${t.artist}`));
    debug.log(`🔍 [HISTORY DEBUG] Raw response text:`, response);
    
    return tracks;
  }

  /**
   * Save history to file
   * @private
   */
  private saveToFile(): void {
    try {
      const data = JSON.stringify(this.history, null, 2);
      fs.writeFileSync(this.historyFile, data);
    } catch (error) {
      console.error('Error saving song history:', error);
    }
  }

  /**
   * Load history from file
   * @private
   */
  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        const parsed = JSON.parse(data);
        
        // Convert timestamp strings back to Date objects
        this.history = parsed.map((track: any) => ({
          ...track,
          timestamp: new Date(track.timestamp)
        }));
        
        // Ensure we don't exceed maxSize
        this.history = this.history.slice(0, this.maxSize);
      }
    } catch (error) {
      console.error('Error loading song history:', error);
      this.history = [];
    }
  }
}