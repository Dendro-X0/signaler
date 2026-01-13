/**
 * Accessibility Runner - A11y audits using axe-core
 */

import type { AuditRunner } from '../index.js';

// Accessibility-specific interfaces
export interface AccessibilityConfig {
  url: string;
  rules?: string[];
  tags?: string[];
}

// Re-export accessibility components (will be added during migration)
// export * from './runner.js';