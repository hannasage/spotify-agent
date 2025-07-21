import { CustomTraceProcessor, createCustomTraceProcessor } from './traceProcessor';

/**
 * Trace integration utilities for the Spotify agent system
 * 
 * This module provides utilities to integrate custom trace processing
 * with the agent system for debugging and monitoring purposes.
 * Now uses a single file per session approach for better organization.
 */
export class TraceIntegration {
  private traceProcessor: CustomTraceProcessor;

  constructor(tracesDir?: string) {
    this.traceProcessor = createCustomTraceProcessor(tracesDir);
  }

  /**
   * Initialize trace processing for the agent system
   */
  async initialize(): Promise<void> {
    console.log('Initializing trace processing...');
    console.log(this.traceProcessor.getInfo());
    console.log(`Session ID: ${this.traceProcessor.getSessionId()}`);
    console.log(`Trace file: ${this.traceProcessor.getCurrentTraceFile()}`);
    
    // Show current trace statistics
    const stats = this.traceProcessor.getTraceStats();
    console.log(`Total trace files: ${stats.totalFiles} files, ${(stats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`Current session: ${stats.currentSession.traceCount} traces, ${(stats.currentSession.fileSize / 1024).toFixed(2)} KB`);
  }

  /**
   * Process a trace event from the agent system
   * 
   * @param event - The trace event to process
   */
  async processTraceEvent(event: any): Promise<void> {
    await this.traceProcessor.processTrace(event);
  }

  /**
   * Get trace statistics
   */
  getStats() {
    return this.traceProcessor.getTraceStats();
  }

  /**
   * Get current session information
   */
  getCurrentSession() {
    return {
      sessionId: this.traceProcessor.getSessionId(),
      traceFile: this.traceProcessor.getCurrentTraceFile(),
      stats: this.traceProcessor.getCurrentSessionStats()
    };
  }

  /**
   * Clean up old trace files
   * 
   * @param maxAgeInDays - Maximum age of trace files to keep
   */
  async cleanupOldTraces(maxAgeInDays: number = 7): Promise<void> {
    await this.traceProcessor.cleanupOldTraces(maxAgeInDays);
  }

  /**
   * Flush current traces to file (useful before shutdown)
   */
  async flush(): Promise<void> {
    await this.traceProcessor.flush();
  }

  /**
   * Get information about the trace integration
   */
  getInfo(): string {
    return this.traceProcessor.getInfo();
  }
}

/**
 * No-op trace integration that provides the same interface but does nothing
 * Used when --no-trace flag is enabled for performance during development
 */
export class NoOpTraceIntegration {
  /**
   * Initialize trace processing (no-op)
   */
  async initialize(): Promise<void> {
    // No-op: Skip trace initialization
  }

  /**
   * Process a trace event (no-op)
   */
  async processTraceEvent(_event: any): Promise<void> {
    // No-op: Skip trace processing
  }

  /**
   * Get trace statistics (returns empty stats)
   */
  getStats() {
    return {
      totalFiles: 0,
      totalSize: 0,
      oldestFile: undefined,
      newestFile: undefined,
      currentSession: {
        sessionId: 'no-trace-session',
        traceCount: 0,
        fileSize: 0
      }
    };
  }

  /**
   * Get current session information (returns minimal data)
   */
  getCurrentSession() {
    return {
      sessionId: 'no-trace-session',
      traceFile: 'traces-disabled',
      stats: {
        traceCount: 0,
        fileSize: 0
      }
    };
  }

  /**
   * Clean up old trace files (no-op)
   */
  async cleanupOldTraces(_maxAgeInDays: number = 7): Promise<void> {
    // No-op: No files to clean up
  }

  /**
   * Flush current traces to file (no-op)
   */
  async flush(): Promise<void> {
    // No-op: Nothing to flush
  }

  /**
   * Get information about the trace integration
   */
  getInfo(): string {
    return 'No-op trace integration (tracing disabled with --no-trace flag)';
  }
}

/**
 * Factory function to create trace integration
 * 
 * @param tracesDir - Directory to save traces (default: /data/traces)
 * @param enableTracing - Whether to enable tracing (default: true)
 * @returns TraceIntegration instance or NoOpTraceIntegration if tracing is disabled
 */
export function createTraceIntegration(tracesDir?: string, enableTracing: boolean = true): TraceIntegration | NoOpTraceIntegration {
  if (!enableTracing) {
    return new NoOpTraceIntegration();
  }
  return new TraceIntegration(tracesDir);
}

/**
 * Example usage of trace integration with agent events
 * 
 * This function demonstrates how to integrate trace processing
 * with agent events in your application.
 */
export async function exampleTraceUsage(): Promise<void> {
  const traceIntegration = createTraceIntegration();
  
  await traceIntegration.initialize();
  
  // Example: Process a trace event
  const exampleEvent = {
    id: 'example-trace-123',
    type: 'agent_action',
    data: {
      agent: 'playback',
      action: 'play_track',
      track: 'Bohemian Rhapsody',
      timestamp: new Date().toISOString()
    }
  };
  
  await traceIntegration.processTraceEvent(exampleEvent);
  
  // Show updated statistics
  const stats = traceIntegration.getStats();
  console.log(`Current session: ${stats.currentSession.traceCount} traces`);
} 