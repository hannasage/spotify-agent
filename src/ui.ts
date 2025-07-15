import chalk from 'chalk';
import figlet from 'figlet';
import boxen from 'boxen';
import clear from 'clear';
import ora, { Ora } from 'ora';

export class UIManager {
  private currentSpinner: Ora | null = null;
  private isSpinnerActive: boolean = false;

  /**
   * Clear the console
   */
  clearConsole(): void {
    clear();
  }

  /**
   * Display the application banner
   */
  showBanner(): void {
    console.log(
      chalk.cyan(
        figlet.textSync('SPOTIFY AGENT', {
          font: 'Standard',
          horizontalLayout: 'fitted',
          verticalLayout: 'default'
        })
      )
    );
    console.log(chalk.gray('🎵 AI-Powered Spotify Control • Built with OpenAI Agents & MCP\n'));
  }

  /**
   * Show connection status in a styled box
   */
  showConnectionStatus(status: 'connecting' | 'connected' | 'error', message?: string): void {
    const statusConfig = {
      connecting: {
        color: chalk.yellow,
        icon: '🔄',
        title: 'CONNECTING',
        defaultMessage: 'Establishing connection to Spotify MCP Server...'
      },
      connected: {
        color: chalk.green,
        icon: '✅',
        title: 'CONNECTED',
        defaultMessage: 'Successfully connected to Spotify MCP Server'
      },
      error: {
        color: chalk.red,
        icon: '❌',
        title: 'CONNECTION ERROR',
        defaultMessage: 'Failed to connect to Spotify MCP Server'
      }
    };

    const config = statusConfig[status];
    const displayMessage = message || config.defaultMessage;

    console.log(
      boxen(
        `${config.icon} ${config.color.bold(config.title)}\n${chalk.white(displayMessage)}`,
        {
          padding: 1,
          margin: { top: 0, bottom: 1, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: status === 'connected' ? 'green' : status === 'error' ? 'red' : 'yellow'
        }
      )
    );
  }

  /**
   * Show welcome instructions
   */
  showWelcomeInstructions(): void {
    const instructions = [
      chalk.cyan.bold('🎶 Available Commands:'),
      '',
      chalk.white('• ') + chalk.green('play jazz music') + chalk.gray(' - Search and play music'),
      chalk.white('• ') + chalk.green('skip song') + chalk.gray(' - Skip to next track'),
      chalk.white('• ') + chalk.green('pause music') + chalk.gray(' - Pause current playback'),
      chalk.white('• ') + chalk.green('set volume to 70%') + chalk.gray(' - Adjust volume level'),
      chalk.white('• ') + chalk.green('what\'s playing?') + chalk.gray(' - Get current track info'),
      chalk.white('• ') + chalk.green('create playlist "Coding Vibes"') + chalk.gray(' - Create new playlist'),
      '',
      chalk.yellow('📝 Special Commands:'),
      chalk.white('• ') + chalk.magenta('/help') + chalk.gray(' - Show detailed help'),
      chalk.white('• ') + chalk.magenta('exit') + chalk.gray(' - Quit the application'),
      ''
    ];

    console.log(
      boxen(
        instructions.join('\n'),
        {
          padding: 1,
          margin: { top: 0, bottom: 1, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'cyan'
        }
      )
    );
  }

  /**
   * Start a loading spinner with custom text
   */
  startSpinner(text: string): void {
    this.stopSpinner();
    try {
      this.currentSpinner = ora({
        text: chalk.cyan(text),
        spinner: 'dots',
        color: 'cyan',
        discardStdin: false  // Prevent readline interface conflicts
      }).start();
      this.isSpinnerActive = true;
    } catch (error) {
      // Fallback: if spinner fails, just show a simple message
      console.log(chalk.cyan('⏳ ' + text));
      this.isSpinnerActive = false;
    }
  }

  /**
   * Update spinner text
   */
  updateSpinner(text: string): void {
    if (this.currentSpinner) {
      this.currentSpinner.text = chalk.cyan(text);
    }
  }

  /**
   * Stop the current spinner
   */
  stopSpinner(): void {
    if (this.currentSpinner && this.isSpinnerActive) {
      try {
        this.currentSpinner.stop();
      } catch (error) {
        // Silently handle spinner stop errors to prevent REPL disruption
        console.error('Warning: Error stopping spinner:', error);
      } finally {
        this.currentSpinner = null;
        this.isSpinnerActive = false;
      }
    }
  }

  /**
   * Show success message
   */
  showSuccess(message: string): void {
    this.stopSpinner();
    console.log(chalk.green('✅ ' + message));
  }

  /**
   * Show error message
   */
  showError(message: string, details?: string): void {
    this.stopSpinner();
    console.log(chalk.red('❌ ' + message));
    if (details) {
      console.log(chalk.gray('   ' + details));
    }
  }

  /**
   * Show info message
   */
  showInfo(message: string): void {
    const formattedMessage = this.parseMarkdownFormatting(message);
    console.log(chalk.blue('ℹ️  ') + chalk.white(formattedMessage));
  }

  /**
   * Show warning message
   */
  showWarning(message: string): void {
    console.log(chalk.yellow('⚠️  ' + message));
  }

  /**
   * Parse markdown-style formatting in text
   * Converts **bold** to chalk.bold formatting
   */
  private parseMarkdownFormatting(text: string): string {
    // Replace **text** with chalk.bold formatting
    return text.replace(/\*\*(.*?)\*\*/g, (match, content) => {
      return chalk.bold.yellow(content); // Bold + yellow for emphasis
    });
  }

  /**
   * Format bot response with proper styling
   */
  formatBotResponse(response: string): string {
    // Parse markdown formatting first
    const formattedResponse = this.parseMarkdownFormatting(response);
    
    // Add music note emoji and cyan color to bot responses
    return chalk.cyan('🎵 ANA-LOG: ') + chalk.white(formattedResponse);
  }

  /**
   * Get styled prompt string
   */
  getPrompt(): string {
    return chalk.magenta('🎧 You: ');
  }

  /**
   * Show help information
   */
  showHelp(): void {
    const helpContent = [
      chalk.cyan.bold('🎵 SPOTIFY AGENT HELP'),
      '',
      chalk.yellow.bold('Music Control:'),
      chalk.white('  play [artist/song/genre]') + chalk.gray(' - Play music by search term'),
      chalk.white('  pause') + chalk.gray('                   - Pause current playback'),
      chalk.white('  resume') + chalk.gray('                  - Resume playback'),
      chalk.white('  skip') + chalk.gray('                    - Skip to next track'),
      chalk.white('  previous') + chalk.gray('                - Go to previous track'),
      chalk.white('  shuffle on/off') + chalk.gray('          - Toggle shuffle mode'),
      '',
      chalk.yellow.bold('Volume & Devices:'),
      chalk.white('  set volume to [0-100]%') + chalk.gray('   - Adjust volume level'),
      chalk.white('  list devices') + chalk.gray('             - Show available devices'),
      chalk.white('  switch to [device]') + chalk.gray('       - Change playback device'),
      '',
      chalk.yellow.bold('Library & Playlists:'),
      chalk.white('  what\'s playing?') + chalk.gray('          - Get current track info'),
      chalk.white('  save this song') + chalk.gray('           - Add current song to library'),
      chalk.white('  create playlist "[name]"') + chalk.gray(' - Create new playlist'),
      chalk.white('  add to playlist "[name]"') + chalk.gray(' - Add current song to playlist'),
      '',
      chalk.yellow.bold('Search & Discovery:'),
      chalk.white('  search for [query]') + chalk.gray('       - Search Spotify catalog'),
      chalk.white('  show my playlists') + chalk.gray('        - List your playlists'),
      chalk.white('  play playlist "[name]"') + chalk.gray('   - Play specific playlist'),
      '',
      chalk.yellow.bold('System Commands:'),
      chalk.white('  /help') + chalk.gray('                   - Show this help message'),
      chalk.white('  /clear') + chalk.gray('                  - Clear conversation history'),
      chalk.white('  /history') + chalk.gray('                - Show conversation history count'),
      chalk.white('  /agents') + chalk.gray('                 - Show multi-agent system status'),
      chalk.white('  /auto-queue') + chalk.gray('              - Start automatic queue management'),
      chalk.white('  /stop-queue') + chalk.gray('              - Stop automatic queue management'),
      chalk.white('  /history-songs') + chalk.gray('            - Show recent song history (last 12)'),
      chalk.white('  /clear-history-songs') + chalk.gray('       - Clear song history'),
      chalk.white('  exit') + chalk.gray('                    - Quit the application'),
      '',
      chalk.green('💡 Tips:'),
      chalk.gray('• Use natural language - the AI understands context'),
      chalk.gray('• Be specific with artist or song names for better results'),
      chalk.gray('• The agent will confirm destructive actions before executing'),
      chalk.gray('• Try "start auto-queue mode" for continuous music recommendations'),
      chalk.gray('• Multi-agent system handles complex tasks via intelligent handoffs'),
      ''
    ];

    console.log(
      boxen(
        helpContent.join('\n'),
        {
          padding: 1,
          margin: { top: 1, bottom: 1, left: 0, right: 0 },
          borderStyle: 'double',
          borderColor: 'cyan'
        }
      )
    );
  }

  /**
   * Show goodbye message
   */
  showGoodbye(): void {
    console.log(
      boxen(
        chalk.cyan.bold('👋 Thanks for using Spotify Agent!') + '\n' +
        chalk.gray('Hope you enjoyed the music! 🎵'),
        {
          padding: 1,
          margin: { top: 1, bottom: 0, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'cyan',
          textAlignment: 'center'
        }
      )
    );
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopSpinner();
    // Force cleanup of any remaining spinner state
    this.currentSpinner = null;
    this.isSpinnerActive = false;
  }
}