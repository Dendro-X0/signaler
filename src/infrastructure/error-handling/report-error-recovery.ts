/**
 * Report Error Recovery - Specialized error recovery for report generation
 * 
 * This module provides specific error recovery strategies for report generation,
 * including fallback to minimal reports and partial report generation.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { 
  ErrorHandler, 
  SignalerError, 
  FileSystemError, 
  DataProcessingError, 
  PerformanceError,
  RecoveryResult 
} from './index.js';
import type { ProcessedAuditData, ReportGeneratorConfig } from '../../reporting/generators/report-generator-engine.js';
import { getMemoryStatus } from '../../utils/memory-monitor.js';

export interface MinimalReportConfig {
  readonly includeBasicMetrics: boolean;
  readonly includeTopIssues: boolean;
  readonly maxIssuesCount: number;
  readonly outputFormat: 'json' | 'markdown' | 'text';
}

export interface PartialReportResult {
  success: boolean;
  generatedFiles: string[];
  skippedReports: string[];
  errors: string[];
  fallbackUsed: string;
}

export interface ReportRecoveryContext {
  readonly outputDirectory: string;
  readonly requestedFormats: string[];
  readonly originalData: ProcessedAuditData;
  readonly config: ReportGeneratorConfig;
}

/**
 * Specialized error recovery for report generation operations
 */
export class ReportErrorRecovery {
  private readonly errorHandler: ErrorHandler;
  private readonly minimalConfig: MinimalReportConfig;

  constructor(errorHandler: ErrorHandler, minimalConfig?: Partial<MinimalReportConfig>) {
    this.errorHandler = errorHandler;
    this.minimalConfig = {
      includeBasicMetrics: true,
      includeTopIssues: true,
      maxIssuesCount: 5,
      outputFormat: 'markdown',
      ...minimalConfig
    };
  }

  /**
   * Generate minimal reports when full report generation fails
   */
  public async generateMinimalReports(
    context: ReportRecoveryContext,
    originalError: SignalerError
  ): Promise<PartialReportResult> {
    const result: PartialReportResult = {
      success: false,
      generatedFiles: [],
      skippedReports: [],
      errors: [],
      fallbackUsed: 'minimal_reports'
    };

    try {
      // Ensure output directory exists
      await this.ensureOutputDirectory(context.outputDirectory);

      // Generate essential reports only
      const essentialReports = await this.generateEssentialReports(context);
      result.generatedFiles.push(...essentialReports.files);
      result.errors.push(...essentialReports.errors);

      // Generate error report
      const errorReportPath = await this.generateErrorReport(context, originalError);
      result.generatedFiles.push(errorReportPath);

      result.success = result.generatedFiles.length > 0;
      result.skippedReports = context.requestedFormats.filter(
        format => !result.generatedFiles.some(file => file.includes(format))
      );

    } catch (recoveryError) {
      const errorMessage = recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
      result.errors.push(`Minimal report generation failed: ${errorMessage}`);
      
      // Last resort: create text summary
      try {
        const summaryPath = await this.generateTextSummary(context, originalError);
        result.generatedFiles.push(summaryPath);
        result.success = true;
        result.fallbackUsed = 'text_summary_only';
      } catch (summaryError) {
        const summaryErrorMessage = summaryError instanceof Error ? summaryError.message : String(summaryError);
        result.errors.push(`Text summary generation failed: ${summaryErrorMessage}`);
      }
    }

    return result;
  }

