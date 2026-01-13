/**
 * Lighthouse Runner - Lighthouse-based performance audits
 */

import type { AuditRunner } from '../index.js';

// Lighthouse-specific interfaces
export interface LighthouseConfig {
  url: string;
  device: 'mobile' | 'desktop';
  throttling: 'simulate' | 'devtools';
  categories?: string[];
}

// Export Lighthouse components
export * from './runner.js';
export * from './worker.js';
export * from './capture.js';