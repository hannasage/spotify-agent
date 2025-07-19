import * as fs from 'fs';
import * as path from 'path';
import { debug } from '../debug';

/**
 * Custom trace processor that saves traces to a single file per run
 * 
 * This processor saves all trace data for a session to one JSON file
 * in a structured format for debugging and analysis.
 */
export class CustomTraceProcessor {
  private tracesDir: string;
  private currentTraceFile: string;
  private traces: any[] = [];
  private sessionId: string;

  constructor(tracesDir: string = '/data/traces') {
    this.tracesDir = tracesDir;
    this.sessionId = this.generateSessionId();
    this.currentTraceFile = this.getTraceFileName();
    this.ensureTracesDirectory();
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
   * Ensure the traces directory exists
   */
  private ensureTracesDirectory(): void {
    try {
      if (!fs.existsSync(this.tracesDir)) {
        fs.mkdirSync(this.tracesDir, { recursive: true });
        console.log(`Created traces directory: ${this.tracesDir}`);
      }
    } catch (error) {
      console.error(`Failed to create traces directory ${this.tracesDir}:`, error);
    }
  }

  /**
   * Write traces to file
   */
  private writeTracesToFile(): void {
    try {
      const filepath = path.join(this.tracesDir, this.currentTraceFile);
      const traceData = {
        sessionId: this.sessionId,
        sessionStartTime: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalTraces: this.traces.length,
        traces: this.traces,
        metadata: {
          processor: 'CustomTraceProcessor',
          version: '1.0.0',
          format: 'single_file_per_session'
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
    return `CustomTraceProcessor - Saves traces to ${this.tracesDir} (${this.traces.length} traces in current session)`;
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get the current trace file name
   */
  getCurrentTraceFile(): string {
    return this.currentTraceFile;
  }

  /**
   * Get current session statistics
   */
  getCurrentSessionStats(): { sessionId: string; traceCount: number; fileSize: number } {
    try {
      const filepath = path.join(this.tracesDir, this.currentTraceFile);
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
      const files = fs.readdirSync(this.tracesDir);
      const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filepath = path.join(this.tracesDir, file);
        const stats = fs.statSync(filepath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filepath);
          console.log(`Deleted old trace file: ${file}`);
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
      const files = fs.readdirSync(this.tracesDir);
      let totalSize = 0;
      let oldestFile: string | undefined;
      let newestFile: string | undefined;
      let oldestTime = Date.now();
      let newestTime = 0;

      for (const file of files) {
        const filepath = path.join(this.tracesDir, file);
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