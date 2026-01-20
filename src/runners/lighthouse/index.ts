/**
 * Lighthouse Runner - Lighthouse-based performance audits
 */

import type { AuditRunner } from '../index.js';

// Lighthouse-specific interfaces
/**
 * Configuration options for the Lighthouse runner.
 */
export interface LighthouseConfig {
  /**
   * The URL to be audited.
   */
  url: string;
  /**
   * The device to simulate (mobile or desktop).
   */
  device: 'mobile' | 'desktop';
  /**
   * The throttling method to use (simulate or devtools).
   */
  throttling: 'simulate' | 'devtools';
  /**
   * Optional categories to include in the audit.
   */
  categories?: string[];
}

// Export Lighthouse components
export * from './runner.js';
export * from './worker.js';
export * from './capture.js';