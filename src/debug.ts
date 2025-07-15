/**
 * Debug utility to control debug output based on command line flags
 */
class DebugManager {
  private static instance: DebugManager;
  private debugEnabled: boolean = false;

  private constructor() {
    // Check for debug flags in command line arguments
    const args = process.argv.slice(2);
    this.debugEnabled = args.includes('--debug') || args.includes('-d');
  }

  public static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  public isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  public log(message: string, ...args: any[]): void {
    if (this.debugEnabled) {
      console.log(message, ...args);
    }
  }

  public error(message: string, ...args: any[]): void {
    if (this.debugEnabled) {
      console.error(message, ...args);
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (this.debugEnabled) {
      console.warn(message, ...args);
    }
  }
}

// Export singleton instance
export const debug = DebugManager.getInstance();