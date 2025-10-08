/**
 * Centralized error logging and monitoring
 * Can be extended to integrate with services like Sentry, LogRocket, etc.
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorLog {
  timestamp: Date;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 1000;

  /**
   * Log an error with context
   */
  log(error: Error | string, severity: ErrorSeverity = ErrorSeverity.MEDIUM, context?: Record<string, any>) {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      severity,
      message: typeof error === 'string' ? error : error.message,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
    };

    this.logs.push(errorLog);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${severity.toUpperCase()}]`, errorLog.message, context);
      if (errorLog.stack) {
        console.error(errorLog.stack);
      }
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorLog);
    }

    return errorLog;
  }

  /**
   * Send error to external monitoring service
   */
  private async sendToMonitoring(errorLog: ErrorLog) {
    try {
      // TODO: Integrate with Sentry, LogRocket, or custom monitoring service
      // Example:
      // await fetch('/api/log-error', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorLog),
      // });
      
      // For now, just store in console in production
      console.error('[ERROR]', errorLog);
    } catch (e) {
      console.error('Failed to send error to monitoring:', e);
    }
  }

  /**
   * Get recent error logs
   */
  getRecentLogs(count: number = 50): ErrorLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by severity
   */
  getLogsBySeverity(severity: ErrorSeverity): ErrorLog[] {
    return this.logs.filter(log => log.severity === severity);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();

/**
 * Convenience functions
 */
export function logError(error: Error | string, context?: Record<string, any>) {
  return errorLogger.log(error, ErrorSeverity.MEDIUM, context);
}

export function logCriticalError(error: Error | string, context?: Record<string, any>) {
  return errorLogger.log(error, ErrorSeverity.CRITICAL, context);
}

export function logWarning(message: string, context?: Record<string, any>) {
  return errorLogger.log(message, ErrorSeverity.LOW, context);
}

/**
 * Global error handler for uncaught errors
 */
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logCriticalError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logCriticalError(event.reason, {
      type: 'unhandledRejection',
      promise: String(event.promise),
    });
  });
}

