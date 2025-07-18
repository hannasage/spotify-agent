/**
 * Spotify Orchestrator - Central coordinator for specialized music agents
 */

import { Agent, run } from '@openai/agents';
import { SpotifyAgentConfig, TaskAnalysis, TaskType, AgentResult, OrchestratorResult } from './types';
import { debug } from '../debug';
import { loadPrompt } from '../prompts/utils';

/**
 * Spotify Orchestrator coordinates multiple specialized agents to handle complex music tasks
 */
export class SpotifyOrchestrator {
  private analysisAgent: Agent | null = null;
  private agents: SpotifyAgentConfig;

  constructor(agents: SpotifyAgentConfig) {
    this.agents = agents;
  }

  /**
   * Initialize the orchestrator analysis agent
   */
  async initialize(): Promise<void> {
    if (this.analysisAgent) return;

    this.analysisAgent = new Agent({
      name: 'Spotify Orchestrator',
      model: 'gpt-4o-mini',
      instructions: loadPrompt('spotify-orchestrator'),
      tools: []
    });

    debug.log('🎵 Spotify Orchestrator initialized');
  }

  /**
   * Process a music request through the orchestrator
   */
  async processRequest(userRequest: string, conversationContext?: string): Promise<OrchestratorResult> {
    const startTime = Date.now();
    
    try {
      // Ensure orchestrator is initialized
      if (!this.analysisAgent) {
        await this.initialize();
      }

      debug.log(`🎵 [ORCHESTRATOR] Processing request: "${userRequest}"`);

      // Check if this is a clarification response
      const isClarificationResponse = this.isClarificationResponse(userRequest, conversationContext);
      
      if (isClarificationResponse) {
        debug.log(`🎵 [ORCHESTRATOR] Handling clarification response`);
        return await this.handleClarificationResponse(userRequest, conversationContext);
      }

      // Analyze the task to determine agent assignment
      const taskAnalysis = await this.analyzeTask(userRequest, conversationContext);
      debug.log(`🎵 [ORCHESTRATOR] Task analysis: ${taskAnalysis.taskType} -> ${taskAnalysis.primaryAgent}`);

      // Execute the task based on analysis
      const result = await this.executeTask(userRequest, taskAnalysis, conversationContext);
      
      const executionTime = Date.now() - startTime;
      debug.log(`🎵 [ORCHESTRATOR] Request completed in ${executionTime}ms`);

      return {
        success: result.success,
        response: result.content,
        agentsUsed: [result.agent, ...(taskAnalysis.secondaryAgents ?? [])],
        executionTime,
        requiresClarification: result.requiresClarification,
        clarificationContext: result.context
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug.log(`🎵 [ORCHESTRATOR] Error processing request: ${errorMessage}`);

      return {
        success: false,
        response: `I encountered an error processing your request: ${errorMessage}`,
        agentsUsed: [],
        executionTime
      };
    }
  }

  /**
   * Analyze a user request to determine task type and agent assignment
   */
  private async analyzeTask(userRequest: string, conversationContext?: string): Promise<TaskAnalysis> {
    if (!this.analysisAgent) {
      throw new Error('Orchestrator not initialized');
    }

    const analysisPrompt = `
Analyze this music request and determine the appropriate agent assignment:

User Request: "${userRequest}"
${conversationContext ? `Context: ${conversationContext}` : ''}

Provide analysis in this format:
TASK_TYPE: [playback_control|search_discovery|library_management|queue_management|complex_multi_agent]
PRIMARY_AGENT: [playback|search|library|queue]
SECONDARY_AGENTS: [comma-separated list if needed, or "none"]
COMPLEXITY: [1-5]
REASONING: [brief explanation]
`;

    try {
      const result = await run(this.analysisAgent, analysisPrompt, { maxTurns: 1 });
      const analysis = result.finalOutput || '';

      // Parse the analysis response
      const taskType = this.extractValue(analysis, 'TASK_TYPE') as TaskType || TaskType.SEARCH_DISCOVERY;
      const primaryAgent = this.extractValue(analysis, 'PRIMARY_AGENT') as keyof SpotifyAgentConfig || 'search';
      const secondaryAgentsStr = this.extractValue(analysis, 'SECONDARY_AGENTS');
      const complexity = parseInt(this.extractValue(analysis, 'COMPLEXITY') || '2', 10);
      const reasoning = this.extractValue(analysis, 'REASONING') || 'Default routing to search agent';

      const secondaryAgents: (keyof SpotifyAgentConfig)[] | undefined = secondaryAgentsStr && secondaryAgentsStr !== 'none' 
        ? secondaryAgentsStr.split(',').map(s => s.trim()) as (keyof SpotifyAgentConfig)[]
        : undefined;

      return {
        taskType,
        primaryAgent,
        secondaryAgents,
        complexity,
        reasoning
      };

    } catch (error) {
      debug.log(`🎵 [ORCHESTRATOR] Task analysis failed, using default: ${error}`);
      // Fallback to search agent for unknown requests
      return {
        taskType: TaskType.SEARCH_DISCOVERY,
        primaryAgent: 'search',
        complexity: 2,
        reasoning: 'Fallback routing due to analysis failure'
      };
    }
  }

  /**
   * Execute a task using the determined agent(s)
   */
  private async executeTask(userRequest: string, analysis: TaskAnalysis, conversationContext?: string): Promise<AgentResult> {
    // Handle multi-agent coordination
    if (analysis.taskType === TaskType.COMPLEX_MULTI_AGENT && analysis.secondaryAgents?.length) {
      return await this.executeMultiAgentTask(userRequest, analysis, conversationContext);
    }

    // Handle single agent execution
    const agent = this.agents[analysis.primaryAgent];
    
    if (!agent) {
      throw new Error(`Agent ${analysis.primaryAgent} not found`);
    }

    const requestWithContext = conversationContext 
      ? `${conversationContext}\n\nUser Request: ${userRequest}`
      : userRequest;

    debug.log(`🎵 [ORCHESTRATOR] Executing with ${analysis.primaryAgent} agent`);

    try {
      const result = await run(agent, requestWithContext);
      const response = result.finalOutput || 'No response received';

      // Check if the response indicates need for clarification
      const requiresClarification = this.checkForClarificationNeeds(response);

      return {
        success: true,
        content: response,
        agent: analysis.primaryAgent,
        requiresClarification,
        context: { 
          taskType: analysis.taskType, 
          complexity: analysis.complexity,
          originalRequest: userRequest,
          primaryAgent: analysis.primaryAgent,
          secondaryAgents: analysis.secondaryAgents
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug.log(`🎵 [ORCHESTRATOR] Agent execution failed: ${errorMessage}`);

      return {
        success: false,
        content: `The ${analysis.primaryAgent} agent encountered an error: ${errorMessage}`,
        agent: analysis.primaryAgent
      };
    }
  }

  /**
   * Execute a multi-agent task with coordination
   */
  private async executeMultiAgentTask(userRequest: string, analysis: TaskAnalysis, conversationContext?: string): Promise<AgentResult> {
    debug.log(`🎵 [ORCHESTRATOR] Executing multi-agent task: ${analysis.primaryAgent} → ${analysis.secondaryAgents?.join(', ')}`);

    try {
      // Step 1: Execute primary agent
      const primaryAgent = this.agents[analysis.primaryAgent];
      if (!primaryAgent) {
        throw new Error(`Primary agent ${analysis.primaryAgent} not found`);
      }

      const requestWithContext = conversationContext 
        ? `${conversationContext}\n\nUser Request: ${userRequest}`
        : userRequest;

      debug.log(`🎵 [ORCHESTRATOR] Step 1: Executing primary agent (${analysis.primaryAgent})`);
      const primaryResult = await run(primaryAgent, requestWithContext);
      const primaryResponse = primaryResult.finalOutput || 'No response received';

      // Step 2: Execute secondary agents with primary results
      if (analysis.secondaryAgents?.length) {
        const secondaryResults = [];
        
        for (const secondaryAgentKey of analysis.secondaryAgents) {
          const secondaryAgent = this.agents[secondaryAgentKey];
          if (!secondaryAgent) {
            debug.log(`🎵 [ORCHESTRATOR] Secondary agent ${secondaryAgentKey} not found, skipping`);
            continue;
          }

          debug.log(`🎵 [ORCHESTRATOR] Step 2: Executing secondary agent (${secondaryAgentKey})`);
          
          // Pass primary results to secondary agent
          const secondaryRequest = `
Based on the search results from the primary agent:
${primaryResponse}

Original user request: ${userRequest}

Please complete the library operation using the search results above.
`;

          const secondaryResult = await run(secondaryAgent, secondaryRequest);
          const secondaryResponse = secondaryResult.finalOutput || 'No response from secondary agent';
          secondaryResults.push(secondaryResponse);
        }

        // Combine results
        const combinedResponse = secondaryResults.length > 0 
          ? `${primaryResponse}\n\n${secondaryResults.join('\n\n')}`
          : primaryResponse;

        return {
          success: true,
          content: combinedResponse,
          agent: analysis.primaryAgent,
          context: { 
            taskType: analysis.taskType, 
            complexity: analysis.complexity,
            secondaryAgents: analysis.secondaryAgents 
          }
        };
      }

      // Fallback to primary result only
      return {
        success: true,
        content: primaryResponse,
        agent: analysis.primaryAgent,
        context: { taskType: analysis.taskType, complexity: analysis.complexity }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug.log(`🎵 [ORCHESTRATOR] Multi-agent execution failed: ${errorMessage}`);

      return {
        success: false,
        content: `Multi-agent task failed: ${errorMessage}`,
        agent: analysis.primaryAgent
      };
    }
  }

  /**
   * Extract a value from the analysis response
   */
  private extractValue(text: string, key: string): string {
    const regex = new RegExp(`${key}:\\s*(.+?)(?:\n|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1]?.trim() || '' : '';
  }

  /**
   * Check if user input is a clarification response
   */
  private isClarificationResponse(_userRequest: string, conversationContext?: string): boolean {
    if (!conversationContext) return false;
    
    // Look for clarification indicators in conversation context
    const clarificationIndicators = [
      'Which one do you mean?',
      'I found multiple results',
      'Please clarify',
      'Which of these',
      'Could you be more specific'
    ];
    
    return clarificationIndicators.some(indicator => 
      conversationContext.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Handle clarification response by continuing the original task
   */
  private async handleClarificationResponse(userRequest: string, conversationContext?: string): Promise<OrchestratorResult> {
    const startTime = Date.now();
    
    try {
      // Extract the original context from conversation
      const originalContext = this.extractOriginalContext(conversationContext);
      
      if (!originalContext) {
        return {
          success: false,
          response: "I'm sorry, I lost track of what we were discussing. Could you please repeat your request?",
          agentsUsed: [],
          executionTime: Date.now() - startTime
        };
      }

      // Continue with the original task using the clarification
      const continuationRequest = `
Original request: ${originalContext.originalRequest}
User clarification: ${userRequest}
Conversation context: ${conversationContext}

Please continue with the original task using the user's clarification.
`;

      // Execute with the primary agent from original context
      const primaryAgentKey = originalContext.primaryAgent || 'search';
      const agent = this.agents[primaryAgentKey as keyof SpotifyAgentConfig];
      
      if (!agent) {
        throw new Error(`Agent ${primaryAgentKey} not found`);
      }

      debug.log(`🎵 [ORCHESTRATOR] Continuing with ${primaryAgentKey} agent after clarification`);
      
      const result = await run(agent, continuationRequest);
      const response = result.finalOutput || 'No response received';

      // If we have secondary agents, continue with multi-agent flow
      if (originalContext.secondaryAgents?.length) {
        const secondaryResults = [];
        
        for (const secondaryAgentKey of originalContext.secondaryAgents) {
          const secondaryAgent = this.agents[secondaryAgentKey as keyof SpotifyAgentConfig];
          if (!secondaryAgent) continue;

          debug.log(`🎵 [ORCHESTRATOR] Continuing with secondary agent (${secondaryAgentKey})`);
          
          const secondaryRequest = `
Based on the search results and clarification:
${response}

Original user request: ${originalContext.originalRequest}
User clarification: ${userRequest}

Please complete the library operation using the clarified search results.
`;

          const secondaryResult = await run(secondaryAgent, secondaryRequest);
          const secondaryResponse = secondaryResult.finalOutput || 'No response from secondary agent';
          secondaryResults.push(secondaryResponse);
        }

        const combinedResponse = secondaryResults.length > 0 
          ? `${response}\n\n${secondaryResults.join('\n\n')}`
          : response;

        return {
          success: true,
          response: combinedResponse,
          agentsUsed: [primaryAgentKey as keyof SpotifyAgentConfig, ...(originalContext.secondaryAgents || [])],
          executionTime: Date.now() - startTime
        };
      }

      return {
        success: true,
        response,
        agentsUsed: [primaryAgentKey as keyof SpotifyAgentConfig],
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug.log(`🎵 [ORCHESTRATOR] Clarification handling failed: ${errorMessage}`);

      return {
        success: false,
        response: `I encountered an error processing your clarification: ${errorMessage}`,
        agentsUsed: [],
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check if response indicates need for clarification
   */
  private checkForClarificationNeeds(response: string): boolean {
    const clarificationIndicators = [
      'which one do you mean',
      'i found multiple results',
      'please clarify',
      'which of these',
      'could you be more specific',
      'multiple matches',
      'several options'
    ];
    
    return clarificationIndicators.some(indicator => 
      response.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Extract original context from conversation
   */
  private extractOriginalContext(conversationContext?: string): any {
    if (!conversationContext) return null;
    
    try {
      // Look for context patterns in conversation
      const lines = conversationContext.split('\n');
      let originalRequest = '';
      let primaryAgent = '';
      let secondaryAgents: string[] = [];
      
      for (const line of lines) {
        if (line.includes('Original request:')) {
          originalRequest = line.replace('Original request:', '').trim();
        }
        if (line.includes('Primary agent:')) {
          primaryAgent = line.replace('Primary agent:', '').trim();
        }
        if (line.includes('Secondary agents:')) {
          const agents = line.replace('Secondary agents:', '').trim();
          secondaryAgents = agents ? agents.split(',').map(a => a.trim()) : [];
        }
      }
      
      return {
        originalRequest,
        primaryAgent: primaryAgent || 'search',
        secondaryAgents
      };
    } catch (error) {
      debug.log(`🎵 [ORCHESTRATOR] Failed to extract original context: ${error}`);
      return null;
    }
  }

  /**
   * Get the available agents
   */
  getAgents(): SpotifyAgentConfig {
    return this.agents;
  }
}