import { ConversationMessage } from './types';
import { CONVERSATION } from './constants';

/**
 * Manages conversation history for context-aware interactions
 * 
 * This class handles the storage and retrieval of conversation messages
 * between the user and the AI assistant, maintaining context for more
 * intelligent responses while respecting memory limits.
 * 
 * @example
 * ```typescript
 * const session = new ConversationSession();
 * session.addUserMessage("play some jazz");
 * session.addAssistantMessage("I'll play some jazz music for you");
 * const context = session.getFormattedHistory();
 * ```
 */
export class ConversationSession {
  private messages: ConversationMessage[] = [];
  private readonly maxHistorySize = CONVERSATION.MAX_HISTORY_SIZE;

  /**
   * Add a user message to the conversation history
   * @param content - The message content from the user
   */
  addUserMessage(content: string): void {
    this.messages.push({
      role: 'user',
      content,
      timestamp: new Date()
    });
    this.trimHistory();
  }

  /**
   * Add an assistant message to the conversation history
   * @param content - The response content from the assistant
   */
  addAssistantMessage(content: string): void {
    this.messages.push({
      role: 'assistant',
      content,
      timestamp: new Date()
    });
    this.trimHistory();
  }

  /**
   * Get formatted conversation history for agent context
   * @returns Formatted string with conversation context or empty string if no history
   */
  getFormattedHistory(): string {
    if (this.messages.length === 0) return '';
    
    // Format conversation history for the agent's context
    const historyText = this.messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    return `\n\nPrevious conversation context:\n${historyText}\n\nCurrent request:`;
  }

  /**
   * Clear all conversation history
   */
  clearHistory(): void {
    this.messages = [];
  }

  /**
   * Get the current number of messages in history
   * @returns Number of messages stored
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Get a copy of all messages (for debugging or analysis)
   * @returns Array of conversation messages
   */
  getAllMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Check if the conversation history is empty
   * @returns True if no messages are stored
   */
  isEmpty(): boolean {
    return this.messages.length === 0;
  }

  /**
   * Get the last message from the conversation
   * @returns The most recent message or undefined if empty
   */
  getLastMessage(): ConversationMessage | undefined {
    return this.messages[this.messages.length - 1];
  }

  /**
   * Trim conversation history to respect memory limits
   * Removes oldest messages when limit is exceeded
   */
  private trimHistory(): void {
    if (this.messages.length > this.maxHistorySize) {
      this.messages = this.messages.slice(-this.maxHistorySize);
    }
  }
}