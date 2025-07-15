/**
 * Debug utility to control debug output based on command line flags
 * 
 * This singleton class provides centralized debug logging functionality
 * that can be enabled/disabled via command line arguments. It supports
 * different log levels (log, error, warn) and only outputs when debug
 * mode is explicitly enabled.
 * 
 * Usage: node index.js --debug  or  node index.js -d
 * 
 * @example
 * ```typescript
 * import { debug } from './debug';
 * debug.log('This will only show if --debug flag is used');
 * debug.error('Error message with debug info');
 * ```
 */
class DebugManager {
  private static instance: DebugManager;
  private debugEnabled: boolean = false;

  /**
   * Private constructor to enforce singleton pattern
   * Checks command line arguments for debug flags
   */
  private constructor() {
    // Check for debug flags in command line arguments
    const args = process.argv.slice(2);
    this.debugEnabled = args.includes('--debug') || args.includes('-d');
  }

  /**
   * Get the singleton instance of DebugManager
   * @returns The singleton DebugManager instance
   */
  public static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  /**
   * Check if debug mode is currently enabled
   * @returns True if debug mode is enabled
   */
  public isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  /**
   * Log a debug message (only if debug mode is enabled)
   * @param message - The message to log
   * @param args - Additional arguments to pass to console.log
   */
  public log(message: string, ...args: any[]): void {
    if (this.debugEnabled) {
      console.log(message, ...args);
    }
  }

  /**
   * Log a debug error message (only if debug mode is enabled)
   * @param message - The error message to log
   * @param args - Additional arguments to pass to console.error
   */
  public error(message: string, ...args: any[]): void {
    if (this.debugEnabled) {
      console.error(message, ...args);
    }
  }

  /**
   * Log a debug warning message (only if debug mode is enabled)
   * @param message - The warning message to log
   * @param args - Additional arguments to pass to console.warn
   */
  public warn(message: string, ...args: any[]): void {
    if (this.debugEnabled) {
      console.warn(message, ...args);
    }
  }
}

/**
 * Singleton instance of the debug manager
 * 
 * This is the main export that should be used throughout the application
 * for all debug logging needs. It automatically handles debug mode detection
 * and provides consistent logging behavior across the entire codebase.
 * 
 * @example
 * ```typescript
 * import { debug } from './debug';
 * debug.log('Song pool refreshed with', songCount, 'songs');
 * ```
 */
export const debug = DebugManager.getInstance();