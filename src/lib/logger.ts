import { AppError, ErrorSeverity, ErrorSource } from './error-utils';

/**
 * A centralized logger that formats and outputs logs in a consistent way.
 * This can be extended to send logs to external services like LogRocket, Sentry, etc.
 */

// Enable/disable different log types based on environment
const LOG_CONFIG = {
  ALL: true,
  ERRORS: true,
  WARNINS: true,
  INFO: true,
  DEBUG: true,
  PERFORMANCE: true,
};

// Use colors in development for better readability
const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  GREEN: '\x1b[32m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
};

// Use color only in Node.js environment
const useColors = typeof window === 'undefined' && process.env.NODE_ENV !== 'production';

/**
 * Format a log message with appropriate colors based on severity
 */
function formatLogMessage(severity: ErrorSeverity, source: ErrorSource, message: string): string {
  if (!useColors) {
    return `[${severity}][${source}] ${message}`;
  }

  let color = COLORS.RESET;
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      color = COLORS.RED;
      break;
    case ErrorSeverity.ERROR:
      color = COLORS.RED;
      break;
    case ErrorSeverity.WARNING:
      color = COLORS.YELLOW;
      break;
    case ErrorSeverity.INFO:
      color = COLORS.GREEN;
      break;
    default:
      color = COLORS.RESET;
  }

  return `${color}[${severity}][${source}]${COLORS.RESET} ${message}`;
}

/**
 * Enhanced logger function that adds additional metadata and controls log output
 */
export function serverLogger(error: AppError): void {
  // Clone the error to avoid modifying the original
  const logError = { ...error };
  
  // Add request ID if available
  if (typeof process !== 'undefined' && (process as any).requestId) {
    logError.requestId = (process as any).requestId;
  }
  
  // Format the message
  const formattedMessage = formatLogMessage(
    logError.severity,
    logError.source,
    logError.message
  );
  
  // Determine if this log should be output based on config
  let shouldLog = LOG_CONFIG.ALL;
  
  switch (logError.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.ERROR:
      shouldLog = LOG_CONFIG.ERRORS;
      break;
    case ErrorSeverity.WARNING:
      shouldLog = LOG_CONFIG.WARNINGS;
      break;
    case ErrorSeverity.INFO:
      shouldLog = LOG_CONFIG.INFO;
      break;
    default:
      shouldLog = LOG_CONFIG.DEBUG;
  }
  
  if (!shouldLog) {
    return;
  }
  
  // Output to the appropriate console method
  switch (logError.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.ERROR:
      console.error(formattedMessage, logError);
      break;
    case ErrorSeverity.WARNING:
      console.warn(formattedMessage, logError);
      break;
    case ErrorSeverity.INFO:
      console.info(formattedMessage, logError);
      break;
    default:
      console.log(formattedMessage, logError);
  }
  
  // You could send critical errors to an external monitoring service here
  if (logError.severity === ErrorSeverity.CRITICAL && process.env.NODE_ENV === 'production') {
    // e.g. sendToErrorMonitoring(logError);
  }
}

/**
 * Track performance of async operations
 */
export function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  source: ErrorSource = ErrorSource.API
): Promise<T> {
  if (!LOG_CONFIG.PERFORMANCE) {
    return fn();
  }

  const startTime = Date.now();
  return fn()
    .then((result) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log performance data
      serverLogger({
        message: `Operation '${operation}' completed in ${duration}ms`,
        source,
        severity: ErrorSeverity.INFO,
        details: { operation, duration },
        timestamp: new Date().toISOString(),
      });
      
      return result;
    })
    .catch((error) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log performance data with error
      serverLogger({
        message: `Operation '${operation}' failed after ${duration}ms`,
        source,
        severity: ErrorSeverity.ERROR,
        details: { operation, duration, error },
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    });
} 