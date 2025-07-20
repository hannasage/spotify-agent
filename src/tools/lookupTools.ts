/**
 * Lookup-focused tools for music information retrieval
 * 
 * Note: Most lookup functionality is handled directly by the MCP server tools
 * (search, library access, etc.). This file is reserved for future lookup-specific
 * tools that may be needed for information processing or analysis.
 */

import { BaseTool, createSuccessResult } from './base';
import { SystemContext, ToolResult } from './types';

/**
 * Tool to show song history
 */
export class ShowSongHistoryTool extends BaseTool {
  name = 'show-song-history';
  description = 'Display the recent song history (last 12 tracks added to queue)';

  async executeImpl(context: SystemContext): Promise<ToolResult> {
    context.queueMonitor.showSongHistory();
    return createSuccessResult('Song history displayed');
  }
}

/**
 * Tool to clear song history
 */
export class ClearSongHistoryTool extends BaseTool {
  name = 'clear-song-history';
  description = 'Clear all song history data';

  async executeImpl(context: SystemContext): Promise<ToolResult> {
    context.queueMonitor.clearSongHistory();
    return createSuccessResult('Song history cleared');
  }
}