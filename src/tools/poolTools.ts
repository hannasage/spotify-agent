/**
 * Song pool management tools
 */

import { BaseTool, createSuccessResult, createErrorResult } from './base';
import { SystemContext, ToolResult } from './types';

/**
 * Tool to show song pool statistics
 */
export class ShowPoolStatsTool extends BaseTool {
  name = 'show_pool_stats';
  description = 'Display statistics about the current song pool including available songs, played songs, and refresh timing';

  protected async executeInternal(context: SystemContext): Promise<ToolResult> {
    if (!context.orchestratorConfig) {
      return createErrorResult('System not ready - agents are still initializing. Please wait a moment and try again.');
    }

    // Create legacy agent config for queue monitor compatibility
    const legacyAgents = {
      spotify: context.orchestratorConfig.agents.search,
      queue: context.orchestratorConfig.agents.queue
    };

    context.queueMonitor.showPoolStats(legacyAgents);
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
    if (!context.orchestratorConfig) {
      return createErrorResult('System not ready - agents are still initializing. Please wait a moment and try again.');
    }

    // Create legacy agent config for queue monitor compatibility
    const legacyAgents = {
      spotify: context.orchestratorConfig.agents.search,
      queue: context.orchestratorConfig.agents.queue
    };

    try {
      await context.queueMonitor.refreshSongPool(legacyAgents);
      return createSuccessResult('✅ Pool refreshed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to refresh song pool: ${errorMessage}`);
    }
  }
}