/**
 * Reporting Module - Output generation and formatting
 * 
 * This module handles all report generation, data formatting,
 * and artifact management functionality.
 */

// Import AuditResult from core
import type { AuditResult } from '../core/audit-engine.js';

// Re-export for external use
export type { AuditResult } from '../core/audit-engine.js';

// Reporting interfaces
export interface ReportGenerator {
  generate(data: AuditResult, format: OutputFormat): Promise<Report>;
  getSupportedFormats(): OutputFormat[];
}

export interface Report {
  format: OutputFormat;
  content: string | Buffer;
  metadata: ReportMetadata;
}

export interface ReportMetadata {
  generatedAt: string;
  version: string;
  source: string;
}

export type OutputFormat = 'html' | 'json' | 'markdown' | 'csv';

// Re-export reporting modules (will be added during migration)
// export * from './generators/index.js';
// export * from './formatters/index.js';
// export * from './artifacts/index.js';