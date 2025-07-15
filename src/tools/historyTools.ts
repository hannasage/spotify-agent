/**
 * Song history management tools
 */

import { BaseTool, createSuccessResult } from './base';
import { SystemContext, ToolResult } from './types';

/**
 * Tool to show song history
 */
export class ShowSongHistoryTool extends BaseTool {
  name = 'show_song_history';
  description = 'Display the recent song history (last 12 tracks that were added to the queue)';

  protected async executeInternal(context: SystemContext): Promise<ToolResult> {
    context.queueMonitor.showSongHistory();
    return createSuccessResult('Song history displayed');
  }
}

/**
 * Tool to clear song history
 */
export class ClearSongHistoryTool extends BaseTool {
  name = 'clear_song_history';
  description = 'Clear all song history data';

  protected async executeInternal(context: SystemContext): Promise<ToolResult> {
    context.queueMonitor.clearSongHistory();
    return createSuccessResult('🎵 Song history cleared');
  }
}