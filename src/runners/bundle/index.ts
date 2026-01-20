/**
 * Bundle Runner - Bundle analysis and size checking
 */

import type { AuditRunner } from '../index.js';

// Bundle analysis interfaces
/**
 * Configuration options for the bundle analysis runner.
 */
export interface BundleConfig {
  buildDir: string;
  patterns?: string[];
  sizeThresholds?: Record<string, number>;
}

// Re-export bundle components (will be added during migration)
// export * from './runner.js';