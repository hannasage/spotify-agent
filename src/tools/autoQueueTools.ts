/**
 * Auto-queue management tools
 */

import { BaseTool, createSuccessResult, validateAgents } from './base';
import { SystemContext, ToolResult } from './types';

/**
 * Tool to start the auto-queue system
 */
export class StartAutoQueueTool extends BaseTool {
  name = 'start_auto_queue';
  description = 'Start the automatic queue monitoring system that adds songs every 10 minutes';

  protected async executeInternal(context: SystemContext): Promise<ToolResult> {
    const agentsCheck = validateAgents(context);
    if (agentsCheck) return agentsCheck;

    if (context.queueMonitor.isRunning()) {
      return createSuccessResult('Auto-queue is already running');
    }

    context.queueMonitor.start(context.agents!);
    return createSuccessResult('🎯 Auto-queue monitor started! Will add 4 songs every 10 minutes.');
  }
}

/**
 * Tool to stop the auto-queue system
 */
export class StopAutoQueueTool extends BaseTool {
  name = 'stop_auto_queue';
  description = 'Stop the automatic queue monitoring system';

  protected async executeInternal(context: SystemContext): Promise<ToolResult> {
    if (!context.queueMonitor.isRunning()) {
      return createSuccessResult('Auto-queue is not currently running');
    }

    context.queueMonitor.stop();
    return createSuccessResult('🛑 Auto-queue monitor stopped.');
  }
}

/**
 * Tool to check auto-queue status
 */
export class AutoQueueStatusTool extends BaseTool {
  name = 'auto_queue_status';
  description = 'Check if the auto-queue system is currently running';

  protected async executeInternal(context: SystemContext): Promise<ToolResult> {
    const isRunning = context.queueMonitor.isRunning();
    const status = isRunning ? 'ACTIVE' : 'INACTIVE';
    return createSuccessResult(`🤖 Auto-queue monitor: ${status}`);
  }
}