import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load a prompt from a markdown file
 */
export function loadPrompt(filename: string): string {
  // Get the directory of the current file
  const currentDir = __dirname;
  
  // Check if we're in dist (compiled) or src (development)
  const isCompiled = currentDir.includes('/dist/');
  
  let promptPath: string;
  if (isCompiled) {
    // In compiled version, go back to project root and then to src/prompts
    const projectRoot = join(currentDir, '../../');
    promptPath = join(projectRoot, 'src/prompts', `${filename}.md`);
  } else {
    // In development, prompts are in the same directory
    promptPath = join(currentDir, `${filename}.md`);
  }
  
  return readFileSync(promptPath, 'utf-8');
}