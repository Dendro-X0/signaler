/**
 * Links Runner - Broken link detection
 */

import type { AuditRunner } from '../index.js';

// Link checking interfaces
export interface LinksConfig {
  baseUrl: string;
  maxDepth?: number;
  excludePatterns?: string[];
}

// Re-export links components (will be added during migration)
// export * from './runner.js';