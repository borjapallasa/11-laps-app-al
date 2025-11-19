import { postMessageService } from './postMessageService';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logging Service
 * Centralized logging that forwards to parent app via postMessage
 * Also logs to console for development
 */
class LogService {
  /**
   * Log a message with specific level
   */
  log(level: LogLevel, message: string, data?: any): void {
    // Console logging for development
    const consoleMethod = level === 'debug' ? 'log' : level;
    console[consoleMethod](`[ElevenLabs ${level.toUpperCase()}]`, message, data || '');

    // Send to parent app
    postMessageService.sendLog(level, message, data);
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log error message
   */
  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  /**
   * Report error with full error object
   */
  reportError(error: Error | string, context?: string): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const logMessage = context ? `${context}: ${errorMessage}` : errorMessage;

    this.error(logMessage, {
      error: typeof error === 'string' ? error : {
        message: error.message,
        name: error.name,
        stack: error.stack
      },
      context
    });

    // Also report to parent's error handler
    postMessageService.reportError(error);
  }
}

// Export singleton instance
export const logService = new LogService();

// Convenience export
export default logService;

