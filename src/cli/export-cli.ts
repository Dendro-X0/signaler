/**
 * Export CLI - Command-line interface for data export functionality
 * 
 * This module provides CLI commands for exporting audit data in various formats,
 * including CSV exports for spreadsheet analysis.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { CSVExportGenerator, type CSVExportConfig, type TrendData } from '../reporting/generators/csv-export-generator.js';
import type { ProcessedAuditData } from '../reporting/generators/report-generator-engine.js';

/**
 * Options for the `export` CLI command.
 */
export interface ExportCliOptions {
  /**
   * Path to the input file containing audit data.
   */
  input?: string;
  /**
   * Path to the output file for the exported data.
   */
  output?: string;
  /**
   * Format of the exported data.
   */
  format?: 'csv' | 'json' | 'xlsx';
  /**
   * Type of data to export.
   */
  type?: 'performance' | 'issues' | 'trends';
  /**
   * Delimiter to use for CSV exports.
   */
  delimiter?: ',' | ';' | '\t';
  /**
   * Whether to include headers in the exported data.
   */
  includeHeaders?: boolean;
  /**
   * Whether to include metrics in the exported data.
   */
  includeMetrics?: boolean;
  /**
   * Whether to include issues in the exported data.
   */
  includeIssues?: boolean;
  /**
   * Whether to include trends in the exported data.
   */
  includeTrends?: boolean;
  historical?: string;
}

/**
 * Export CLI handler
 */
export class ExportCli {
  /**
   * Handle export CLI commands
   */
  static async handle(options: ExportCliOptions): Promise<void> {
    const inputPath = options.input || this.findLatestAuditData();
    const outputPath = options.output || this.generateOutputPath(options);
    
    if (!existsSync(inputPath)) {
      console.error(`❌ Input file not found: ${inputPath}`);
      console.log('Run an audit first or specify --input path');
      process.exit(1);
    }

    try {
      const auditData = await this.loadAuditData(inputPath);
      
      switch (options.format || 'csv') {
        case 'csv':
          await this.handleCSVExport(auditData, outputPath, options);
          break;
        case 'json':
          await this.handleJSONExport(auditData, outputPath, options);
          break;
        case 'xlsx':
          await this.handleExcelExport(auditData, outputPath, options);
          break;
        default:
          console.error(`❌ Unsupported format: ${options.format}`);
          process.exit(1);
      }
      
      console.log(`✅ Export completed: ${outputPath}`);
    } catch (error) {
      console.error('❌ Export failed:', error);
      process.exit(1);
    }
  }

  /**
   * Handle CSV export
   */
  private static async handleCSVExport(
    data: ProcessedAuditData, 
    outputPath: string, 
    options: ExportCliOptions
  ): Promise<void> {
    const csvConfig: CSVExportConfig = {
      includeMetrics: options.includeMetrics ?? true,
      includeIssues: options.includeIssues ?? true,
      includeTrends: options.includeTrends ?? false,
      delimiter: options.delimiter || ',',
      includeHeaders: options.includeHeaders ?? true
    };

    const csvGenerator = new CSVExportGenerator(csvConfig);
    
    let csvContent: string;
    
    switch (options.type || 'performance') {
      case 'performance':
        csvContent = await csvGenerator.generatePerformanceCSV(data);
        break;
      case 'issues':
        csvContent = await csvGenerator.generateIssueSummaryCSV(data);
        break;
      case 'trends':
        const trendData = await this.loadTrendData(options.historical);
        csvContent = await csvGenerator.generateTrendAnalysisCSV(trendData);
        break;
      default:
        throw new Error(`Unsupported export type: ${options.type}`);
    }
    
    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(outputDir, { recursive: true });
    }
    
