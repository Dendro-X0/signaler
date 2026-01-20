/**
 * Console Runner - Console error monitoring
 */

import type { AuditRunner } from '../index.js';

// Console monitoring interfaces
/**
 * Configuration options for the console monitoring runner.
 */
export interface ConsoleConfig {
  /**
   * List of URLs to monitor for console errors.
   */
  urls: string[];
  /**
   * Optional list of error types to monitor (e.g. 'error', 'warning', 'info').
   */
  errorTypes?: string[];
  /**
   * Optional timeout in milliseconds for the monitoring process.
   */
  timeout?: number;
}

// Re-export console components (will be added during migration)
// export * from './runner.js';