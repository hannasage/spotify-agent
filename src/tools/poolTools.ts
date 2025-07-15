/**
 * Song pool management tools
 */

import { BaseTool, createSuccessResult, createErrorResult, validateAgents } from './base';
import { SystemContext, ToolResult } from './types';

/**
 * Tool to show song pool statistics
 */
export class ShowPoolStatsTool extends BaseTool {
  name = 'show_pool_stats';
  description = 'Display statistics about the current song pool including available songs, played songs, and refresh timing';

  protected async executeInternal(context: SystemContext): Promise<ToolResult> {
    const agentsCheck = validateAgents(context);
    if (agentsCheck) return agentsCheck;

    context.queueMonitor.showPoolStats(context.agents!);
    return createSuccessResult('Pool statistics displayed');
  }
}

/**
 * Tool to refresh the song pool
 */
export class RefreshPoolTool extends BaseTool {
  name = 'refresh_pool';
  description = 'Force refresh the song pool by fetching new songs from Spotify';

  protected async executeInternal(context: SystemContext): Promise<ToolResult> {
    const agentsCheck = validateAgents(context);
    if (agentsCheck) return agentsCheck;

    try {
      await context.queueMonitor.refreshSongPool(context.agents!);
      return createSuccessResult('✅ Pool refreshed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to refresh song pool: ${errorMessage}`);
    }
  }
}