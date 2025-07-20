/**
 * Prompt loading utility for managing agent instructions
 * 
 * This module provides utilities for loading and managing agent prompts
 * from markdown files, with caching for performance optimization.
 * 
 * Features:
 * - Loads prompts from /prompts directory
 * - Supports variable substitution with {{VARIABLE}} syntax
 * - Caches prompts for performance
 * - Validates prompt file existence
 * - Supports preloading for better startup performance
 */

import * as fs from 'fs';
import * as path from 'path';
import { debug } from '../debug';

/**
 * Cache for loaded prompts to avoid repeated file system operations
 */
const promptCache = new Map<string, string>();

/**
 * Base directory for prompt files
 */
const PROMPTS_DIR = path.join(__dirname, '../../prompts');

/**
 * Load a prompt from a markdown file
 * 
 * @param promptName - Name of the prompt file (without .md extension)
 * @param variables - Optional object containing variables to substitute in the prompt
 * @returns The loaded prompt content
 * @throws Error if the prompt file cannot be found or read
 */
export function loadPrompt(promptName: string, variables?: Record<string, string>): string {
  const cacheKey = `${promptName}:${JSON.stringify(variables || {})}`;
  
  // Check cache first
  if (promptCache.has(cacheKey)) {
    debug.log(`📄 [PROMPTS] Loading cached prompt: ${promptName}`);
    return promptCache.get(cacheKey)!;
  }

  try {
    const promptPath = path.join(PROMPTS_DIR, `${promptName}.md`);
    
    if (!fs.existsSync(promptPath)) {
      throw new Error(`Prompt file not found: ${promptPath}`);
    }

    let content = fs.readFileSync(promptPath, 'utf-8');
    
    // Substitute variables if provided
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        content = content.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    // Cache the result
    promptCache.set(cacheKey, content);
    debug.log(`📄 [PROMPTS] Loaded prompt: ${promptName}`);
    
    return content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug.error(`📄 [PROMPTS] Failed to load prompt ${promptName}: ${errorMessage}`);
    throw new Error(`Failed to load prompt ${promptName}: ${errorMessage}`);
  }
}

/**
 * Clear the prompt cache
 * 
 * This can be useful during development or when prompts are updated
 */
export function clearPromptCache(): void {
  promptCache.clear();
  debug.log('📄 [PROMPTS] Cache cleared');
}

/**
 * Get available prompt files
 * 
 * @returns Array of available prompt names (without .md extension)
 */
export function getAvailablePrompts(): string[] {
  try {
    const files = fs.readdirSync(PROMPTS_DIR);
    return files
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));
  } catch (error) {
    debug.error(`📄 [PROMPTS] Failed to read prompts directory: ${error}`);
    return [];
  }
}

/**
 * Validate that all required prompt files exist
 * 
 * @param requiredPrompts - Array of prompt names that must exist
 * @throws Error if any required prompt is missing
 */
export function validatePrompts(requiredPrompts: string[]): void {
  const availablePrompts = getAvailablePrompts();
  const missingPrompts = requiredPrompts.filter(prompt => !availablePrompts.includes(prompt));
  
  if (missingPrompts.length > 0) {
    throw new Error(`Missing required prompt files: ${missingPrompts.join(', ')}`);
  }
  
  debug.log(`📄 [PROMPTS] Validated ${requiredPrompts.length} prompt files`);
}

/**
 * Preload prompts into cache for better performance
 * 
 * @param promptNames - Array of prompt names to preload
 */
export function preloadPrompts(promptNames: string[]): void {
  for (const promptName of promptNames) {
    try {
      loadPrompt(promptName);
    } catch (error) {
      debug.error(`📄 [PROMPTS] Failed to preload prompt ${promptName}: ${error}`);
    }
  }
  debug.log(`📄 [PROMPTS] Preloaded ${promptNames.length} prompts`);
}