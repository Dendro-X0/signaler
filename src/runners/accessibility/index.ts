/**
 * Accessibility Runner - A11y audits using axe-core
 */

import type { AuditRunner } from '../index.js';

// Accessibility-specific interfaces
/**
 * Configuration options for the accessibility runner.
 */
export interface AccessibilityConfig {
  /**
   * The URL to run the accessibility audit on.
   */
  url: string;
  /**
   * Optional list of rules to include in the audit.
   */
  rules?: string[];
  /**
   * Optional list of tags to include in the audit.
   */
  tags?: string[];
}

// Re-export accessibility components (will be added during migration)
// export * from './runner.js';