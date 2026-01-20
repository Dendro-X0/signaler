/**
 * Links Runner - Broken link detection
 */

import type { AuditRunner } from '../index.js';

// Link checking interfaces
/**
 * Configuration options for the broken link detection runner.
 */
export interface LinksConfig {
  /**
   * The base URL to use for relative link resolution.
   */
  baseUrl: string;
  /**
   * The maximum depth to crawl for links.
   */
  maxDepth?: number;
  /**
   * An array of patterns to exclude from link checking.
   */
  excludePatterns?: string[];
}

// Re-export links components (will be added during migration)
// export * from './runner.js';