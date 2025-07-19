/**
 * Tool registry for managing all available system tools
 */

import { SystemTool } from './types';
import { StartAutoQueueTool, StopAutoQueueTool, AutoQueueStatusTool, ShowPoolStatsTool, RefreshPoolTool } from './playbackTools';
import { ShowSongHistoryTool, ClearSongHistoryTool } from './lookupTools';
import { ShowHelpTool, ClearConversationTool, ShowConversationHistoryTool, ShowAgentStatusTool } from './systemTools';

/**
 * Registry of all available system tools
 */
export class ToolRegistry {
  private tools: Map<string, SystemTool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  /**
   * Register all default system tools
   */
  private registerDefaultTools(): void {
    // Playback tools
    this.register(new StartAutoQueueTool());
    this.register(new StopAutoQueueTool());
    this.register(new AutoQueueStatusTool());
    this.register(new ShowPoolStatsTool());
    this.register(new RefreshPoolTool());

    // Lookup tools
    this.register(new ShowSongHistoryTool());
    this.register(new ClearSongHistoryTool());

    // System tools
    this.register(new ShowHelpTool());
    this.register(new ClearConversationTool());
    this.register(new ShowConversationHistoryTool());
    this.register(new ShowAgentStatusTool());
  }

  /**
   * Register a new tool
   */
  register(tool: SystemTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): SystemTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): SystemTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names for agent instructions
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool descriptions for agent context
   */
  getToolDescriptions(): string {
    return this.getAllTools()
      .map(tool => `- ${tool.name}: ${tool.description}`)
      .join('\n');
  }
}

/**
 * Global tool registry instance
 */
export const toolRegistry = new ToolRegistry();