  /**
   * Generate partial reports when some components fail
   */
  public async generatePartialReports(
    context: ReportRecoveryContext,
    failedComponents: string[],
    availableData: Partial<ProcessedAuditData>
  ): Promise<PartialReportResult> {
    const result: PartialReportResult = {
      success: false,
      generatedFiles: [],
      skippedReports: failedComponents,
      errors: [],
      fallbackUsed: 'partial_reports'
    };

    try {
      await this.ensureOutputDirectory(context.outputDirectory);

      // Generate reports for available data only
      if (availableData.pages && availableData.pages.length > 0) {
        const pageReportPath = await this.generatePageSummaryReport(context, availableData.pages);
        result.generatedFiles.push(pageReportPath);
      }

      if (availableData.performanceMetrics) {
        const metricsReportPath = await this.generateMetricsReport(context, availableData.performanceMetrics);
        result.generatedFiles.push(metricsReportPath);
      }

      if (availableData.globalIssues && availableData.globalIssues.length > 0) {
        const issuesReportPath = await this.generateIssuesReport(context, availableData.globalIssues);
        result.generatedFiles.push(issuesReportPath);
      }

      // Generate partial report index
      const indexPath = await this.generatePartialReportIndex(context, result, failedComponents);
      result.generatedFiles.push(indexPath);

      result.success = result.generatedFiles.length > 0;

    } catch (partialError) {
      const errorMessage = partialError instanceof Error ? partialError.message : String(partialError);
      result.errors.push(`Partial report generation failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Handle memory-constrained report generation
   */
  public async generateMemoryEfficientReports(
    context: ReportRecoveryContext
  ): Promise<PartialReportResult> {
    const result: PartialReportResult = {
      success: false,
      generatedFiles: [],
      skippedReports: [],
      errors: [],
      fallbackUsed: 'memory_efficient'
    };

    try {
      const memoryStatus = getMemoryStatus();
      
      // Reduce data size based on available memory
      const reducedData = this.reduceDataForMemoryConstraints(context.originalData, memoryStatus);
      
      // Generate only essential reports with reduced data
      const essentialPath = await this.generateEssentialSummary(context, reducedData);
      result.generatedFiles.push(essentialPath);

      // Generate memory usage report
      const memoryReportPath = await this.generateMemoryReport(context, memoryStatus);
      result.generatedFiles.push(memoryReportPath);

      result.success = true;
      result.skippedReports = context.requestedFormats.filter(format => 
        !['json', 'markdown'].includes(format)
      );

    } catch (memoryError) {
      const errorMessage = memoryError instanceof Error ? memoryError.message : String(memoryError);
      result.errors.push(`Memory-efficient report generation failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Generate streaming reports for large datasets
   */
  public async generateStreamingReports(
    context: ReportRecoveryContext,
    chunkSize: number = 10
  ): Promise<PartialReportResult> {
    const result: PartialReportResult = {
      success: false,
      generatedFiles: [],
      skippedReports: [],
      errors: [],
      fallbackUsed: 'streaming_processing'
    };

    try {
      const pages = context.originalData.pages || [];
      const chunks = this.chunkArray(pages, chunkSize);
      
      // Process pages in chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkReportPath = await this.generateChunkReport(context, chunk, i + 1, chunks.length);
        result.generatedFiles.push(chunkReportPath);
      }

      // Generate streaming summary
      const summaryPath = await this.generateStreamingSummary(context, chunks.length);
      result.generatedFiles.push(summaryPath);

      result.success = true;

    } catch (streamingError) {
      const errorMessage = streamingError instanceof Error ? streamingError.message : String(streamingError);
      result.errors.push(`Streaming report generation failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Generate essential reports with minimal data
   */
  private async generateEssentialReports(context: ReportRecoveryContext): Promise<{
    files: string[];
    errors: string[];
  }> {
    const files: string[] = [];
    const errors: string[] = [];

    try {
      // Generate basic performance summary
      const summaryPath = resolve(context.outputDirectory, 'ESSENTIAL-SUMMARY.md');
      const summaryContent = this.createEssentialSummary(context.originalData);
      await writeFile(summaryPath, summaryContent, 'utf8');
      files.push(summaryPath);
    } catch (error) {
      errors.push(`Failed to generate essential summary: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Generate top issues list
      const issuesPath = resolve(context.outputDirectory, 'TOP-ISSUES.md');
      const issuesContent = this.createTopIssuesList(context.originalData);
      await writeFile(issuesPath, issuesContent, 'utf8');
      files.push(issuesPath);
    } catch (error) {
      errors.push(`Failed to generate top issues: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Generate minimal JSON data
      const jsonPath = resolve(context.outputDirectory, 'minimal-data.json');
      const jsonContent = this.createMinimalJSON(context.originalData);
      await writeFile(jsonPath, JSON.stringify(jsonContent, null, 2), 'utf8');
      files.push(jsonPath);
    } catch (error) {
      errors.push(`Failed to generate minimal JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { files, errors };
  }

  /**
   * Generate error report with recovery information
   */
  private async generateErrorReport(
    context: ReportRecoveryContext,
    originalError: SignalerError
  ): Promise<string> {
    const errorReportPath = resolve(context.outputDirectory, 'ERROR-REPORT.md');
    
    const errorContent = `# Signaler Error Report

## Error Information
- **Timestamp**: ${new Date().toISOString()}
- **Category**: ${originalError.category}
- **Severity**: ${originalError.severity}
- **Operation**: ${originalError.context.operation}
- **Component**: ${originalError.context.component}

## Error Details
\`\`\`
${originalError.message}
\`\`\`

## Recovery Actions Taken
- Generated minimal reports as fallback
- Preserved essential performance data
- Created error context for debugging

## Suggested Solutions
${originalError.recoveryStrategy.suggestedSolutions?.map(solution => `- ${solution}`).join('\n') || 'No specific solutions available'}

## Context Information
${Object.entries(originalError.context.metadata || {}).map(([key, value]) => `- **${key}**: ${String(value)}`).join('\n')}

## Next Steps
1. Review the error details above
2. Check the suggested solutions
3. Verify system resources and permissions
4. Retry the operation after addressing the issues
5. Contact support if the problem persists

---
*This report was generated automatically by Signaler's error recovery system.*
`;

    await writeFile(errorReportPath, errorContent, 'utf8');
    return errorReportPath;
  }

  /**
   * Generate text summary as last resort
   */
  private async generateTextSummary(
    context: ReportRecoveryContext,
    originalError: SignalerError
  ): Promise<string> {
    const summaryPath = resolve(context.outputDirectory, 'RECOVERY-SUMMARY.txt');
    
    const summary = `Signaler Recovery Summary
Generated: ${new Date().toISOString()}

ERROR: ${originalError.message}
CATEGORY: ${originalError.category}
SEVERITY: ${originalError.severity}

AUDIT DATA:
- Total Pages: ${context.originalData.pages?.length || 0}
- Performance Metrics Available: ${context.originalData.performanceMetrics ? 'Yes' : 'No'}
- Global Issues: ${context.originalData.globalIssues?.length || 0}

RECOVERY STATUS: Minimal text summary generated due to system constraints.

This is a fallback report generated when full report generation failed.
Please check system resources and try again.
`;

    await writeFile(summaryPath, summary, 'utf8');
    return summaryPath;
  }

  /**
   * Helper methods for generating specific report components
   */
  private async generatePageSummaryReport(
    context: ReportRecoveryContext,
    pages: any[]
  ): Promise<string> {
    const reportPath = resolve(context.outputDirectory, 'pages-summary.md');
    
    const content = `# Page Summary Report

## Pages Audited (${pages.length})

${pages.map(page => `### ${page.label}
- **Path**: ${page.path}
- **Device**: ${page.device}
- **Performance Score**: ${page.scores?.performance || 'N/A'}/100
- **Issues**: ${page.issues?.length || 0}
`).join('\n')}

---
*Generated by Signaler partial report recovery*
`;

    await writeFile(reportPath, content, 'utf8');
    return reportPath;
  }

  private async generateMetricsReport(
    context: ReportRecoveryContext,
    metrics: any
  ): Promise<string> {
    const reportPath = resolve(context.outputDirectory, 'performance-metrics.json');
    
    const content = {
      timestamp: new Date().toISOString(),
      metrics,
      note: 'Generated by Signaler partial report recovery'
    };

    await writeFile(reportPath, JSON.stringify(content, null, 2), 'utf8');
    return reportPath;
  }

  private async generateIssuesReport(
    context: ReportRecoveryContext,
    issues: any[]
  ): Promise<string> {
    const reportPath = resolve(context.outputDirectory, 'global-issues.md');
    
    const content = `# Global Issues Report

## Issues Affecting Multiple Pages (${issues.length})

${issues.map(issue => `### ${issue.type}
- **Severity**: ${issue.severity}
- **Affected Pages**: ${issue.affectedPages?.length || 0}
- **Description**: ${issue.description}
`).join('\n')}

---
*Generated by Signaler partial report recovery*
`;

    await writeFile(reportPath, content, 'utf8');
    return reportPath;
  }

  private async generatePartialReportIndex(
    context: ReportRecoveryContext,
    result: PartialReportResult,
    failedComponents: string[]
  ): Promise<string> {
    const indexPath = resolve(context.outputDirectory, 'PARTIAL-REPORT-INDEX.md');
    
    const content = `# Partial Report Index

## Generated Reports
${result.generatedFiles.map(file => `- [${file.split('/').pop()}](${file.split('/').pop()})`).join('\n')}

## Failed Components
${failedComponents.map(component => `- ${component}`).join('\n')}

## Errors Encountered
${result.errors.map(error => `- ${error}`).join('\n')}

---
*This is a partial report generated due to system constraints or errors.*
*Some components may be missing or incomplete.*
`;

    await writeFile(indexPath, content, 'utf8');
    return indexPath;
  }

  /**
   * Utility methods
   */
  private async ensureOutputDirectory(outputDir: string): Promise<void> {
    try {
      await mkdir(outputDir, { recursive: true });
    } catch (error) {
      throw new FileSystemError(
        `Failed to create output directory: ${outputDir}`,
        'create_directory',
        outputDir,
        error instanceof Error ? error : undefined
      );
    }
  }

  private createEssentialSummary(data: ProcessedAuditData): string {
    const metrics = data.performanceMetrics;
    const pages = data.pages || [];
    
    return `# Essential Performance Summary

## Overview
- **Total Pages Audited**: ${metrics?.totalPages || pages.length}
- **Average Performance Score**: ${metrics?.averagePerformanceScore || 'N/A'}
- **Critical Issues**: ${metrics?.criticalIssuesCount || 'N/A'}
- **Estimated Total Savings**: ${metrics?.estimatedTotalSavings || 'N/A'}ms

## Top Performing Pages
${pages
  .sort((a, b) => (b.scores?.performance || 0) - (a.scores?.performance || 0))
  .slice(0, 3)
  .map(page => `- ${page.label}: ${page.scores?.performance || 'N/A'}/100`)
  .join('\n')}

## Worst Performing Pages
${pages
  .sort((a, b) => (a.scores?.performance || 0) - (b.scores?.performance || 0))
  .slice(0, 3)
  .map(page => `- ${page.label}: ${page.scores?.performance || 'N/A'}/100`)
  .join('\n')}

---
*This is a minimal report generated due to system constraints.*
`;
  }

  private createTopIssuesList(data: ProcessedAuditData): string {
    const allIssues = (data.pages || [])
      .flatMap(page => page.issues || [])
      .sort((a, b) => (b.estimatedSavings?.timeMs || 0) - (a.estimatedSavings?.timeMs || 0))
      .slice(0, this.minimalConfig.maxIssuesCount);

    return `# Top Performance Issues

${allIssues.map((issue, index) => `## ${index + 1}. ${issue.title}
- **Severity**: ${issue.severity}
- **Category**: ${issue.category}
- **Estimated Savings**: ${issue.estimatedSavings?.timeMs || 0}ms
- **Description**: ${issue.description}
`).join('\n')}

---
*Showing top ${this.minimalConfig.maxIssuesCount} issues by estimated time savings.*
`;
  }

  private createMinimalJSON(data: ProcessedAuditData): any {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalPages: data.performanceMetrics?.totalPages || data.pages?.length || 0,
        averageScore: data.performanceMetrics?.averagePerformanceScore || 0,
        criticalIssues: data.performanceMetrics?.criticalIssuesCount || 0
      },
      topPages: (data.pages || [])
        .sort((a, b) => (b.scores?.performance || 0) - (a.scores?.performance || 0))
        .slice(0, 5)
        .map(page => ({
          label: page.label,
          path: page.path,
          score: page.scores?.performance || 0
        })),
      note: 'Minimal data generated by error recovery system'
    };
  }

  private reduceDataForMemoryConstraints(data: ProcessedAuditData, memoryStatus: any): ProcessedAuditData {
    // Reduce data size based on available memory
    const maxPages = memoryStatus.freeMemoryMB < 512 ? 10 : 
                    memoryStatus.freeMemoryMB < 1024 ? 25 : 50;

    return {
      ...data,
      pages: (data.pages || []).slice(0, maxPages),
      globalIssues: (data.globalIssues || []).slice(0, 10)
    };
  }

  private async generateEssentialSummary(
    context: ReportRecoveryContext,
    reducedData: ProcessedAuditData
  ): Promise<string> {
    const summaryPath = resolve(context.outputDirectory, 'memory-efficient-summary.md');
    const content = this.createEssentialSummary(reducedData);
    await writeFile(summaryPath, content, 'utf8');
    return summaryPath;
  }

  private async generateMemoryReport(
    context: ReportRecoveryContext,
    memoryStatus: any
  ): Promise<string> {
    const reportPath = resolve(context.outputDirectory, 'memory-status.json');
    
    const content = {
      timestamp: new Date().toISOString(),
      memoryStatus,
      note: 'Memory-constrained report generation was used',
      recommendations: [
        'Close other applications to free memory',
        'Process fewer pages per batch',
        'Use streaming processing for large datasets'
      ]
    };

    await writeFile(reportPath, JSON.stringify(content, null, 2), 'utf8');
    return reportPath;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async generateChunkReport(
    context: ReportRecoveryContext,
    chunk: any[],
    chunkNumber: number,
    totalChunks: number
  ): Promise<string> {
    const reportPath = resolve(context.outputDirectory, `chunk-${chunkNumber}-of-${totalChunks}.md`);
    
    const content = `# Chunk ${chunkNumber} of ${totalChunks}

## Pages in this chunk (${chunk.length})

${chunk.map(page => `### ${page.label}
- **Performance**: ${page.scores?.performance || 'N/A'}/100
- **Issues**: ${page.issues?.length || 0}
`).join('\n')}

---
*Part of streaming report generation*
`;

    await writeFile(reportPath, content, 'utf8');
    return reportPath;
  }

  private async generateStreamingSummary(
    context: ReportRecoveryContext,
    totalChunks: number
  ): Promise<string> {
    const summaryPath = resolve(context.outputDirectory, 'streaming-summary.md');
    
    const content = `# Streaming Report Summary

## Processing Information
- **Total Chunks Generated**: ${totalChunks}
- **Processing Method**: Streaming (memory-efficient)
- **Generated**: ${new Date().toISOString()}

## Available Reports
${Array.from({ length: totalChunks }, (_, i) => `- [Chunk ${i + 1}](chunk-${i + 1}-of-${totalChunks}.md)`).join('\n')}

---
*Reports were generated using streaming processing to handle large datasets efficiently.*
`;

    await writeFile(summaryPath, content, 'utf8');
    return summaryPath;
  }
}