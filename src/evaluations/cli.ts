#!/usr/bin/env node

/**
 * Spotify Agent Evaluation CLI
 * 
 * Command-line tool for evaluating Spotify agent system performance
 * based on trace data.
 */

import * as fs from 'fs';
import { SpotifyAgentEvaluator } from './evaluator';
import { EvaluationResult } from './schema';

class EvaluationCLI {
  private evaluator: SpotifyAgentEvaluator;

  constructor() {
    this.evaluator = new SpotifyAgentEvaluator();
  }

  /**
   * Main CLI entry point
   */
  async run(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }

    const command = args[0];
    
    switch (command) {
      case 'evaluate':
        await this.evaluateSession(args.slice(1));
        break;
      case 'evaluate-all':
        await this.evaluateAllSessions(args.slice(1));
        break;
      case 'summary':
        await this.generateSummary(args.slice(1));
        break;
      default:
        console.error(`Unknown command: ${command}`);
        this.showHelp();
        process.exit(1);
    }
  }

  /**
   * Evaluate a single session
   */
  async evaluateSession(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.error('Usage: evaluate <trace-file-path>');
      process.exit(1);
    }

    const traceFilePath = args[0];
    
    if (!traceFilePath) {
      console.error('Trace file path is required');
      process.exit(1);
    }
    
    try {
      console.log(`🔍 Evaluating session from: ${traceFilePath}`);
      
      const traceData = this.evaluator.loadTraceData(traceFilePath);
      const result = this.evaluator.evaluateSession(traceData);
      
      this.printEvaluationResult(result);
      
    } catch (error) {
      console.error(`❌ Error evaluating session: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Evaluate all sessions in a directory
   */
  async evaluateAllSessions(args: string[]): Promise<void> {
    const tracesDir = args[0] || './data/traces';
    
    try {
      console.log(`🔍 Evaluating all sessions from: ${tracesDir}`);
      
      const allTraceData = this.evaluator.loadAllTraceData(tracesDir);
      const results: EvaluationResult[] = [];
      
      for (const traceData of allTraceData) {
        const result = this.evaluator.evaluateSession(traceData);
        results.push(result);
      }
      
      this.printSummaryResults(results);
      
    } catch (error) {
      console.error(`❌ Error evaluating sessions: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Generate summary report
   */
  async generateSummary(args: string[]): Promise<void> {
    const tracesDir = args[0] || './data/traces';
    const outputFile = args[1];
    
    try {
      console.log(`📊 Generating summary report from: ${tracesDir}`);
      
      const allTraceData = this.evaluator.loadAllTraceData(tracesDir);
      const results: EvaluationResult[] = [];
      
      for (const traceData of allTraceData) {
        const result = this.evaluator.evaluateSession(traceData);
        results.push(result);
      }
      
      const summary = this.generateSummaryReport(results);
      
      if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));
        console.log(`✅ Summary report saved to: ${outputFile}`);
      } else {
        console.log(JSON.stringify(summary, null, 2));
      }
      
    } catch (error) {
      console.error(`❌ Error generating summary: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Print evaluation result
   */
  private printEvaluationResult(result: EvaluationResult): void {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 EVALUATION REPORT - Session: ${result.sessionId}`);
    console.log('='.repeat(60));
    
    // Overall score
    console.log(`\n🎯 Overall Score: ${result.score.toFixed(1)}/100 (Grade: ${result.grade})`);
    
    // Performance metrics
    console.log('\n⚡ PERFORMANCE METRICS:');
    console.log(`  • Overall Average Response Time: ${result.metrics.performance.averageResponseTime.toFixed(0)}ms`);
    console.log(`  • System Commands: ${result.metrics.performance.agentResponseTimes.systemCommands.toFixed(0)}ms`);
    console.log(`  • Lookup Agent: ${result.metrics.performance.agentResponseTimes.lookupAgent.toFixed(0)}ms`);
    console.log(`  • Playback Agent: ${result.metrics.performance.agentResponseTimes.playbackAgent.toFixed(0)}ms`);
    console.log(`  • Total Tool Calls: ${result.metrics.performance.totalToolCalls}`);
    console.log(`  • Tool Call Success Rate: ${result.metrics.performance.toolCallSuccessRate.toFixed(1)}%`);
    console.log(`  • Average Tool Call Duration: ${result.metrics.performance.averageToolCallDuration.toFixed(0)}ms`);
    
    // Accuracy metrics
    console.log('\n🎯 ACCURACY METRICS:');
    console.log(`  • Command Routing Accuracy: ${result.metrics.accuracy.commandRoutingAccuracy.toFixed(1)}%`);
    console.log(`  • Lookup Query Relevance: ${result.metrics.accuracy.lookupQueryRelevance.toFixed(1)}%`);
    console.log(`  • Playback Command Success: ${result.metrics.accuracy.playbackCommandSuccess.toFixed(1)}%`);
    console.log(`  • Response Completeness: ${result.metrics.accuracy.responseCompleteness.toFixed(1)}%`);
    
    // User experience metrics
    console.log('\n👤 USER EXPERIENCE METRICS:');
    console.log(`  • Session Duration: ${result.metrics.userExperience.sessionDuration.toFixed(0)}s`);
    console.log(`  • Interactions per Session: ${result.metrics.userExperience.interactionsPerSession}`);
    console.log(`  • Average Input Length: ${result.metrics.userExperience.averageInputLength.toFixed(1)} chars`);
    console.log(`  • Conversation Flow: ${result.metrics.userExperience.conversationFlow.toFixed(1)}/10`);
    console.log(`  • Error Recovery Rate: ${result.metrics.userExperience.errorRecoveryRate.toFixed(1)}%`);
    
    // System health metrics
    console.log('\n🔧 SYSTEM HEALTH METRICS:');
    console.log(`  • Agent Initialization: ${result.metrics.systemHealth.agentInitializationSuccess ? '✅ Success' : '❌ Failed'}`);
    console.log(`  • MCP Connection Stability: ${result.metrics.systemHealth.mcpConnectionStability.toFixed(1)}%`);
    console.log(`  • Trace Data Integrity: ${result.metrics.systemHealth.traceDataIntegrity.toFixed(1)}%`);
    console.log(`  • Error Frequency: ${result.metrics.systemHealth.errorFrequency.toFixed(2)}%`);
    
    // Agent performance
    console.log('\n🤖 AGENT PERFORMANCE:');
    console.log(`  • Lookup Agent: ${result.dimensions.agents.lookupAgent.successRate.toFixed(1)}% success rate`);
    console.log(`  • Playback Agent: ${result.dimensions.agents.playbackAgent.successRate.toFixed(1)}% success rate`);
    console.log(`  • Command Router: ${result.dimensions.agents.commandRouter.successRate.toFixed(1)}% success rate`);
    
    // Tool usage
    console.log('\n🛠️  TOOL USAGE:');
    Object.entries(result.dimensions.toolCalls.mcpTools).forEach(([toolName, stats]) => {
      console.log(`  • ${toolName}: ${stats.totalCalls} calls, ${stats.successfulCalls} successful (${stats.errorRate.toFixed(1)}% error rate)`);
    });
    
    // Issues and recommendations
    if (result.issues.length > 0) {
      console.log('\n⚠️  ISSUES IDENTIFIED:');
      result.issues.forEach(issue => console.log(`  • ${issue}`));
    }
    
    if (result.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      result.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Print summary of multiple results
   */
  private printSummaryResults(results: EvaluationResult[]): void {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 SUMMARY REPORT - ${results.length} Sessions`);
    console.log('='.repeat(60));
    
    if (results.length === 0) {
      console.log('No sessions found to evaluate.');
      return;
    }
    
    // Calculate averages
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.metrics.performance.averageResponseTime, 0) / results.length;
    const avgToolCallSuccess = results.reduce((sum, r) => sum + r.metrics.performance.toolCallSuccessRate, 0) / results.length;
    const avgRoutingAccuracy = results.reduce((sum, r) => sum + r.metrics.accuracy.commandRoutingAccuracy, 0) / results.length;
    
    // Calculate per-agent averages (only include sessions with non-zero values)
    const systemCommandTimes = results.map(r => r.metrics.performance.agentResponseTimes.systemCommands).filter(t => t > 0);
    const lookupAgentTimes = results.map(r => r.metrics.performance.agentResponseTimes.lookupAgent).filter(t => t > 0);
    const playbackAgentTimes = results.map(r => r.metrics.performance.agentResponseTimes.playbackAgent).filter(t => t > 0);
    
    const avgSystemCommandTime = systemCommandTimes.length > 0 
      ? systemCommandTimes.reduce((sum, t) => sum + t, 0) / systemCommandTimes.length 
      : 0;
    const avgLookupAgentTime = lookupAgentTimes.length > 0 
      ? lookupAgentTimes.reduce((sum, t) => sum + t, 0) / lookupAgentTimes.length 
      : 0;
    const avgPlaybackAgentTime = playbackAgentTimes.length > 0 
      ? playbackAgentTimes.reduce((sum, t) => sum + t, 0) / playbackAgentTimes.length 
      : 0;
    
    // Grade distribution
    const gradeDistribution = results.reduce((acc, r) => {
      acc[r.grade] = (acc[r.grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n🎯 OVERALL PERFORMANCE:`);
    console.log(`  • Average Score: ${avgScore.toFixed(1)}/100`);
    console.log(`  • Overall Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`  • System Commands: ${avgSystemCommandTime.toFixed(0)}ms (${systemCommandTimes.length} sessions)`);
    console.log(`  • Lookup Agent: ${avgLookupAgentTime.toFixed(0)}ms (${lookupAgentTimes.length} sessions)`);
    console.log(`  • Playback Agent: ${avgPlaybackAgentTime.toFixed(0)}ms (${playbackAgentTimes.length} sessions)`);
    console.log(`  • Average Tool Call Success Rate: ${avgToolCallSuccess.toFixed(1)}%`);
    console.log(`  • Average Routing Accuracy: ${avgRoutingAccuracy.toFixed(1)}%`);
    
    console.log(`\n📈 GRADE DISTRIBUTION:`);
    Object.entries(gradeDistribution).forEach(([grade, count]) => {
      const percentage = (count / results.length) * 100;
      console.log(`  • Grade ${grade}: ${count} sessions (${percentage.toFixed(1)}%)`);
    });
    
    // Best and worst sessions
    const bestSession = results.reduce((best, current) => current.score > best.score ? current : best);
    const worstSession = results.reduce((worst, current) => current.score < worst.score ? current : worst);
    
    console.log(`\n🏆 BEST SESSION:`);
    console.log(`  • Session ID: ${bestSession.sessionId}`);
    console.log(`  • Score: ${bestSession.score.toFixed(1)}/100 (Grade: ${bestSession.grade})`);
    
    console.log(`\n📉 WORST SESSION:`);
    console.log(`  • Session ID: ${worstSession.sessionId}`);
    console.log(`  • Score: ${worstSession.score.toFixed(1)}/100 (Grade: ${worstSession.grade})`);
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Generate summary report object
   */
  private generateSummaryReport(results: EvaluationResult[]): any {
    if (results.length === 0) {
      return { message: 'No sessions found to evaluate' };
    }
    
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.metrics.performance.averageResponseTime, 0) / results.length;
    const avgToolCallSuccess = results.reduce((sum, r) => sum + r.metrics.performance.toolCallSuccessRate, 0) / results.length;
    
    const gradeDistribution = results.reduce((acc, r) => {
      acc[r.grade] = (acc[r.grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      summary: {
        totalSessions: results.length,
        averageScore: avgScore,
        averageResponseTime: avgResponseTime,
        averageToolCallSuccessRate: avgToolCallSuccess,
        gradeDistribution
      },
      sessions: results.map(r => ({
        sessionId: r.sessionId,
        score: r.score,
        grade: r.grade,
        timestamp: r.timestamp
      }))
    };
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
🎵 Spotify Agent Evaluation CLI

Usage: node cli.js <command> [options]

Commands:
  evaluate <trace-file>     Evaluate a single session from trace file
  evaluate-all [dir]        Evaluate all sessions in directory (default: ./data/traces)
  summary [dir] [output]    Generate summary report (optional output file)

Examples:
  node cli.js evaluate ./data/traces/session_123.json
  node cli.js evaluate-all ./data/traces
  node cli.js summary ./data/traces report.json

Options:
  --help, -h               Show this help message
    `);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new EvaluationCLI();
  cli.run().catch(error => {
    console.error('❌ CLI Error:', error);
    process.exit(1);
  });
} 