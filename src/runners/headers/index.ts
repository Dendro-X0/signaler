/**
 * Headers Runner - Security headers checking
 */

import type { AuditRunner } from '../index.js';

// Security headers interfaces
export interface HeadersConfig {
  urls: string[];
  requiredHeaders?: string[];
  securityChecks?: boolean;
}

// Re-export headers components (will be added during migration)
// export * from './runner.js';