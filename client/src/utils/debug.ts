// client/src/utils/debug.ts

/**
 * Debug utility for conditional logging
 * Only logs in development mode
 */
export const debug = {
  /**
   * Logs a debug message only in development mode
   * @param message - The message to log
   * @param data - Optional data to log
   */
  log: (message: string, data?: unknown): void => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEBUG] ${message}`, data || "");
    }
  },

  /**
   * Logs an error message
   * @param message - The error message
   * @param error - Optional error object
   */
  error: (message: string, error?: unknown): void => {
    console.error(`[ERROR] ${message}`, error || "");
  },

  /**
   * Logs a warning message
   * @param message - The warning message
   * @param data - Optional data to log
   */
  warn: (message: string, data?: unknown): void => {
    console.warn(`[WARN] ${message}`, data || "");
  },

  /**
   * Logs an info message
   * @param message - The info message
   * @param data - Optional data to log
   */
  info: (message: string, data?: unknown): void => {
    console.info(`[INFO] ${message}`, data || "");
  },
};

export default debug;
