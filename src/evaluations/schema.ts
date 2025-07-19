/**
 * Evaluation Schema for Spotify Agent System
 * 
 * This schema defines the structure for evaluating the performance and behavior
 * of our multi-agent Spotify control system based on trace data.
 */

export interface TraceData {
  sessionId: string;
  sessionStartTime: string;
  lastUpdated: string;
  totalTraces: number;
  traces: TraceEntry[];
  metadata: {
    processor: string;
    version: string;
    format: string;
  };
}

export interface TraceEntry {
  id: string;
  timestamp: string;
  type: string;
  data: any;
  sessionId: string;
}

/**
 * Core evaluation metrics
 */
export interface EvaluationMetrics {
  // Performance metrics
  performance: {
    averageResponseTime: number; // milliseconds
    agentResponseTimes: {
      systemCommands: number; // milliseconds
      lookupAgent: number; // milliseconds
      playbackAgent: number; // milliseconds
    };
    totalToolCalls: number;
    averageToolCallDuration: number; // milliseconds
    toolCallSuccessRate: number; // percentage
    agentExecutionTime: number; // milliseconds
  };
  
  // Accuracy metrics
  accuracy: {
    commandRoutingSuccess: number; // percentage of successful routing decisions
    lookupQueryRelevance: number; // percentage of relevant search results
    playbackCommandSuccess: number; // percentage of successful playback commands
    responseCompleteness: number; // percentage of complete responses
  };
  
  // User experience metrics
  userExperience: {
    sessionDuration: number; // seconds
    interactionsPerSession: number;
    averageInputLength: number;
    conversationFlow: number; // 1-10 rating
    errorRecoveryRate: number; // percentage
  };
  
  // System health metrics
  systemHealth: {
    agentInitializationSuccess: boolean;
    mcpConnectionStability: number; // percentage uptime
    traceDataIntegrity: number; // percentage of complete traces
    memoryUsage: number; // MB
    errorFrequency: number; // errors per session
  };
}

/**
 * Evaluation dimensions for different aspects of the system
 */
export interface EvaluationDimensions {
  // Command routing evaluation
  routing: {
    inputClassification: {
      correct: number;
      incorrect: number;
      confidence: number;
    };
    agentSelection: {
      lookupAgent: number;
      playbackAgent: number;
      systemAgent: number;
    };
    routingLatency: number; // milliseconds
  };
  
  // Tool call evaluation
  toolCalls: {
    mcpTools: Record<string, ToolCallStats>;
    agentTools: {
      agentExecution: ToolCallStats;
    };
  };
  
  // Agent performance evaluation
  agents: {
    lookupAgent: AgentPerformance;
    playbackAgent: AgentPerformance;
    commandRouter: AgentPerformance;
  };
  
  // User interaction patterns
  interactions: {
    inputTypes: {
      queries: number;
      commands: number;
      questions: number;
      requests: number;
    };
    responseQuality: {
      helpful: number;
      accurate: number;
      complete: number;
      timely: number;
    };
  };
}

export interface ToolCallStats {
  totalCalls: number;
  successfulCalls: number;
  averageDuration: number;
  errorRate: number;
  lastUsed: string;
}

export interface AgentPerformance {
  totalExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  errorTypes: Record<string, number>;
  modelUsed: string;
}

/**
 * Evaluation criteria and thresholds
 */
export interface EvaluationCriteria {
  // Performance thresholds
  performanceThresholds: {
    maxResponseTime: number; // milliseconds
    minToolCallSuccessRate: number; // percentage
    maxAgentExecutionTime: number; // milliseconds
  };
  
  // Accuracy thresholds
  accuracyThresholds: {
    minRoutingSuccess: number; // percentage
    minQueryRelevance: number; // percentage
    minPlaybackSuccess: number; // percentage
  };
  
  // User experience thresholds
  userExperienceThresholds: {
    maxSessionDuration: number; // seconds
    minConversationFlow: number; // 1-10 rating
    maxErrorRate: number; // percentage
  };
}

/**
 * Evaluation result structure
 */
export interface EvaluationResult {
  sessionId: string;
  timestamp: string;
  metrics: EvaluationMetrics;
  dimensions: EvaluationDimensions;
  criteria: EvaluationCriteria;
  score: number; // Overall evaluation score (0-100)
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
  issues: string[];
}

/**
 * Trace event types for categorization
 */
export const TRACE_EVENT_TYPES = {
  // System events
  SYSTEM: [
    'application_started',
    'agents_initialized',
    'mcp_connected',
    'mcp_disconnected'
  ],
  
  // User interaction events
  USER_INTERACTION: [
    'user_input',
    'user_command',
    'user_query'
  ],
  
  // Command routing events
  ROUTING: [
    'command_router_result',
    'routing_to_lookup',
    'routing_to_playback',
    'routing_to_system'
  ],
  
  // Agent interaction events
  AGENT_INTERACTION: [
    'lookup_interaction_start',
    'lookup_interaction_success',
    'lookup_interaction_error',
    'playback_interaction_start',
    'playback_interaction_success',
    'playback_interaction_error'
  ],
  
  // Tool call events
  TOOL_CALLS: [
    'mcp_tool_call_start',
    'mcp_tool_call_end',
    'mcp_tool_call_error',
    'tool_call_start',
    'tool_call_end',
    'tool_call_error'
  ],
  
  // Error events
  ERRORS: [
    'error',
    'timeout',
    'connection_failed',
    'tool_failed'
  ]
} as const;

