/**
 * Application constants and configuration values
 */

// Auto-queue system configuration
export const AUTO_QUEUE = {
  /** Number of songs to add per auto-queue cycle */
  SONGS_PER_BATCH: 4,
  /** Interval between auto-queue cycles in milliseconds (10 minutes) */
  INTERVAL_MS: 600000,
  /** Maximum number of songs to fetch from Spotify for random selection */
  FETCH_LIMIT: 50,
  /** Maximum random offset for song selection */
  MAX_RANDOM_OFFSET: 400,
  /** Maximum turns for primary agent attempt */
  MAX_TURNS_PRIMARY: 15,
  /** Maximum turns for fallback agent attempt */
  MAX_TURNS_FALLBACK: 8,
} as const;

// Song pool configuration
export const SONG_POOL = {
  /** Number of songs to fetch per pool refresh (Spotify API limit is 50) */
  FETCH_SIZE: 50,
  /** Maximum random offset for fetching songs */
  MAX_RANDOM_OFFSET: 500,
  /** Maximum turns allowed for pool refresh */
  MAX_TURNS: 8,
  /** Pool refresh interval (30 minutes) */
  REFRESH_INTERVAL_MS: 1800000,
  /** Minimum time between pool refreshes (prevents rapid refreshes) */
  MIN_REFRESH_INTERVAL_MS: 300000,
  /** Maximum number of played songs to remember */
  MAX_PLAYED_HISTORY: 50,
  /** Target songs to use from each pool before refresh */
  TARGET_SONGS_PER_POOL: 20,
} as const;

// Song history configuration
export const SONG_HISTORY = {
  /** Maximum number of songs to track in history */
  MAX_SIZE: 12,
  /** File name for persistent history storage */
  FILE_NAME: 'song-history.json',
} as const;

// Conversation session configuration
export const CONVERSATION = {
  /** Maximum number of conversation exchanges to keep */
  MAX_HISTORY_SIZE: 20,
} as const;

// UI configuration
export const UI = {
  /** Application title displayed in banner */
  APP_TITLE: 'SPOTIFY AGENT',
  /** Default spinner configuration */
  SPINNER: {
    TYPE: 'dots' as const,
    COLOR: 'cyan' as const,
  },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  MISSING_OPENAI_KEY: 'Please set your OPENAI_API_KEY environment variable',
  MISSING_SPOTIFY_PATH: 'Please set your SPOTIFY_MCP_PATH environment variable',
  MAX_TURNS_EXCEEDED: 'Max turns exceeded',
  QUEUE_MONITOR_FAILED: 'Auto-queue failed - will retry at next interval',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  AUTO_QUEUE_STARTED: `🎯 Auto-queue monitor started! Will add ${AUTO_QUEUE.SONGS_PER_BATCH} songs every ${AUTO_QUEUE.INTERVAL_MS / 60000} minutes.`,
  AUTO_QUEUE_STOPPED: '🛑 Auto-queue monitor stopped.',
  DEBUG_ENABLED: '🔍 Debug mode enabled',
  HISTORY_CLEARED: '🎵 Song history cleared',
} as const;