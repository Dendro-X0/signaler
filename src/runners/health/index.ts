/**
 * Health Runner - HTTP health checks
 */

import type { AuditRunner } from '../index.js';

// Health check interfaces
/**
 * Configuration options for the health check runner.
 */
export interface HealthConfig {
  /**
   * List of URLs to perform health checks on.
   */
  urls: string[];
  /**
   * Optional timeout in milliseconds for the health check.
   */
  timeout?: number;
  /**
   * Optional expected HTTP status code(s) for a successful health check.
   */
  expectedStatus?: number[];
}

// Re-export health components (will be added during migration)
// export * from './runner.js';