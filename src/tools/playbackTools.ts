/**
 * Playback-focused tools for music control and queue management
 */

import { BaseTool, createSuccessResult, createErrorResult, validateAgents } from './base';
import { SystemContext, ToolResult } from './types';

/**
 * Tool to start the automatic queue monitoring system
 */
export class StartAutoQueueTool extends BaseTool {
  name = 'start-auto-queue';
  description = 'Start the automatic queue monitoring system that adds songs every 10 minutes';

  async executeImpl(context: SystemContext): Promise<ToolResult> {
    const agentValidation = validateAgents(context.agents);
    if (agentValidation) {
      return agentValidation;
    }

    if (context.queueMonitor.isRunning()) {
      return createErrorResult('Auto-queue system is already running');
    }

    context.queueMonitor.start(context.agents!);
    return createSuccessResult('Auto-queue system started! Will add 4 songs every 10 minutes.');
  }
}

/**
 * Tool to stop the automatic queue monitoring system
 */
export class StopAutoQueueTool extends BaseTool {
  name = 'stop-auto-queue';
  description = 'Stop the automatic queue monitoring system';

  async executeImpl(context: SystemContext): Promise<ToolResult> {
    if (!context.queueMonitor.isRunning()) {
      return createErrorResult('Auto-queue system is not currently running');
    }

    context.queueMonitor.stop();
    return createSuccessResult('Auto-queue system stopped.');
  }
}

/**
 * Tool to check the status of the automatic queue monitoring system
 */
export class AutoQueueStatusTool extends BaseTool {
  name = 'auto-queue-status';
  description = 'Check the current status of the automatic queue monitoring system';

  async executeImpl(context: SystemContext): Promise<ToolResult> {
    const isRunning = context.queueMonitor.isRunning();
    const status = isRunning ? 'ACTIVE' : 'INACTIVE';
    const message = `Auto-queue system is currently ${status}`;
    
    return createSuccessResult(message);
  }
}

/**
 * Tool to show song pool statistics
 */
export class ShowPoolStatsTool extends BaseTool {
  name = 'show-pool-stats';
  description = 'Display statistics about the song pool used for auto-queue';

  async executeImpl(context: SystemContext): Promise<ToolResult> {
    const agentValidation = validateAgents(context.agents);
    if (agentValidation) {
      return agentValidation;
    }

    try {
      context.queueMonitor.showPoolStats(context.agents!);
      return createSuccessResult('Pool statistics displayed');
    } catch (error) {
      return createErrorResult(`Failed to show pool stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Tool to refresh the song pool
 */
export class RefreshPoolTool extends BaseTool {
  name = 'refresh-pool';
  description = 'Manually refresh the song pool from Spotify';

  async executeImpl(context: SystemContext): Promise<ToolResult> {
    const agentValidation = validateAgents(context.agents);
    if (agentValidation) {
      return agentValidation;
    }

    try {
      await context.queueMonitor.refreshSongPool(context.agents!);
      return createSuccessResult('Song pool refreshed successfully');
    } catch (error) {
      return createErrorResult(`Failed to refresh pool: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}