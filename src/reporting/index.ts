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
/**
 * Report generator contract for producing formatted outputs from an audit result.
 */
export interface ReportGenerator {
  generate(data: AuditResult, format: OutputFormat): Promise<Report>;
  getSupportedFormats(): OutputFormat[];
}

/**
 * Generated report output and metadata.
 */
export interface Report {
  format: OutputFormat;
  content: string | Buffer;
  metadata: ReportMetadata;
}

/**
 * Metadata describing a generated report.
 */
export interface ReportMetadata {
  generatedAt: string;
  version: string;
  source: string;
  generationTimeMs?: number;
  pageCount?: number;
  streamingUsed?: boolean;
}

/**
 * Supported output formats for report generation.
 */
export type OutputFormat = 'html' | 'json' | 'markdown' | 'csv';

// Re-export reporting modules
export * from './generators/index.js';
// export * from './formatters/index.js';
// export * from './artifacts/index.js';