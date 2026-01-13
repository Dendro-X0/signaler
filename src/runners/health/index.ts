/**
 * Health Runner - HTTP health checks
 */

import type { AuditRunner } from '../index.js';

// Health check interfaces
export interface HealthConfig {
  urls: string[];
  timeout?: number;
  expectedStatus?: number[];
}

// Re-export health components (will be added during migration)
// export * from './runner.js';