/**
 * Evaluation functions
 */
export interface EvaluationFunctions {
  // Calculate performance metrics
  calculatePerformanceMetrics: (traces: TraceEntry[]) => EvaluationMetrics['performance'];
  
  // Calculate accuracy metrics
  calculateAccuracyMetrics: (traces: TraceEntry[]) => EvaluationMetrics['accuracy'];
  
  // Calculate user experience metrics
  calculateUserExperienceMetrics: (traces: TraceEntry[]) => EvaluationMetrics['userExperience'];
  
  // Calculate system health metrics
  calculateSystemHealthMetrics: (traces: TraceEntry[]) => EvaluationMetrics['systemHealth'];
  
  // Evaluate routing performance
  evaluateRouting: (traces: TraceEntry[]) => EvaluationDimensions['routing'];
  
  // Evaluate tool call performance
  evaluateToolCalls: (traces: TraceEntry[]) => EvaluationDimensions['toolCalls'];
  
  // Evaluate agent performance
  evaluateAgents: (traces: TraceEntry[]) => EvaluationDimensions['agents'];
  
  // Evaluate user interactions
  evaluateInteractions: (traces: TraceEntry[]) => EvaluationDimensions['interactions'];
  
  // Generate overall evaluation score
  generateScore: (metrics: EvaluationMetrics, dimensions: EvaluationDimensions) => number;
  
  // Generate recommendations
  generateRecommendations: (result: EvaluationResult) => string[];
  
  // Identify issues
  identifyIssues: (result: EvaluationResult) => string[];
}

/**
 * Default evaluation criteria
 */
export const DEFAULT_EVALUATION_CRITERIA: EvaluationCriteria = {
  performanceThresholds: {
    maxResponseTime: 5000, // 5 seconds
    minToolCallSuccessRate: 95, // 95%
    maxAgentExecutionTime: 10000, // 10 seconds
  },
  accuracyThresholds: {
    minRoutingSuccess: 90, // 90%
    minQueryRelevance: 85, // 85%
    minPlaybackSuccess: 95, // 95%
  },
  userExperienceThresholds: {
    maxSessionDuration: 300, // 5 minutes
    minConversationFlow: 7, // 7/10
    maxErrorRate: 5, // 5%
  },
};

/**
 * Utility functions for trace analysis
 */
export const TraceAnalysisUtils = {
  /**
   * Get traces by type
   */
  getTracesByType: (traces: TraceEntry[], type: string): TraceEntry[] => {
    return traces.filter(trace => trace.type === type);
  },
  
  /**
   * Get traces by time range
   */
  getTracesByTimeRange: (traces: TraceEntry[], startTime: string, endTime: string): TraceEntry[] => {
    return traces.filter(trace => {
      const timestamp = new Date(trace.timestamp);
      const start = new Date(startTime);
      const end = new Date(endTime);
      return timestamp >= start && timestamp <= end;
    });
  },
  
  /**
   * Calculate duration between two traces
   */
  calculateDuration: (startTrace: TraceEntry, endTrace: TraceEntry): number => {
    const start = new Date(startTrace.timestamp);
    const end = new Date(endTrace.timestamp);
    return end.getTime() - start.getTime();
  },
  
  /**
   * Group traces by session
   */
  groupTracesBySession: (traces: TraceEntry[]): Record<string, TraceEntry[]> => {
    return traces.reduce((groups, trace) => {
      const sessionId = trace.sessionId;
      if (!groups[sessionId]) {
        groups[sessionId] = [];
      }
      groups[sessionId].push(trace);
      return groups;
    }, {} as Record<string, TraceEntry[]>);
  },
  
  /**
   * Extract user interactions from traces
   */
  extractUserInteractions: (traces: TraceEntry[]): TraceEntry[] => {
    return traces.filter(trace => 
      trace.type === 'user_input' || 
      trace.type === 'user_command' || 
      trace.type === 'user_query'
    );
  },
  
  /**
   * Extract tool calls from traces
   */
  extractToolCalls: (traces: TraceEntry[]): TraceEntry[] => {
    return traces.filter(trace => 
      trace.type.includes('tool_call') || 
      trace.type.includes('mcp_tool_call')
    );
  },
  
  /**
   * Extract agent executions from traces
   */
  extractAgentExecutions: (traces: TraceEntry[]): TraceEntry[] => {
    return traces.filter(trace => 
      trace.type.includes('interaction') || 
      trace.type === 'agent_execution'
    );
  }
}; 