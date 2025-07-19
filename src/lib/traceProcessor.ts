import * as fs from 'fs';
import * as path from 'path';
import { debug } from '../debug';
import { APP_METADATA } from '../constants';

/**
 * Custom trace processor that saves traces to a single file per run
 * 
 * This processor saves all trace data for a session to one JSON file
 * in a structured format for debugging and analysis.
 */
export class CustomTraceProcessor {
  private baseTracesDir: string;
  private versionTracesDir: string;
  private currentTraceFile: string;
  private traces: any[] = [];
  private sessionId: string;
  private version: string;

  constructor(tracesDir: string = './data/traces') {
    this.baseTracesDir = tracesDir;
    this.version = APP_METADATA.VERSION;
    this.versionTracesDir = path.join(this.baseTracesDir, this.version);
    this.sessionId = this.generateSessionId();
    this.currentTraceFile = this.getTraceFileName();
    this.ensureVersionTracesDirectory();
  }

  /**
   * Generate a unique session ID for this run
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the trace file name for this session
   */
  private getTraceFileName(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `trace-${timestamp}-${this.sessionId}.json`;
  }

  /**
   * Ensure the version-specific traces directory exists
   */
  private ensureVersionTracesDirectory(): void {
    try {
      // Create base traces directory if it doesn't exist
      if (!fs.existsSync(this.baseTracesDir)) {
        fs.mkdirSync(this.baseTracesDir, { recursive: true });
        console.log(`Created base traces directory: ${this.baseTracesDir}`);
      }
      
      // Create version-specific directory if it doesn't exist
      if (!fs.existsSync(this.versionTracesDir)) {
        fs.mkdirSync(this.versionTracesDir, { recursive: true });
        console.log(`Created version traces directory: ${this.versionTracesDir}`);
      }
    } catch (error) {
      console.error(`Failed to create traces directory ${this.versionTracesDir}:`, error);
    }
  }

  /**
   * Write traces to file in version-specific directory
   */
  private writeTracesToFile(): void {
    try {
      const filepath = path.join(this.versionTracesDir, this.currentTraceFile);
      const traceData = {
        sessionId: this.sessionId,
        sessionStartTime: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalTraces: this.traces.length,
        traces: this.traces,
        metadata: {
          processor: 'CustomTraceProcessor',
          version: this.version,
          format: 'single_file_per_session',
          appVersion: this.version
        }
      };

      fs.writeFileSync(filepath, JSON.stringify(traceData, null, 2));
    } catch (error) {
      console.error('Failed to write traces to file:', error);
    }
  }

  /**
   * Process a trace event and add it to the current session
   * 
   * @param trace - The trace data to process
   */
  async processTrace(trace: any): Promise<void> {
    try {
      // Add trace to the array
      const traceEntry = {
        id: trace.id || this.generateTraceId(),
        timestamp: new Date().toISOString(),
        type: trace.type,
        data: trace.data || trace,
        sessionId: this.sessionId
      };

      this.traces.push(traceEntry);
      
      // Write updated traces to file
      this.writeTracesToFile();
      
      debug.log(`Trace added to session: ${traceEntry.type} (${this.traces.length} total)`);
    } catch (error) {
      console.error('Failed to process trace:', error);
    }
  }

  /**
   * Generate a unique trace ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get information about the trace processor
   */
  getInfo(): string {
    return `CustomTraceProcessor v${this.version} - Saves traces to ${this.versionTracesDir} (${this.traces.length} traces in current session)`;
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get the current trace file path (including version directory)
   */
  getCurrentTraceFile(): string {
    return path.join(this.versionTracesDir, this.currentTraceFile);
  }

  /**
   * Get the current version
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Get the version-specific traces directory
   */
  getVersionTracesDir(): string {
    return this.versionTracesDir;
  }

  /**
   * Get current session statistics
   */
  getCurrentSessionStats(): { sessionId: string; traceCount: number; fileSize: number } {
    try {
      const filepath = path.join(this.versionTracesDir, this.currentTraceFile);
      const stats = fs.statSync(filepath);
      return {
        sessionId: this.sessionId,
        traceCount: this.traces.length,
        fileSize: stats.size
      };
    } catch (error) {
      return {
        sessionId: this.sessionId,
        traceCount: this.traces.length,
        fileSize: 0
      };
    }
  }

  /**
   * Clean up old trace files
   * 
   * @param maxAgeInDays - Maximum age of trace files to keep
   */
  async cleanupOldTraces(maxAgeInDays: number = 7): Promise<void> {
    try {
      // Clean up files in the current version directory
      if (fs.existsSync(this.versionTracesDir)) {
        const files = fs.readdirSync(this.versionTracesDir);
        const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);

        for (const file of files) {
          const filepath = path.join(this.versionTracesDir, file);
          const stats = fs.statSync(filepath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filepath);
            console.log(`Deleted old trace file: ${file} (${this.version})`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old traces:', error);
    }
  }

  /**
   * Get statistics about stored traces
   */
  getTraceStats(): { totalFiles: number; totalSize: number; oldestFile?: string; newestFile?: string; currentSession: { sessionId: string; traceCount: number; fileSize: number } } {
    try {
      let totalSize = 0;
      let oldestFile: string | undefined;
      let newestFile: string | undefined;
      let oldestTime = Date.now();
      let newestTime = 0;
      let files: string[] = [];

      // Get files from current version directory
      if (fs.existsSync(this.versionTracesDir)) {
        files = fs.readdirSync(this.versionTracesDir);
      }

      for (const file of files) {
        const filepath = path.join(this.versionTracesDir, file);
        const stats = fs.statSync(filepath);
        
        totalSize += stats.size;
        
        if (stats.mtime.getTime() < oldestTime) {
          oldestTime = stats.mtime.getTime();
          oldestFile = file;
        }
        
        if (stats.mtime.getTime() > newestTime) {
          newestTime = stats.mtime.getTime();
          newestFile = file;
        }
      }

      return {
        totalFiles: files.length,
        totalSize,
        ...(oldestFile && { oldestFile }),
        ...(newestFile && { newestFile }),
        currentSession: this.getCurrentSessionStats()
      };
    } catch (error) {
      console.error('Failed to get trace stats:', error);
      return { 
        totalFiles: 0, 
        totalSize: 0,
        currentSession: this.getCurrentSessionStats()
      };
    }
  }

  /**
   * Force write current traces to file (useful for cleanup)
   */
  async flush(): Promise<void> {
    this.writeTracesToFile();
  }
}

/**
 * Factory function to create a custom trace processor
 * 
 * @param tracesDir - Directory to save traces (default: /data/traces)
 * @returns CustomTraceProcessor instance
 */
export function createCustomTraceProcessor(tracesDir?: string): CustomTraceProcessor {
  return new CustomTraceProcessor(tracesDir);
} 