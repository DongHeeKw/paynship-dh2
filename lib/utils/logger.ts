/**
 * Simple logger utility that only logs in development mode
 * Use this instead of console.log for development debugging
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log debug information (only in development)
   */
  debug: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Log info messages (only in development)
   */
  info: (prefix: string, message: string, data?: unknown) => {
    if (isDev) {
      if (data !== undefined) {
        console.log(`[${prefix}] ${message}`, data);
      } else {
        console.log(`[${prefix}] ${message}`);
      }
    }
  },

  /**
   * Log warnings (always shown)
   */
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Log errors (always shown)
   */
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error);
  },

  /**
   * Log LLM-related messages (only in development)
   */
  llm: (message: string, data?: unknown) => {
    if (isDev) {
      if (data !== undefined) {
        console.log(`[LLM] ${message}`, data);
      } else {
        console.log(`[LLM] ${message}`);
      }
    }
  },

  /**
   * Log router/orchestrator messages (only in development)
   */
  router: (message: string, data?: unknown) => {
    if (isDev) {
      if (data !== undefined) {
        console.log(`[Router] ${message}`, data);
      } else {
        console.log(`[Router] ${message}`);
      }
    }
  },

  /**
   * Log scraper-related messages (only in development)
   */
  scraper: (message: string, data?: unknown) => {
    if (isDev) {
      if (data !== undefined) {
        console.log(`[Scraper] ${message}`, data);
      } else {
        console.log(`[Scraper] ${message}`);
      }
    }
  },

  /**
   * Log cache-related messages (only in development)
   */
  cache: (message: string, data?: unknown) => {
    if (isDev) {
      if (data !== undefined) {
        console.log(`[Cache] ${message}`, data);
      } else {
        console.log(`[Cache] ${message}`);
      }
    }
  },

  /**
   * Log API-related messages (only in development)
   */
  api: (message: string, data?: unknown) => {
    if (isDev) {
      if (data !== undefined) {
        console.log(`[API] ${message}`, data);
      } else {
        console.log(`[API] ${message}`);
      }
    }
  },

  /**
   * Log pipeline-related messages (only in development)
   * Used by ProductDataPipeline for multi-source extraction
   */
  pipeline: (message: string, data?: unknown) => {
    if (isDev) {
      if (data !== undefined) {
        console.log(`[Pipeline] ${message}`, data);
      } else {
        console.log(`[Pipeline] ${message}`);
      }
    }
  },
};

export default logger;
