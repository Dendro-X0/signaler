/**
 * Console Runner - Console error monitoring
 */

import type { AuditRunner } from '../index.js';

// Console monitoring interfaces
export interface ConsoleConfig {
  urls: string[];
  errorTypes?: string[];
  timeout?: number;
}

// Re-export console components (will be added during migration)
// export * from './runner.js';