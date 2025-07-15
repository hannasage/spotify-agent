import { debug } from './debug';

/**
 * Natural language command parser for system commands
 * Detects when users want to perform system actions through natural language
 */
export class NaturalLanguageCommandParser {
  private commandPatterns: Array<{
    patterns: RegExp[];
    command: string;
    description: string;
  }> = [
    {
      patterns: [
        /^(show|display|get|what are|what's|check)\s+(my\s+)?(song\s+)?(pool\s+)?(stats|statistics|status|info|information)/i,
        /^(pool\s+)?(stats|statistics|status|info|information)/i,
        /^how\s+(many|much)\s+(songs?|tracks?)\s+(are\s+)?(in\s+)?(the\s+)?(pool|available)/i,
        /^(song\s+)?(pool\s+)?(size|count|total)/i
      ],
      command: '/pool-stats',
      description: 'Show song pool statistics'
    },
    {
      patterns: [
        /^(refresh|reload|update|refill|replenish)\s+(the\s+)?(song\s+)?(pool|songs?|tracks?)/i,
        /^(get\s+)?(new|fresh|more)\s+(songs?|tracks?)\s+(for\s+)?(the\s+)?(pool|queue)/i,
        /^(pool\s+)?(refresh|reload|update)/i,
        /^(fetch|load)\s+(new|more)\s+(songs?|tracks?)/i
      ],
      command: '/refresh-pool',
      description: 'Refresh the song pool'
    },
    {
      patterns: [
        /^(start|begin|enable|turn\s+on|activate)\s+(the\s+)?(auto\s*[\-\s]?queue|automatic\s+queue)/i,
        /^(auto\s*[\-\s]?queue)\s+(start|begin|on|enable)/i,
        /^(start|begin)\s+(auto|automatic)\s+(music|queueing|queuing)/i,
        /^(turn\s+on|enable)\s+(continuous|automatic)\s+(music|playback)/i
      ],
      command: '/auto-queue',
      description: 'Start auto-queue system'
    },
    {
      patterns: [
        /^(stop|end|disable|turn\s+off|deactivate)\s+(the\s+)?(auto\s*[\-\s]?queue|automatic\s+queue)/i,
        /^(auto\s*[\-\s]?queue)\s+(stop|end|off|disable)/i,
        /^(stop|end)\s+(auto|automatic)\s+(music|queueing|queuing)/i,
        /^(turn\s+off|disable)\s+(continuous|automatic)\s+(music|playback)/i
      ],
      command: '/stop-queue',
      description: 'Stop auto-queue system'
    },
    {
      patterns: [
        /^(show|display|get|what's|check)\s+(my\s+)?(song\s+)?(history|recent\s+songs?|recent\s+tracks?)/i,
        /^(recent|last)\s+(songs?|tracks?|music)/i,
        /^(song\s+)?(history|recent\s+songs?|recent\s+tracks?)/i,
        /^what\s+(songs?|tracks?)\s+(have\s+)?(i\s+)?(played|listened\s+to)\s+(recently|lately)/i
      ],
      command: '/history-songs',
      description: 'Show recent song history'
    },
    {
      patterns: [
        /^(clear|delete|remove|reset)\s+(my\s+)?(song\s+)?(history|recent\s+songs?|recent\s+tracks?)/i,
        /^(song\s+)?(history\s+)?(clear|delete|remove|reset)/i,
        /^(forget|erase)\s+(my\s+)?(recent\s+)?(songs?|tracks?|music)/i
      ],
      command: '/clear-history-songs',
      description: 'Clear song history'
    },
    {
      patterns: [
        /^(show|display|get|what's|check)\s+(the\s+)?(agent|system|multi[\-\s]?agent)\s+(status|info|information)/i,
        /^(agent|system)\s+(status|info|information)/i,
        /^(what\s+)?(agents?|systems?)\s+(are\s+)?(running|active|available)/i,
        /^(multi[\-\s]?agent)\s+(status|info|information)/i
      ],
      command: '/agents',
      description: 'Show agent system status'
    },
    {
      patterns: [
        /^(show|display|get)\s+(help|commands?|instructions?)/i,
        /^(help|commands?|instructions?)/i,
        /^(what\s+)?(can\s+)?(i\s+)?(do|say|ask)/i,
        /^(how\s+)?(do\s+)?(i\s+)?(use\s+)?(this|the\s+system)/i
      ],
      command: '/help',
      description: 'Show help information'
    },
    {
      patterns: [
        /^(clear|delete|remove|reset)\s+(the\s+)?(conversation|chat|history)/i,
        /^(conversation|chat)\s+(clear|delete|remove|reset)/i,
        /^(start|begin)\s+(over|fresh|new)/i,
        /^(forget|erase)\s+(our\s+)?(conversation|chat)/i
      ],
      command: '/clear',
      description: 'Clear conversation history'
    },
    {
      patterns: [
        /^(show|display|get|what's|check)\s+(the\s+)?(conversation|chat)\s+(history|count|size)/i,
        /^(conversation|chat)\s+(history|count|size)/i,
        /^(how\s+)?(many|much)\s+(messages?|exchanges?)\s+(do\s+)?(we\s+)?(have)/i
      ],
      command: '/history',
      description: 'Show conversation history count'
    }
  ];

  /**
   * Parse user input to detect natural language system commands
   * @param input - User input string
   * @returns Command string if detected, null otherwise
   */
  parseCommand(input: string): string | null {
    const trimmedInput = input.trim();
    
    // Skip empty input
    if (!trimmedInput) return null;
    
    // Skip if it's already a slash command
    if (trimmedInput.startsWith('/')) return null;
    
    // Check each command pattern
    for (const commandDef of this.commandPatterns) {
      for (const pattern of commandDef.patterns) {
        if (pattern.test(trimmedInput)) {
          debug.log(`🔍 [COMMAND-PARSER] Detected natural language command: "${trimmedInput}" -> ${commandDef.command}`);
          return commandDef.command;
        }
      }
    }
    
    return null;
  }

  /**
   * Get all available natural language commands for help/debugging
   * @returns Array of command definitions
   */
  getAvailableCommands(): Array<{command: string; description: string; examples: string[]}> {
    return this.commandPatterns.map(cmdDef => ({
      command: cmdDef.command,
      description: cmdDef.description,
      examples: cmdDef.patterns.slice(0, 2).map(pattern => {
        // Convert regex back to example text (simplified)
        const source = pattern.source
          .replace(/\^|\$/g, '')
          .replace(/\\\s\+/g, ' ')
          .replace(/\s\+/g, ' ')
          .replace(/\[\-\\s\]\?/g, '-')
          .replace(/\?/g, '')
          .replace(/\|/g, ' or ')
          .replace(/\(/g, '')
          .replace(/\)/g, '')
          .replace(/i$/, '');
        return source;
      })
    }));
  }

  /**
   * Check if input might be a system command attempt
   * @param input - User input string
   * @returns True if input looks like a system command attempt
   */
  looksLikeSystemCommand(input: string): boolean {
    const systemKeywords = [
      'show', 'display', 'get', 'check', 'start', 'stop', 'clear', 'refresh',
      'pool', 'stats', 'history', 'agent', 'help', 'queue', 'auto', 'conversation'
    ];
    
    const words = input.toLowerCase().split(/\s+/);
    return words.some(word => systemKeywords.includes(word));
  }
}