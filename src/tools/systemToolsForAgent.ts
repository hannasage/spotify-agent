/**
 * System tools converted to OpenAI agent tools format
 * This allows the unified agent to execute system commands directly
 */

import { tool } from '@openai/agents';
import { z } from 'zod';
import { toolRegistry } from './registry';
import { SystemContext } from './types';

/**
 * Create OpenAI agent tools from the system tool registry
 * This allows the unified agent to execute system tools directly
 */
export function createSystemToolsForAgent(systemContext: SystemContext) {
  const systemTools = toolRegistry.getAllTools();
  
  return systemTools.map(systemTool => 
    tool({
      name: systemTool.name.replace(/-/g, '_'), // Convert kebab-case to snake_case for OpenAI tools
      description: systemTool.description,
      parameters: z.object({}), // System tools don't need parameters
      execute: async () => {
        try {
          const result = await systemTool.execute(systemContext);
          if (result.success) {
            return result.message;
          } else {
            throw new Error(result.message);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`System tool ${systemTool.name} failed: ${errorMessage}`);
        }
      }
    })
  );
}

/**
 * Get system tool names for documentation
 */
export function getSystemToolNames(): string[] {
  return toolRegistry.getToolNames();
}

/**
 * Get system tool descriptions for documentation
 */
export function getSystemToolDescriptions(): string {
  return toolRegistry.getToolDescriptions();
} 