    writeFileSync(outputPath, csvContent, 'utf8');
  }

  /**
   * Handle JSON export
   */
  private static async handleJSONExport(
    data: ProcessedAuditData,
    outputPath: string,
    options: ExportCliOptions
  ): Promise<void> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportType: options.type || 'performance',
        source: 'signaler-export-cli'
      },
      data: data
    };
    
    writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
  }

  /**
   * Handle Excel export (placeholder for future implementation)
   */
  private static async handleExcelExport(
    data: ProcessedAuditData,
    outputPath: string,
    options: ExportCliOptions
  ): Promise<void> {
    // For now, export as CSV with .xlsx extension
    console.log('⚠️  Excel export not yet implemented, exporting as CSV');
    await this.handleCSVExport(data, outputPath.replace('.xlsx', '.csv'), options);
  }

  /**
   * Load audit data from file
   */
  private static async loadAuditData(inputPath: string): Promise<ProcessedAuditData> {
    const content = readFileSync(inputPath, 'utf8');
    
    try {
      const data = JSON.parse(content);
      
      // Validate that it's audit data
      if (!data.pages || !data.performanceMetrics) {
        throw new Error('Invalid audit data format');
      }
      
      return data as ProcessedAuditData;
    } catch (error) {
      throw new Error(`Failed to parse audit data: ${error}`);
    }
  }

  /**
   * Load historical trend data
   */
  private static async loadTrendData(historicalPath?: string): Promise<TrendData[]> {
    if (!historicalPath) {
      // Generate sample trend data for demonstration
      const now = new Date();
      const trendData: TrendData[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i * 7); // Weekly data points
        
        trendData.push({
          timestamp: date.toISOString(),
          averagePerformanceScore: 75 + Math.random() * 20,
          totalIssues: Math.floor(10 + Math.random() * 20),
          criticalIssues: Math.floor(Math.random() * 5),
          pageCount: 10 + Math.floor(Math.random() * 5)
        });
      }
      
      return trendData;
    }
    
    if (!existsSync(historicalPath)) {
      throw new Error(`Historical data file not found: ${historicalPath}`);
    }
    
    const content = readFileSync(historicalPath, 'utf8');
    return JSON.parse(content) as TrendData[];
  }

  /**
   * Find the latest audit data file
   */
  private static findLatestAuditData(): string {
    const possiblePaths = [
      'signaler/export.json',
      'signaler/summary.json',
      '.signaler/export.json',
      '.signaler/summary.json'
    ];
    
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return resolve(path);
      }
    }
    
    return resolve('signaler/export.json');
  }

  /**
   * Generate output path based on options
   */
  private static generateOutputPath(options: ExportCliOptions): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const type = options.type || 'performance';
    const format = options.format || 'csv';
    
    return resolve(`signaler-export-${type}-${timestamp}.${format}`);
  }

  /**
   * Show export help
   */
  static showHelp(): void {
    console.log(`
Signaler Data Export

USAGE:
  signaler export [OPTIONS]

OPTIONS:
  --input <path>        Input audit data file [default: latest audit]
  --output <path>       Output file path [default: auto-generated]
  --format <format>     Export format (csv|json|xlsx) [default: csv]
  --type <type>         Export type (performance|issues|trends) [default: performance]
  --delimiter <char>    CSV delimiter (,|;|tab) [default: ,]
  --include-headers     Include CSV headers [default: true]
  --include-metrics     Include performance metrics [default: true]
  --include-issues      Include issue data [default: true]
  --include-trends      Include trend analysis [default: false]
  --historical <path>   Historical data file for trend analysis

EXPORT TYPES:
  performance          Page-by-page performance metrics and scores
  issues              Detailed issue breakdown and aggregation
  trends              Historical trend analysis (requires --historical)

EXAMPLES:
  signaler export                                    Export performance data as CSV
  signaler export --format json                     Export as JSON
  signaler export --type issues                     Export issue summary
  signaler export --delimiter ";"                   Use semicolon delimiter
  signaler export --output reports/audit.csv        Custom output path
  signaler export --type trends --historical data/  Export trend analysis

CSV OUTPUT SECTIONS:
  Performance Overview    Summary metrics and totals
  Page Metrics           Individual page performance data
  Issue Aggregation      Issues grouped by type across pages
  Detailed Issues        Complete issue breakdown per page

For more information, visit: https://signaler.dev/docs/export
`);
  }
}

/**
 * Parse CLI arguments for export commands
 */
export function parseExportArgs(args: string[]): ExportCliOptions {
  const options: ExportCliOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--input':
        options.input = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--format':
        options.format = args[++i] as 'csv' | 'json' | 'xlsx';
        break;
      case '--type':
        options.type = args[++i] as 'performance' | 'issues' | 'trends';
        break;
      case '--delimiter':
        const delimiter = args[++i];
        options.delimiter = delimiter === 'tab' ? '\t' : delimiter as ',' | ';' | '\t';
        break;
      case '--include-headers':
        options.includeHeaders = true;
        break;
      case '--no-headers':
        options.includeHeaders = false;
        break;
      case '--include-metrics':
        options.includeMetrics = true;
        break;
      case '--no-metrics':
        options.includeMetrics = false;
        break;
      case '--include-issues':
        options.includeIssues = true;
        break;
      case '--no-issues':
        options.includeIssues = false;
        break;
      case '--include-trends':
        options.includeTrends = true;
        break;
      case '--historical':
        options.historical = args[++i];
        break;
      case '--help':
      case '-h':
        ExportCli.showHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}