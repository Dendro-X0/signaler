/**
 * Headers Runner - Security headers checking
 */

import type { AuditRunner } from '../index.js';

// Security headers interfaces
/**
 * Configuration options for the security headers runner.
 */
export interface HeadersConfig {
  /**
   * List of URLs to check for security headers.
   */
  urls: string[];
  /**
   * List of required security headers.
   */
  requiredHeaders?: string[];
  /**
   * Flag to enable security checks.
   */
  securityChecks?: boolean;
}

// Re-export headers components (will be added during migration)
// export * from './runner.js';