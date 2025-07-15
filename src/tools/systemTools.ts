/**
 * System management and utility tools
 */

import { BaseTool, createSuccessResult } from './base';
import { SystemContext, ToolResult } from './types';

/**
 * Tool to show help information
 */
export class ShowHelpTool extends BaseTool {
  name = 'show_help';
  description = 'Display help information about available commands and system usage';

  protected async executeInternal(context: SystemContext): Promise<ToolResult> {
    context.ui.showHelp();
    return createSuccessResult('Help information displayed');
  }
}

/**
 * Tool to clear conversation history
 */
export class ClearConversationTool extends BaseTool {
  name = 'clear_conversation';
  description = 'Clear the conversation history and start fresh';

  protected async executeInternal(context: SystemContext): Promise<ToolResult> {
    context.conversation.clearHistory();
    return createSuccessResult('Conversation history cleared. Starting fresh conversation.');
  }
}

/**
 * Tool to show conversation history count
 */
export class ShowConversationHistoryTool extends BaseTool {
  name = 'show_conversation_history';
  description = 'Show the number of messages in the current conversation history';

  protected async executeInternal(context: SystemContext): Promise<ToolResult> {
    const count = context.conversation.getMessageCount();
    return createSuccessResult(`Conversation has ${count} messages in history.`);
  }
}

/**
 * Tool to show agent system status
 */
export class ShowAgentStatusTool extends BaseTool {
  name = 'show_agent_status';
  description = 'Display the status of the multi-agent system including available agents and auto-queue status';

  protected async executeInternal(context: SystemContext): Promise<ToolResult> {
    const autoQueueStatus = context.queueMonitor.isRunning() ? 'ACTIVE' : 'INACTIVE';
    
    const statusMessage = `Multi-agent system status:
🎵 Spotify Assistant: Handles user interaction and music control
🎯 Queue Manager: Specializes in music curation and recommendations  
💬 Communication: Agents coordinate via handoffs for seamless experience
🤖 Auto-queue monitor: ${autoQueueStatus}`;

    context.ui.showInfo(statusMessage);
    return createSuccessResult('Agent system status displayed');
  }
}