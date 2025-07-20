/**
 * Spotify Agent System Evaluator
 * 
 * Implementation of evaluation functions for analyzing trace data
 * and generating comprehensive performance metrics.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  TraceData,
  TraceEntry,
  EvaluationMetrics,
  EvaluationDimensions,
  EvaluationResult,
  EvaluationCriteria,
  ToolCallStats,
  AgentPerformance,
  TRACE_EVENT_TYPES,
  TraceAnalysisUtils,
  DEFAULT_EVALUATION_CRITERIA
} from './schema';

export class SpotifyAgentEvaluator {
  private criteria: EvaluationCriteria;

  constructor(criteria: EvaluationCriteria = DEFAULT_EVALUATION_CRITERIA) {
    this.criteria = criteria;
  }

  /**
   * Load trace data from file
   */
  loadTraceData(filePath: string): TraceData {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent) as TraceData;
    } catch (error) {
      throw new Error(`Failed to load trace data from ${filePath}: ${error}`);
    }
  }

  /**
   * Load all trace files from directory
   */
  loadAllTraceData(tracesDir: string): TraceData[] {
    try {
      const files = fs.readdirSync(tracesDir);
      const traceFiles = files.filter(file => file.endsWith('.json'));
      
      return traceFiles.map(file => {
        const filePath = path.join(tracesDir, file);
        return this.loadTraceData(filePath);
      });
    } catch (error) {
      throw new Error(`Failed to load trace data from directory ${tracesDir}: ${error}`);
    }
  }

  /**
   * Evaluate a single session
   */
  evaluateSession(traceData: TraceData): EvaluationResult {
    const metrics = this.calculateMetrics(traceData.traces);
    const dimensions = this.calculateDimensions(traceData.traces);
    const score = this.generateScore(metrics, dimensions);
    const grade = this.calculateGrade(score);
    const recommendations = this.generateRecommendations({ metrics, dimensions, score, grade } as EvaluationResult);
    const issues = this.identifyIssues({ metrics, dimensions, score, grade } as EvaluationResult);

    return {
      sessionId: traceData.sessionId,
      timestamp: new Date().toISOString(),
      metrics,
      dimensions,
      criteria: this.criteria,
      score,
      grade,
      recommendations,
      issues
    };
  }

  /**
   * Calculate all metrics from traces
   */
  private calculateMetrics(traces: TraceEntry[]): EvaluationMetrics {
    return {
      performance: this.calculatePerformanceMetrics(traces),
      accuracy: this.calculateAccuracyMetrics(traces),
      userExperience: this.calculateUserExperienceMetrics(traces),
      systemHealth: this.calculateSystemHealthMetrics(traces)
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(traces: TraceEntry[]): EvaluationMetrics['performance'] {
    const userInputs = TraceAnalysisUtils.getTracesByType(traces, 'user_input');
    const toolCalls = TraceAnalysisUtils.extractToolCalls(traces);
    const agentExecutions = TraceAnalysisUtils.extractAgentExecutions(traces);

    // Calculate response times per agent (from user input to final agent response)
    let totalResponseTime = 0;
    let responseCount = 0;
    const agentResponseTimes = {
      systemCommands: [] as number[],
      lookupAgent: [] as number[],
      playbackAgent: [] as number[]
    };

    for (const input of userInputs) {
      const inputTime = new Date(input.timestamp);
      
      // Find the most specific routing/response after this input
      let finalResponse: TraceEntry | undefined;
      let agentType: keyof typeof agentResponseTimes;
      
      // Find the next input to limit our search window
      const nextInputIndex = userInputs.indexOf(input) + 1;
      const nextInputTime = nextInputIndex < userInputs.length 
        ? new Date(userInputs[nextInputIndex]?.timestamp || new Date()) 
        : new Date(Date.now()); // Use current time if this is the last input
      
      // Look for agent-specific routing first (within this input's time window)
      const lookupRouting = traces.find(trace => {
        const traceTime = new Date(trace.timestamp);
        return traceTime > inputTime && 
               traceTime < nextInputTime &&
               trace.type === 'routing_to_lookup';
      });
      
      const playbackRouting = traces.find(trace => {
        const traceTime = new Date(trace.timestamp);
        return traceTime > inputTime && 
               traceTime < nextInputTime &&
               trace.type === 'routing_to_playback';
      });
      
      if (lookupRouting) {
        agentType = 'lookupAgent';
        finalResponse = traces.find(trace => {
          const traceTime = new Date(trace.timestamp);
          return traceTime > new Date(lookupRouting.timestamp) &&
                 traceTime < nextInputTime &&
                 trace.type === 'lookup_interaction_success';
        });
      } else if (playbackRouting) {
        agentType = 'playbackAgent';
        finalResponse = traces.find(trace => {
          const traceTime = new Date(trace.timestamp);
          return traceTime > new Date(playbackRouting.timestamp) &&
                 traceTime < nextInputTime &&
                 trace.type === 'playback_interaction_success';
        });
      } else {
        // Fall back to system command
        agentType = 'systemCommands';
        finalResponse = traces.find(trace => {
          const traceTime = new Date(trace.timestamp);
          return traceTime > inputTime && 
                 traceTime < nextInputTime &&
                 trace.type === 'command_router_result';
        });
      }
      
      if (finalResponse) {
        const duration = TraceAnalysisUtils.calculateDuration(input, finalResponse);
        totalResponseTime += duration;
        responseCount++;
        agentResponseTimes[agentType].push(duration);
      }
    }

    // Calculate tool call metrics
    const toolCallDurations: number[] = [];
    
    // Count tool call starts (total attempts)
    const toolCallStarts = toolCalls.filter(trace => trace.type.includes('start')).length;
    
    // Count successful tool calls (end events without errors)
    const successfulToolCalls = toolCalls.filter(trace => 
      trace.type.includes('end') && !trace.type.includes('error')
    ).length;

    // Extract tool call durations from mcp_tool_call_end events
    const toolCallEnds = TraceAnalysisUtils.getTracesByType(traces, 'mcp_tool_call_end');
    toolCallEnds.forEach(endTrace => {
      if (endTrace.data?.duration) {
        toolCallDurations.push(endTrace.data.duration);
      }
    });

    return {
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
      agentResponseTimes: {
        systemCommands: agentResponseTimes.systemCommands.length > 0 
          ? agentResponseTimes.systemCommands.reduce((sum, time) => sum + time, 0) / agentResponseTimes.systemCommands.length 
          : 0,
        lookupAgent: agentResponseTimes.lookupAgent.length > 0 
          ? agentResponseTimes.lookupAgent.reduce((sum, time) => sum + time, 0) / agentResponseTimes.lookupAgent.length 
          : 0,
        playbackAgent: agentResponseTimes.playbackAgent.length > 0 
          ? agentResponseTimes.playbackAgent.reduce((sum, time) => sum + time, 0) / agentResponseTimes.playbackAgent.length 
          : 0
      },
      totalToolCalls: toolCalls.length,
      averageToolCallDuration: toolCallDurations.length > 0 
        ? toolCallDurations.reduce((sum, duration) => sum + duration, 0) / toolCallDurations.length 
        : 0,
      toolCallSuccessRate: toolCallStarts > 0 ? (successfulToolCalls / toolCallStarts) * 100 : 0,
      agentExecutionTime: this.calculateAgentExecutionTime(agentExecutions)
    };
  }

  /**
   * Calculate accuracy metrics
   */
  private calculateAccuracyMetrics(traces: TraceEntry[]): EvaluationMetrics['accuracy'] {
    const lookupSuccesses = TraceAnalysisUtils.getTracesByType(traces, 'lookup_interaction_success');
    const playbackSuccesses = TraceAnalysisUtils.getTracesByType(traces, 'playback_interaction_success');
    
    // Count interaction starts (total attempts)
    const lookupStarts = TraceAnalysisUtils.getTracesByType(traces, 'lookup_interaction_start');
    const playbackStarts = TraceAnalysisUtils.getTracesByType(traces, 'playback_interaction_start');
    const totalInteractionAttempts = lookupStarts.length + playbackStarts.length;
    
    // Count successful interactions
    const successfulInteractions = lookupSuccesses.length + playbackSuccesses.length;
    const routingAccuracy = totalInteractionAttempts > 0 ? (successfulInteractions / totalInteractionAttempts) * 100 : 0;

    // Estimate query relevance (simplified - could be enhanced with more sophisticated analysis)
    const queryRelevance = 85; // Placeholder - would need more sophisticated analysis

    // Calculate playback success rate
    const playbackCommands = traces.filter(trace => 
      trace.type.includes('playback') || 
      (trace.data?.input && trace.data.input.toLowerCase().includes('play'))
    );
    const playbackSuccess = playbackCommands.length > 0 
      ? (playbackSuccesses.length / playbackCommands.length) * 100 
      : 0;

    // Estimate response completeness
    const responseCompleteness = 90; // Placeholder - would need content analysis

    return {
      commandRoutingSuccess: routingAccuracy,
      lookupQueryRelevance: queryRelevance,
      playbackCommandSuccess: playbackSuccess,
      responseCompleteness: responseCompleteness
    };
  }

  /**
   * Calculate user experience metrics
   */
  private calculateUserExperienceMetrics(traces: TraceEntry[]): EvaluationMetrics['userExperience'] {
    const userInputs = TraceAnalysisUtils.extractUserInteractions(traces);
    const sessionStart = traces[0]?.timestamp;
    const sessionEnd = traces[traces.length - 1]?.timestamp;

    // Calculate session duration
    let sessionDuration = 0;
    if (sessionStart && sessionEnd) {
      const startTrace: TraceEntry = { 
        id: 'session_start', 
        timestamp: sessionStart, 
        type: 'session_start', 
        data: {}, 
        sessionId: traces[0]?.sessionId || '' 
      };
      const endTrace: TraceEntry = { 
        id: 'session_end', 
        timestamp: sessionEnd, 
        type: 'session_end', 
        data: {}, 
        sessionId: traces[0]?.sessionId || '' 
      };
      sessionDuration = TraceAnalysisUtils.calculateDuration(startTrace, endTrace) / 1000; // Convert to seconds
    }

    // Calculate average input length
    const totalInputLength = userInputs.reduce((sum, input) => {
      return sum + (input.data?.inputLength || 0);
    }, 0);
    const averageInputLength = userInputs.length > 0 ? totalInputLength / userInputs.length : 0;

    // Estimate conversation flow (simplified)
    const conversationFlow = this.estimateConversationFlow(traces);

    // Calculate error recovery rate
    const errors = traces.filter(trace => 
      TRACE_EVENT_TYPES.ERRORS.includes(trace.type as any)
    );
    const errorRecoveryRate = errors.length > 0 ? 85 : 100; // Placeholder

    return {
      sessionDuration,
      interactionsPerSession: userInputs.length,
      averageInputLength,
      conversationFlow,
      errorRecoveryRate
    };
  }

  /**
   * Calculate system health metrics
   */
  private calculateSystemHealthMetrics(traces: TraceEntry[]): EvaluationMetrics['systemHealth'] {
    const agentInit = TraceAnalysisUtils.getTracesByType(traces, 'agents_initialized');
    const errors = traces.filter(trace => 
      TRACE_EVENT_TYPES.ERRORS.includes(trace.type as any)
    );

    // Check agent initialization success
    const agentInitializationSuccess = agentInit.length > 0 && 
      agentInit[0]?.data?.success === true;

    // Estimate MCP connection stability
    const mcpConnectionStability = 98; // Placeholder - would need connection logs

    // Check trace data integrity
    const traceDataIntegrity = traces.length > 0 ? 95 : 0; // Placeholder

    // Estimate memory usage
    const memoryUsage = 50; // Placeholder - would need system monitoring

    // Calculate error frequency
    const errorFrequency = traces.length > 0 ? (errors.length / traces.length) * 100 : 0;

    return {
      agentInitializationSuccess,
      mcpConnectionStability,
      traceDataIntegrity,
      memoryUsage,
      errorFrequency
    };
  }

  /**
   * Calculate all dimensions from traces
   */
  private calculateDimensions(traces: TraceEntry[]): EvaluationDimensions {
    return {
      routing: this.evaluateRouting(traces),
      toolCalls: this.evaluateToolCalls(traces),
      agents: this.evaluateAgents(traces),
      interactions: this.evaluateInteractions(traces)
    };
  }

  /**
   * Evaluate routing performance
   */
  private evaluateRouting(traces: TraceEntry[]): EvaluationDimensions['routing'] {
    const routingResults = TraceAnalysisUtils.getTracesByType(traces, 'command_router_result');
    const routingToLookup = TraceAnalysisUtils.getTracesByType(traces, 'routing_to_lookup');
    const routingToPlayback = TraceAnalysisUtils.getTracesByType(traces, 'routing_to_playback');

    // Calculate routing latency
    let totalLatency = 0;
    let latencyCount = 0;

    routingResults.forEach(result => {
      const inputTrace = traces.find(trace => 
        trace.type === 'user_input' && 
        trace.data?.input === result.data?.input
      );
      if (inputTrace && result) {
        const latency = TraceAnalysisUtils.calculateDuration(inputTrace, result);
        totalLatency += latency;
        latencyCount++;
      }
    });

    return {
      inputClassification: {
        correct: routingResults.length,
        incorrect: 0, // Would need ground truth data
        confidence: 85 // Placeholder
      },
      agentSelection: {
        lookupAgent: routingToLookup.length,
        playbackAgent: routingToPlayback.length,
        systemAgent: 0
      },
      routingLatency: latencyCount > 0 ? totalLatency / latencyCount : 0
    };
  }

  /**
   * Evaluate tool call performance
   */
  private evaluateToolCalls(traces: TraceEntry[]): EvaluationDimensions['toolCalls'] {
    const mcpToolCalls = traces.filter(trace => trace.type.includes('mcp_tool_call'));
    
    // Group tool calls by tool name
    const toolCallGroups: Record<string, TraceEntry[]> = {};
    mcpToolCalls.forEach(trace => {
      const toolName = trace.data?.toolName || 'unknown';
      if (!toolCallGroups[toolName]) {
        toolCallGroups[toolName] = [];
      }
      toolCallGroups[toolName].push(trace);
    });

    // Calculate stats for each tool
    const mcpTools: Record<string, ToolCallStats> = {};
    Object.keys(toolCallGroups).forEach(toolName => {
      const toolTraces = toolCallGroups[toolName];
      if (toolTraces) {
        const startCalls = toolTraces.filter(t => t.type === 'mcp_tool_call_start');
        const endCalls = toolTraces.filter(t => t.type === 'mcp_tool_call_end');
        const errorCalls = toolTraces.filter(t => t.type === 'mcp_tool_call_error');

        const durations = endCalls.map(endCall => endCall.data?.duration || 0);
        const averageDuration = durations.length > 0 
          ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
          : 0;

        mcpTools[toolName] = {
          totalCalls: startCalls.length,
          successfulCalls: endCalls.length,
          averageDuration,
          errorRate: startCalls.length > 0 ? (errorCalls.length / startCalls.length) * 100 : 0,
          lastUsed: endCalls.length > 0 ? endCalls[endCalls.length - 1]?.timestamp || '' : ''
        };
      }
    });

    // Agent execution stats
    const agentExecutions = traces.filter(trace => trace.type === 'agent_execution');
    const agentExecutionStats: ToolCallStats = {
      totalCalls: agentExecutions.length,
      successfulCalls: agentExecutions.filter(t => t.type === 'tool_call_end').length,
      averageDuration: 0, // Would need to calculate from start/end pairs
      errorRate: 0,
      lastUsed: agentExecutions.length > 0 ? agentExecutions[agentExecutions.length - 1]?.timestamp || '' : ''
    };

    return {
      mcpTools,
      agentTools: {
        agentExecution: agentExecutionStats
      }
    };
  }

  /**
   * Evaluate agent performance
   */
  private evaluateAgents(traces: TraceEntry[]): EvaluationDimensions['agents'] {
    const lookupInteractions = traces.filter(trace => 
      trace.type.includes('lookup_interaction')
    );
    const playbackInteractions = traces.filter(trace => 
      trace.type.includes('playback_interaction')
    );
    const routingResults = TraceAnalysisUtils.getTracesByType(traces, 'command_router_result');

    return {
      lookupAgent: this.calculateAgentPerformance(lookupInteractions, 'Lookup Agent'),
      playbackAgent: this.calculateAgentPerformance(playbackInteractions, 'Playback Agent'),
      commandRouter: this.calculateAgentPerformance(routingResults, 'Command Router')
    };
  }

  /**
   * Evaluate user interactions
   */
  private evaluateInteractions(traces: TraceEntry[]): EvaluationDimensions['interactions'] {
    const userInputs = TraceAnalysisUtils.extractUserInteractions(traces);

    // Categorize input types
    const inputTypes = {
      queries: userInputs.filter(input => 
        input.data?.input?.toLowerCase().includes('what') ||
        input.data?.input?.toLowerCase().includes('?')
      ).length,
      commands: userInputs.filter(input => 
        input.data?.input?.toLowerCase().includes('play') ||
        input.data?.input?.toLowerCase().includes('pause') ||
        input.data?.input?.toLowerCase().includes('skip')
      ).length,
      questions: userInputs.filter(input => 
        input.data?.input?.toLowerCase().includes('how') ||
        input.data?.input?.toLowerCase().includes('why')
      ).length,
      requests: userInputs.filter(input => 
        input.data?.input?.toLowerCase().includes('give me') ||
        input.data?.input?.toLowerCase().includes('show me')
      ).length
    };

    // Response quality (simplified)
    const responseQuality = {
      helpful: 85,
      accurate: 90,
      complete: 88,
      timely: 92
    };

    return {
      inputTypes,
      responseQuality
    };
  }

  /**
   * Calculate agent performance
   */
  private calculateAgentPerformance(traces: TraceEntry[], _agentName: string): AgentPerformance {
    const totalExecutions = traces.length;
    const successfulExecutions = traces.filter(trace => 
      trace.type.includes('success') || trace.type.includes('end')
    ).length;

    // Group errors by type
    const errorTypes: Record<string, number> = {};
    traces.filter(trace => trace.type.includes('error')).forEach(error => {
      const errorType = error.type.replace('_error', '');
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });

    return {
      totalExecutions,
      averageExecutionTime: 0, // Would need to calculate from start/end pairs
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      errorTypes,
      modelUsed: 'gpt-4o-mini' // Placeholder
    };
  }

  /**
   * Generate overall evaluation score
   */
  private generateScore(metrics: EvaluationMetrics, _dimensions: EvaluationDimensions): number {
    // Weighted scoring based on different metrics
    const weights = {
      performance: 0.3,
      accuracy: 0.3,
      userExperience: 0.2,
      systemHealth: 0.2
    };

    const performanceScore = this.calculatePerformanceScore(metrics.performance);
    const accuracyScore = this.calculateAccuracyScore(metrics.accuracy);
    const userExperienceScore = this.calculateUserExperienceScore(metrics.userExperience);
    const systemHealthScore = this.calculateSystemHealthScore(metrics.systemHealth);

    return (
      performanceScore * weights.performance +
      accuracyScore * weights.accuracy +
      userExperienceScore * weights.userExperience +
      systemHealthScore * weights.systemHealth
    );
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(performance: EvaluationMetrics['performance']): number {
    const responseTimeScore = Math.max(0, 100 - (performance.averageResponseTime / 100));
    const toolCallScore = performance.toolCallSuccessRate;
    const executionTimeScore = Math.max(0, 100 - (performance.agentExecutionTime / 100));

    return (responseTimeScore + toolCallScore + executionTimeScore) / 3;
  }

  /**
   * Calculate accuracy score
   */
  private calculateAccuracyScore(accuracy: EvaluationMetrics['accuracy']): number {
    return (
      accuracy.commandRoutingSuccess +
      accuracy.lookupQueryRelevance +
      accuracy.playbackCommandSuccess +
      accuracy.responseCompleteness
    ) / 4;
  }

  /**
   * Calculate user experience score
   */
  private calculateUserExperienceScore(userExperience: EvaluationMetrics['userExperience']): number {
    const sessionScore = Math.min(100, (userExperience.sessionDuration / 300) * 100);
    const interactionScore = Math.min(100, userExperience.interactionsPerSession * 10);
    const flowScore = userExperience.conversationFlow * 10;
    const recoveryScore = userExperience.errorRecoveryRate;

    return (sessionScore + interactionScore + flowScore + recoveryScore) / 4;
  }

  /**
   * Calculate system health score
   */
  private calculateSystemHealthScore(systemHealth: EvaluationMetrics['systemHealth']): number {
    const initializationScore = systemHealth.agentInitializationSuccess ? 100 : 0;
    const connectionScore = systemHealth.mcpConnectionStability;
    const integrityScore = systemHealth.traceDataIntegrity;
    const errorScore = Math.max(0, 100 - systemHealth.errorFrequency * 10);

    return (initializationScore + connectionScore + integrityScore + errorScore) / 4;
  }

  /**
   * Calculate grade from score
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(result: EvaluationResult): string[] {
    const recommendations: string[] = [];

    if (result.metrics.performance.averageResponseTime > 3000) {
      recommendations.push('Consider optimizing response times by reducing tool call latency');
    }

    if (result.metrics.accuracy.commandRoutingSuccess < 90) {
      recommendations.push('Improve command routing accuracy by enhancing the router model');
    }

    if (result.metrics.userExperience.conversationFlow < 7) {
      recommendations.push('Enhance conversation flow by improving agent response quality');
    }

    if (result.metrics.systemHealth.errorFrequency > 5) {
      recommendations.push('Reduce error frequency by improving error handling and validation');
    }

    if (result.metrics.performance.toolCallSuccessRate < 95) {
      recommendations.push('Improve tool call success rate by enhancing MCP connection stability');
    }

    return recommendations;
  }

  /**
   * Identify issues
   */
  private identifyIssues(result: EvaluationResult): string[] {
    const issues: string[] = [];

    if (result.metrics.performance.averageResponseTime > 5000) {
      issues.push('Response times are too slow (>5s)');
    }

    if (result.metrics.accuracy.commandRoutingSuccess < 80) {
      issues.push('Command routing accuracy is below acceptable threshold');
    }

    if (result.metrics.systemHealth.errorFrequency > 10) {
      issues.push('High error frequency indicates system instability');
    }

    if (!result.metrics.systemHealth.agentInitializationSuccess) {
      issues.push('Agent initialization failed');
    }

    return issues;
  }

  /**
   * Estimate conversation flow
   */
  private estimateConversationFlow(traces: TraceEntry[]): number {
    const userInputs = TraceAnalysisUtils.extractUserInteractions(traces);
    const successfulInteractions = traces.filter(trace => 
      trace.type.includes('success')
    ).length;

    if (userInputs.length === 0) return 0;

    const successRate = successfulInteractions / userInputs.length;
    const flowScore = successRate * 10; // Convert to 1-10 scale

    return Math.min(10, Math.max(1, flowScore));
  }

  /**
   * Calculate agent execution time
   */
  private calculateAgentExecutionTime(agentExecutions: TraceEntry[]): number {
    const executionStarts = agentExecutions.filter(trace => 
      trace.type.includes('start')
    );
    const executionEnds = agentExecutions.filter(trace => 
      trace.type.includes('end')
    );

    if (executionStarts.length === 0 || executionEnds.length === 0) return 0;

    let totalTime = 0;
    let count = 0;

    executionStarts.forEach((start, index) => {
      const end = executionEnds[index];
      if (end) {
        totalTime += TraceAnalysisUtils.calculateDuration(start, end);
        count++;
      }
    });

    return count > 0 ? totalTime / count : 0;
  }
} 