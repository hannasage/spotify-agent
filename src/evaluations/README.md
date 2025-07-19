# Spotify Agent Evaluation System

A comprehensive evaluation framework for analyzing the performance and behavior of the Spotify agent system based on trace data.

## Overview

The evaluation system provides detailed metrics and analysis of:
- **Performance**: Response times, tool call efficiency, agent execution speed
- **Accuracy**: Command routing, query relevance, playback success rates
- **User Experience**: Session duration, interaction patterns, conversation flow
- **System Health**: Agent initialization, connection stability, error rates

## Components

### Schema (`schema.ts`)
Defines the data structures and interfaces for:
- `TraceData`: Raw trace data structure
- `EvaluationMetrics`: Core performance metrics
- `EvaluationDimensions`: Detailed analysis dimensions
- `EvaluationResult`: Complete evaluation output
- `EvaluationCriteria`: Thresholds and criteria for scoring

### Evaluator (`evaluator.ts`)
Main evaluation engine that:
- Loads and processes trace data
- Calculates comprehensive metrics
- Generates scores and grades
- Identifies issues and recommendations

### CLI (`cli.ts`)
Command-line interface for:
- Evaluating individual sessions
- Batch evaluation of multiple sessions
- Generating summary reports
- Exporting results to JSON

## Usage

### Command Line Interface

```bash
# Evaluate a single session
node dist/evaluations/cli.js evaluate ./data/traces/session_123.json

# Evaluate all sessions in a directory
node dist/evaluations/cli.js evaluate-all ./data/traces

# Generate summary report
node dist/evaluations/cli.js summary ./data/traces report.json

# Show help
node dist/evaluations/cli.js --help
```

### Programmatic Usage

```typescript
import { SpotifyAgentEvaluator, EvaluationCriteria } from './evaluations';

// Create evaluator with custom criteria
const criteria: EvaluationCriteria = {
  performanceThresholds: {
    maxResponseTime: 3000, // 3 seconds
    minToolCallSuccessRate: 98, // 98%
    maxAgentExecutionTime: 5000 // 5 seconds
  },
  accuracyThresholds: {
    minRoutingAccuracy: 95, // 95%
    minQueryRelevance: 90, // 90%
    minPlaybackSuccess: 98 // 98%
  },
  userExperienceThresholds: {
    maxSessionDuration: 600, // 10 minutes
    minConversationFlow: 8, // 8/10
    maxErrorRate: 2 // 2%
  }
};

const evaluator = new SpotifyAgentEvaluator(criteria);

// Load and evaluate trace data
const traceData = evaluator.loadTraceData('./data/traces/session_123.json');
const result = evaluator.evaluateSession(traceData);

console.log(`Score: ${result.score}/100 (Grade: ${result.grade})`);
console.log('Issues:', result.issues);
console.log('Recommendations:', result.recommendations);
```

## Metrics Explained

### Performance Metrics
- **Average Response Time**: Time between user input and system response
- **Total Tool Calls**: Number of MCP tool invocations
- **Tool Call Success Rate**: Percentage of successful tool calls
- **Average Tool Call Duration**: Mean time for tool execution
- **Agent Execution Time**: Time spent in agent processing

### Accuracy Metrics
- **Command Routing Accuracy**: Percentage of correct agent selections
- **Lookup Query Relevance**: Relevance of search results to queries
- **Playback Command Success**: Success rate of playback operations
- **Response Completeness**: Completeness of agent responses

### User Experience Metrics
- **Session Duration**: Total time of user session
- **Interactions per Session**: Number of user inputs
- **Average Input Length**: Mean length of user inputs
- **Conversation Flow**: Quality rating of conversation (1-10)
- **Error Recovery Rate**: Ability to recover from errors

### System Health Metrics
- **Agent Initialization Success**: Whether agents started correctly
- **MCP Connection Stability**: Connection reliability percentage
- **Trace Data Integrity**: Completeness of trace data
- **Error Frequency**: Rate of errors per session

## Scoring System

The evaluation generates an overall score (0-100) and grade (A-F):

- **A (90-100)**: Excellent performance
- **B (80-89)**: Good performance with minor issues
- **C (70-79)**: Acceptable performance with some concerns
- **D (60-69)**: Below average performance
- **F (0-59)**: Poor performance requiring immediate attention

## Trace Event Types

The system categorizes trace events into:

### System Events
- `application_started`
- `agents_initialized`
- `mcp_connected`
- `mcp_disconnected`

### User Interaction Events
- `user_input`
- `user_command`
- `user_query`

### Command Routing Events
- `command_router_result`
- `routing_to_lookup`
- `routing_to_playback`
- `routing_to_system`

### Agent Interaction Events
- `lookup_interaction_start`
- `lookup_interaction_success`
- `lookup_interaction_error`
- `playback_interaction_start`
- `playback_interaction_success`
- `playback_interaction_error`

### Tool Call Events
- `mcp_tool_call_start`
- `mcp_tool_call_end`
- `mcp_tool_call_error`
- `tool_call_start`
- `tool_call_end`
- `tool_call_error`

### Error Events
- `error`
- `timeout`
- `connection_failed`
- `tool_failed`

## Customization

### Custom Evaluation Criteria
You can customize thresholds and criteria by modifying the `EvaluationCriteria` interface:

```typescript
const customCriteria: EvaluationCriteria = {
  performanceThresholds: {
    maxResponseTime: 2000, // Stricter response time
    minToolCallSuccessRate: 99, // Higher success rate requirement
    maxAgentExecutionTime: 3000 // Faster agent execution
  },
  // ... other thresholds
};
```

### Custom Metrics
Extend the evaluation system by adding new metrics to the `EvaluationMetrics` interface and implementing calculation logic in the evaluator.

## Output Formats

### Console Output
The CLI provides formatted console output with:
- Overall score and grade
- Detailed metrics by category
- Issues and recommendations
- Summary statistics for batch evaluations

### JSON Output
Programmatic access returns structured JSON data suitable for:
- Further analysis
- Integration with monitoring systems
- Historical trend analysis
- Automated reporting

## Integration

The evaluation system can be integrated with:
- **CI/CD Pipelines**: Automated performance testing
- **Monitoring Systems**: Real-time performance tracking
- **Analytics Platforms**: Historical trend analysis
- **Alerting Systems**: Performance degradation notifications

## Future Enhancements

Planned improvements include:
- **Machine Learning**: Automated pattern recognition
- **Predictive Analytics**: Performance forecasting
- **Comparative Analysis**: Benchmarking against historical data
- **Real-time Evaluation**: Live performance monitoring
- **Custom Metrics**: User-defined evaluation criteria
- **Visualization**: Charts and graphs for metrics
- **Export Formats**: CSV, Excel, and other formats 