/**
 * Lookup-focused tools for music information retrieval
 * 
 * Note: Most lookup functionality is handled directly by the MCP server tools
 * (search, library access, etc.). This file contains additional tools for
 * information processing, analysis, and web search capabilities.
 */

import { BaseTool, createSuccessResult } from './base';
import { SystemContext, ToolResult } from './types';
import { tavily } from '@tavily/core';
import { tool } from '@openai/agents';
import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

/**
 * Create Tavily web search tool for OpenAI agents
 * This creates a tool definition using the correct @openai/agents format
 */
export const tavilyWebSearchTool = tool({
  name: 'web_search',
  description: 'Search the web for information that cannot be found in Spotify data. IMPORTANT: Always ask user for permission before using this tool by saying "May I search the web for: [query]?" and wait for approval.',
  parameters: z.object({
    query: z.string().describe('The search query to execute on the web')
  }),
  execute: async ({ query }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    
    if (!apiKey) {
      throw new Error('Tavily API key not configured. Please set TAVILY_API_KEY in your environment variables.');
    }

    try {
      const tvly = tavily({ apiKey });
      
      const response = await tvly.search(query, {
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
        include_domains: [], // No domain restrictions by default
        exclude_domains: [], // No domain exclusions by default
        include_raw_content: false, // Don't include full page content
        include_images: false // Don't include images to keep response focused
      });

      if (!response.results || response.results.length === 0) {
        return `No web search results found for: "${query}"`;
      }

      // Format the results for the agent
      let formattedResults = `🌐 Web Search Results for: "${query}"\n\n`;
      
      if (response.answer) {
        formattedResults += `📋 Summary: ${response.answer}\n\n`;
      }

      formattedResults += `🔍 Sources:\n`;
      response.results.forEach((result, index) => {
        formattedResults += `${index + 1}. **${result.title}**\n`;
        formattedResults += `   ${result.content}\n`;
        formattedResults += `   Source: ${result.url}\n\n`;
      });

      return formattedResults;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Web search failed: ${errorMessage}`);
    }
  }
});