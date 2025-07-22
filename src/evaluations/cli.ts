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
import { APP_METADATA } from '../constants';

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
      case 'evaluate-version':
        await this.evaluateVersion(args.slice(1));
        break;
      case 'evaluate-all-versions':
        await this.evaluateAllVersions(args.slice(1));
        break;
      case 'compare-versions':
        await this.compareVersions(args.slice(1));
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
    console.log(`  • Spotify Agent: ${result.metrics.performance.agentResponseTimes.spotifyAgent.toFixed(0)}ms`);
    console.log(`  • Total Tool Calls: ${result.metrics.performance.totalToolCalls}`);
    console.log(`  • Tool Call Success Rate: ${result.metrics.performance.toolCallSuccessRate.toFixed(1)}%`);
    console.log(`  • Average Tool Call Duration: ${result.metrics.performance.averageToolCallDuration.toFixed(0)}ms`);
    
    // Accuracy metrics
    console.log('\n🎯 ACCURACY METRICS:');
    console.log(`  • Command Routing Success: ${result.metrics.accuracy.commandRoutingSuccess.toFixed(1)}%`);
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
    console.log(`  • Unified Spotify Agent: ${result.dimensions.agents.spotifyAgent.successRate.toFixed(1)}% success rate`);
    console.log(`  • Command Router: ${result.dimensions.agents.commandRouter?.successRate?.toFixed(1) || 0}% success rate`);
    
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
    const avgRoutingSuccess = results.reduce((sum, r) => sum + r.metrics.accuracy.commandRoutingSuccess, 0) / results.length;
    
    // Calculate per-agent averages (only include sessions with non-zero values)
    const systemCommandTimes = results.map(r => r.metrics.performance.agentResponseTimes.systemCommands).filter(t => t > 0);
    const spotifyAgentTimes = results.map(r => r.metrics.performance.agentResponseTimes.spotifyAgent).filter(t => t > 0);
    
    const avgSystemCommandTime = systemCommandTimes.length > 0 
      ? systemCommandTimes.reduce((sum, t) => sum + t, 0) / systemCommandTimes.length 
      : 0;
    const avgSpotifyAgentTime = spotifyAgentTimes.length > 0 
      ? spotifyAgentTimes.reduce((sum, t) => sum + t, 0) / spotifyAgentTimes.length 
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
    console.log(`  • Spotify Agent: ${avgSpotifyAgentTime.toFixed(0)}ms (${spotifyAgentTimes.length} sessions)`);
    console.log(`  • Average Tool Call Success Rate: ${avgToolCallSuccess.toFixed(1)}%`);
    console.log(`  • Average Routing Success: ${avgRoutingSuccess.toFixed(1)}%`);
    
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
   * Evaluate all sessions in a specific version directory
   */
  async evaluateVersion(args: string[]): Promise<void> {
    // Check for --current flag
    const hasCurrentFlag = args.includes('--current');
    
    let version: string;
    let baseTracesDir: string;
    
    if (hasCurrentFlag) {
      version = APP_METADATA.VERSION;
      // Remove --current flag from args and get base directory if provided
      const filteredArgs = args.filter(arg => arg !== '--current');
      baseTracesDir = filteredArgs[0] || './data/traces';
    } else {
      if (args.length === 0) {
        console.error('Usage: evaluate-version <version|--current> [base-traces-dir]');
        console.error('Examples:');
        console.error('  evaluate-version v1.1');
        console.error('  evaluate-version --current');
        console.error('  evaluate-version --current ./custom/traces');
        process.exit(1);
      }
      version = args[0]!;
      baseTracesDir = args[1] || './data/traces';
    }

    const versionDir = `${baseTracesDir}/${version}`;
    
    try {
      const versionLabel = hasCurrentFlag ? `${version} (current)` : version;
      console.log(`🔍 Evaluating version ${versionLabel} from: ${versionDir}`);
      
      if (!fs.existsSync(versionDir)) {
        console.error(`❌ Version directory does not exist: ${versionDir}`);
        if (hasCurrentFlag) {
          console.error(`💡 Hint: Current version is ${version}. Try running the app first to generate traces.`);
        }
        process.exit(1);
      }

      const allTraceData = this.evaluator.loadAllTraceData(versionDir);
      const results: EvaluationResult[] = [];
      
      for (const traceData of allTraceData) {
        const result = this.evaluator.evaluateSession(traceData);
        results.push(result);
      }
      
      console.log(`\n📊 VERSION ${version?.toUpperCase()} EVALUATION RESULTS`);
      this.printSummaryResults(results);
      
    } catch (error) {
      console.error(`❌ Error evaluating version ${version}: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Evaluate all versions
   */
  async evaluateAllVersions(args: string[]): Promise<void> {
    const baseTracesDir = args[0] || './data/traces';
    
    try {
      console.log(`🔍 Evaluating all versions from: ${baseTracesDir}`);
      
      if (!fs.existsSync(baseTracesDir)) {
        console.error(`❌ Base traces directory does not exist: ${baseTracesDir}`);
        process.exit(1);
      }

      // Find all version directories
      const entries = fs.readdirSync(baseTracesDir, { withFileTypes: true });
      const versionDirs = entries
        .filter(entry => entry.isDirectory() && entry.name.startsWith('v'))
        .map(entry => entry.name)
        .sort();

      if (versionDirs.length === 0) {
        console.error('❌ No version directories found');
        process.exit(1);
      }

      for (const version of versionDirs) {
        const versionDir = `${baseTracesDir}/${version}`;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 EVALUATING VERSION ${version.toUpperCase()}`);
        console.log(`${'='.repeat(60)}`);
        
        const allTraceData = this.evaluator.loadAllTraceData(versionDir);
        const results: EvaluationResult[] = [];
        
        for (const traceData of allTraceData) {
          const result = this.evaluator.evaluateSession(traceData);
          results.push(result);
        }
        
        this.printSummaryResults(results);
      }
      
    } catch (error) {
      console.error(`❌ Error evaluating all versions: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(args: string[]): Promise<void> {
    if (args.length < 2) {
      console.error('Usage: compare-versions <version1> <version2> [base-traces-dir]');
      process.exit(1);
    }

    const version1 = args[0];
    const version2 = args[1];
    const baseTracesDir = args[2] || './data/traces';
    
    try {
      console.log(`🔍 Comparing ${version1} vs ${version2}`);
      
      // Evaluate both versions
      const v1Dir = `${baseTracesDir}/${version1}`;
      const v2Dir = `${baseTracesDir}/${version2}`;
      
      if (!fs.existsSync(v1Dir)) {
        console.error(`❌ Version ${version1} directory does not exist: ${v1Dir}`);
        process.exit(1);
      }
      
      if (!fs.existsSync(v2Dir)) {
        console.error(`❌ Version ${version2} directory does not exist: ${v2Dir}`);
        process.exit(1);
      }

      const v1TraceData = this.evaluator.loadAllTraceData(v1Dir);
      const v2TraceData = this.evaluator.loadAllTraceData(v2Dir);
      
      const v1Results: EvaluationResult[] = [];
      const v2Results: EvaluationResult[] = [];
      
      for (const traceData of v1TraceData) {
        v1Results.push(this.evaluator.evaluateSession(traceData));
      }
      
      for (const traceData of v2TraceData) {
        v2Results.push(this.evaluator.evaluateSession(traceData));
      }
      
      this.printVersionComparison(version1!, v1Results, version2!, v2Results);
      
    } catch (error) {
      console.error(`❌ Error comparing versions: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Print version comparison
   */
  private printVersionComparison(
    v1: string, 
    v1Results: EvaluationResult[], 
    v2: string, 
    v2Results: EvaluationResult[]
  ): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 VERSION COMPARISON: ${v1.toUpperCase()} vs ${v2.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);
    
    if (v1Results.length === 0 || v2Results.length === 0) {
      console.log('❌ Cannot compare: One or both versions have no data');
      return;
    }

    // Calculate averages for v1
    const v1AvgScore = v1Results.reduce((sum, r) => sum + r.score, 0) / v1Results.length;
    const v1AvgResponseTime = v1Results.reduce((sum, r) => sum + r.metrics.performance.averageResponseTime, 0) / v1Results.length;
    const v1AvgSystemTime = this.getAvgAgentTime(v1Results, 'systemCommands');
    const v1AvgSpotifyTime = this.getAvgAgentTime(v1Results, 'spotifyAgent');
    
    // Calculate averages for v2
    const v2AvgScore = v2Results.reduce((sum, r) => sum + r.score, 0) / v2Results.length;
    const v2AvgResponseTime = v2Results.reduce((sum, r) => sum + r.metrics.performance.averageResponseTime, 0) / v2Results.length;
    const v2AvgSystemTime = this.getAvgAgentTime(v2Results, 'systemCommands');
    const v2AvgSpotifyTime = this.getAvgAgentTime(v2Results, 'spotifyAgent');

    // Calculate changes
    const scoreChange = v2AvgScore - v1AvgScore;
    const responseTimeChange = v2AvgResponseTime - v1AvgResponseTime;
    const systemTimeChange = v2AvgSystemTime - v1AvgSystemTime;
    const spotifyTimeChange = v2AvgSpotifyTime - v1AvgSpotifyTime;

    console.log(`\n🎯 PERFORMANCE CHANGES:`);
    console.log(`  • Overall Score: ${v1AvgScore.toFixed(1)} → ${v2AvgScore.toFixed(1)} (${this.formatChange(scoreChange, 1, true)} ${this.getChangeIcon(scoreChange, true)})`);
    console.log(`  • Overall Response Time: ${v1AvgResponseTime.toFixed(0)}ms → ${v2AvgResponseTime.toFixed(0)}ms (${this.formatChange(responseTimeChange, 0)} ${this.getChangeIcon(responseTimeChange, false)})`);
    
    if (v1AvgSystemTime > 0 && v2AvgSystemTime > 0) {
      console.log(`  • System Commands: ${v1AvgSystemTime.toFixed(0)}ms → ${v2AvgSystemTime.toFixed(0)}ms (${this.formatChange(systemTimeChange, 0)} ${this.getChangeIcon(systemTimeChange, false)})`);
    }
    
    if (v1AvgSpotifyTime > 0 && v2AvgSpotifyTime > 0) {
      console.log(`  • Spotify Agent: ${v1AvgSpotifyTime.toFixed(0)}ms → ${v2AvgSpotifyTime.toFixed(0)}ms (${this.formatChange(spotifyTimeChange, 0)} ${this.getChangeIcon(spotifyTimeChange, false)})`);
    }

    console.log(`\n📊 SESSION COUNTS:`);
    console.log(`  • ${v1}: ${v1Results.length} sessions`);
    console.log(`  • ${v2}: ${v2Results.length} sessions`);
  }

  /**
   * Get average agent time for a specific agent type
   */
  private getAvgAgentTime(results: EvaluationResult[], agentType: 'systemCommands' | 'spotifyAgent'): number {
    const times = results.map(r => r.metrics.performance.agentResponseTimes[agentType]).filter(t => t > 0);
    return times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
  }

  /**
   * Format change value with percentage
   */
  private formatChange(change: number, decimals: number, _isHigherBetter: boolean = false): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(decimals)}`;
  }

  /**
   * Get change icon (✓ for improvement, ⚠ for regression)
   */
  private getChangeIcon(change: number, isHigherBetter: boolean = false): string {
    if (Math.abs(change) < 0.1) return '→'; // No significant change
    
    const isImprovement = isHigherBetter ? change > 0 : change < 0;
    return isImprovement ? '✓' : '⚠️';
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
🎵 Spotify Agent Evaluation CLI

Usage: node cli.js <command> [options]

Commands:
  evaluate <trace-file>                     Evaluate a single session from trace file
  evaluate-all [dir]                        Evaluate all sessions in directory (default: ./data/traces)
  evaluate-version <version|--current> [base-dir]  Evaluate all sessions for a specific version or current version
  evaluate-all-versions [base-dir]          Evaluate all versions separately  
  compare-versions <v1> <v2> [base-dir]     Compare performance between two versions
  summary [dir] [output]                    Generate summary report (optional output file)

Examples:
  node cli.js evaluate ./data/traces/v1.1/session_123.json
  node cli.js evaluate-all ./data/traces/v1.1
  node cli.js evaluate-version v1.1
  node cli.js evaluate-version --current
  node cli.js evaluate-all-versions
  node cli.js compare-versions v1.0 v1.1
  node cli.js summary ./data/traces/v1.1 report.json

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