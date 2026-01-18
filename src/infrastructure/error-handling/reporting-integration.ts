/**
 * Reporting Integration - Error handling integration for report generation
 * 
 * This module integrates error handling with the reporting system to provide
 * graceful degradation and recovery for report generation operations.
 */

import { 
  ErrorHandler, 
  ErrorHandlerConfig,
  SignalerError,
  FileSystemError,
  DataProcessingError,
  PerformanceError,
  MemoryExhaustionError
} from './index.js';
import { 
  ReportErrorRecovery, 
  ReportRecoveryContext, 
  PartialReportResult,
  MinimalReportConfig 
} from './report-error-recovery.js';
import type { 
  ReportGeneratorEngine, 
  ProcessedAuditData, 
  ReportGeneratorConfig
} from '../../reporting/generators/report-generator-engine.js';
import type { OutputFormat } from '../../reporting/index.js';
import { getMemoryStatus } from '../../utils/memory-monitor.js';

export interface ReportingErrorHandlerConfig extends ErrorHandlerConfig {
  readonly fallbackToMinimal: boolean;
  readonly enablePartialReports: boolean;
  readonly enableStreamingFallback: boolean;
  readonly minimalReportConfig: MinimalReportConfig;
  readonly streamingChunkSize: number;
}

export interface ReportGenerationResult {
  success: boolean;
  generatedFiles: string[];
  errors: string[];
  warnings: string[];
  fallbackUsed?: string;
  partialResult?: PartialReportResult;
  generationTimeMs: number;
}

/**
 * Enhanced report generator with comprehensive error handling
 */
export class ErrorHandledReportGenerator {
  private readonly reportGenerator: ReportGeneratorEngine;
  private readonly errorHandler: ErrorHandler;
  private readonly reportRecovery: ReportErrorRecovery;
  private readonly config: ReportingErrorHandlerConfig;

  constructor(
    reportGenerator: ReportGeneratorEngine,
    config: Partial<ReportingErrorHandlerConfig> = {}
  ) {
    this.reportGenerator = reportGenerator;
    
    const defaultConfig: ReportingErrorHandlerConfig = {
      enableConsoleLogging: true,
      enableFileLogging: true,
      maxRetryAttempts: 3,
      memoryThresholdMB: 1024,
      timeoutMs: 30000, // 30 seconds for report generation
      fallbackToMinimal: true,
      enablePartialReports: true,
      enableStreamingFallback: true,
      streamingChunkSize: 10,
      minimalReportConfig: {
        includeBasicMetrics: true,
        includeTopIssues: true,
        maxIssuesCount: 5,
        outputFormat: 'markdown'
      }
    };

    this.config = { ...defaultConfig, ...config };
    this.errorHandler = new ErrorHandler(this.config);
    this.reportRecovery = new ReportErrorRecovery(this.errorHandler, this.config.minimalReportConfig);
  }

  /**
   * Generate reports with comprehensive error handling
   */
  public async generateReportsWithErrorHandling(
    data: ProcessedAuditData,
    outputDirectory: string,
    formats: OutputFormat[] = ['html', 'json', 'markdown']
  ): Promise<ReportGenerationResult> {
    const startTime = Date.now();
    const result: ReportGenerationResult = {
      success: false,
      generatedFiles: [],
      errors: [],
      warnings: [],
      generationTimeMs: 0
    };

    const context: ReportRecoveryContext = {
      outputDirectory,
      requestedFormats: formats,
      originalData: data,
      config: {
        outputFormats: formats,
        includeScreenshots: true,
        maxIssuesPerReport: 100,
        tokenOptimization: true,
        streamingThreshold: 50,
        enableProgressIndicators: false,
        optimizeFileIO: true,
        compressionEnabled: false,
        maxMemoryMB: 256
      }
    };

    try {
      // Pre-flight checks
      await this.performPreflightChecks(data, context);

      // Attempt normal report generation
      const reports = await this.generateReportsWithRetry(data, formats, context);
      result.generatedFiles.push(...reports.files);
      result.errors.push(...reports.errors);
      result.success = reports.files.length > 0;

    } catch (error) {
      const signalerError = await this.handleReportGenerationError(error, context);
      
      // Attempt recovery based on error type
      const recoveryResult = await this.attemptErrorRecovery(signalerError, context);
      
      if (recoveryResult.success) {
        result.generatedFiles.push(...recoveryResult.generatedFiles);
        result.warnings.push(`Fallback used: ${recoveryResult.fallbackUsed}`);
        result.fallbackUsed = recoveryResult.fallbackUsed;
        result.partialResult = recoveryResult;
        result.success = true;
      } else {
        result.errors.push(...recoveryResult.errors);
        result.errors.push(`Report generation failed: ${signalerError.message}`);
      }
    }

    result.generationTimeMs = Date.now() - startTime;
    
    // Log final result
    await this.logGenerationResult(result, context);
    
    return result;
  }

  /**
   * Generate specific report types with error handling
   */
  public async generateDeveloperReportsWithErrorHandling(
    data: ProcessedAuditData,
    outputDirectory: string
  ): Promise<ReportGenerationResult> {
    return this.errorHandler.executeWithErrorHandling(
      async () => {
        const reports = await this.reportGenerator.generateDeveloperReports(data);
        const files = await this.writeReportsToFiles(reports, outputDirectory, 'developer');
        return {
          success: true,
          generatedFiles: files,
          errors: [],
          warnings: [],
          generationTimeMs: 0
        };
      },
      'generate_developer_reports',
      'reporting',
      { outputDirectory, reportType: 'developer' }
    );
  }

  public async generateAIReportsWithErrorHandling(
    data: ProcessedAuditData,
    outputDirectory: string
  ): Promise<ReportGenerationResult> {
    return this.errorHandler.executeWithErrorHandling(
      async () => {
        const reports = await this.reportGenerator.generateAIReports(data);
        const files = await this.writeReportsToFiles(reports, outputDirectory, 'ai');
        return {
          success: true,
          generatedFiles: files,
          errors: [],
          warnings: [],
          generationTimeMs: 0
        };
      },
      'generate_ai_reports',
      'reporting',
      { outputDirectory, reportType: 'ai' }
    );
  }

  public async generateExecutiveReportsWithErrorHandling(
    data: ProcessedAuditData,
    outputDirectory: string
  ): Promise<ReportGenerationResult> {
    return this.errorHandler.executeWithErrorHandling(
      async () => {
        const reports = await this.reportGenerator.generateExecutiveReports(data);
        const files = await this.writeReportsToFiles(reports, outputDirectory, 'executive');
        return {
          success: true,
          generatedFiles: files,
          errors: [],
          warnings: [],
          generationTimeMs: 0
        };
      },
      'generate_executive_reports',
      'reporting',
      { outputDirectory, reportType: 'executive' }
    );
  }

  /**
   * Perform pre-flight checks before report generation
   */
  private async performPreflightChecks(
    data: ProcessedAuditData,
    context: ReportRecoveryContext
  ): Promise<void> {
    // Check memory availability
    const memoryStatus = getMemoryStatus();
    if (memoryStatus.isCritical) {
      throw new MemoryExhaustionError(
        this.config.memoryThresholdMB,
        memoryStatus.freeMemoryMB
      );
    }

    // Warn about low memory
    if (memoryStatus.isLow) {
      console.warn(`⚠️  Low memory detected: ${memoryStatus.freeMemoryMB}MB free. Consider using streaming mode.`);
    }

    // Check data validity
    if (!data.pages || data.pages.length === 0) {
      throw new DataProcessingError(
        'No page data available for report generation',
        'validate_audit_data',
        'ProcessedAuditData'
      );
    }

    // Check output directory accessibility
    try {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(context.outputDirectory, { recursive: true });
    } catch (error) {
      throw new FileSystemError(
        'Cannot access output directory',
        'create_directory',
        context.outputDirectory,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate reports with retry logic
   */
  private async generateReportsWithRetry(
    data: ProcessedAuditData,
    formats: OutputFormat[],
    context: ReportRecoveryContext
  ): Promise<{ files: string[]; errors: string[] }> {
    const files: string[] = [];
    const errors: string[] = [];

    for (const format of formats) {
      try {
        const report = await this.errorHandler.executeWithErrorHandling(
          () => {
            // Convert ProcessedAuditData to AuditResult format for the generator
            const auditResult = this.convertToAuditResult(data);
            return this.reportGenerator.generate(auditResult, format);
          },
          `generate_${format}_report`,
          'reporting',
          { format, outputDirectory: context.outputDirectory }
        );

        const filePath = await this.writeReportToFile(report, context.outputDirectory, format);
        files.push(filePath);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to generate ${format} report: ${errorMessage}`);
      }
    }

    return { files, errors };
  }

  /**
   * Handle report generation errors with classification
   */
  private async handleReportGenerationError(
    error: unknown,
    context: ReportRecoveryContext
  ): Promise<SignalerError> {
    return this.errorHandler.handleError(
      error,
      'report_generation',
      'reporting',
      {
        outputDirectory: context.outputDirectory,
        requestedFormats: context.requestedFormats,
        pageCount: context.originalData.pages?.length || 0
      }
    ).then(result => {
      if (error instanceof SignalerError) {
        return error;
      }
      
      // Create appropriate error type based on the error
      const errorMessage = error instanceof Error ? error.message : String(error);
      return new DataProcessingError(
        errorMessage,
        'report_generation',
        'ProcessedAuditData',
        error instanceof Error ? error : undefined
      );
    });
  }

  /**
   * Attempt error recovery based on error type and configuration
   */
  private async attemptErrorRecovery(
    error: SignalerError,
    context: ReportRecoveryContext
  ): Promise<PartialReportResult> {
    // Determine recovery strategy based on error type
    if (error instanceof MemoryExhaustionError && this.config.enableStreamingFallback) {
      console.log('🔄 Attempting memory-efficient report generation...');
      return this.reportRecovery.generateMemoryEfficientReports(context);
    }

    if (error instanceof PerformanceError && this.config.enableStreamingFallback) {
      console.log('🔄 Attempting streaming report generation...');
      return this.reportRecovery.generateStreamingReports(context, this.config.streamingChunkSize);
    }

    if (error instanceof FileSystemError && this.config.enablePartialReports) {
      console.log('🔄 Attempting partial report generation...');
      const availableData = this.extractAvailableData(context.originalData);
      return this.reportRecovery.generatePartialReports(context, ['filesystem'], availableData);
    }

    if (this.config.fallbackToMinimal) {
      console.log('🔄 Generating minimal reports as fallback...');
      return this.reportRecovery.generateMinimalReports(context, error);
    }

    // No recovery possible
    return {
      success: false,
      generatedFiles: [],
      skippedReports: context.requestedFormats,
      errors: [`No recovery strategy available for ${error.category} error`],
      fallbackUsed: 'none'
    };
  }

  /**
   * Extract available data when some components fail
   */
  private extractAvailableData(data: ProcessedAuditData): Partial<ProcessedAuditData> {
    const available: Partial<ProcessedAuditData> = {};

    try {
      if (data.pages && Array.isArray(data.pages)) {
        available.pages = data.pages;
      }
    } catch {
      // Pages data not available
    }

    try {
      if (data.performanceMetrics) {
        available.performanceMetrics = data.performanceMetrics;
      }
    } catch {
      // Performance metrics not available
    }

    try {
      if (data.globalIssues && Array.isArray(data.globalIssues)) {
        available.globalIssues = data.globalIssues;
      }
    } catch {
      // Global issues not available
    }

    try {
      if (data.auditMetadata) {
        available.auditMetadata = data.auditMetadata;
      }
    } catch {
      // Audit metadata not available
    }

    return available;
  }

  /**
   * Write report to file with error handling
   */
  private async writeReportToFile(
    report: any,
    outputDirectory: string,
    format: OutputFormat
  ): Promise<string> {
    const { writeFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');

    const fileName = `signaler-report.${format}`;
    const filePath = resolve(outputDirectory, fileName);

    const content = typeof report.content === 'string' ? report.content : JSON.stringify(report.content, null, 2);
    
    await writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Write multiple reports to files
   */
  private async writeReportsToFiles(
    reports: any,
    outputDirectory: string,
    prefix: string
  ): Promise<string[]> {
    const { writeFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    
    const files: string[] = [];

    for (const [reportName, content] of Object.entries(reports)) {
      const fileName = `${prefix}-${reportName}.md`;
      const filePath = resolve(outputDirectory, fileName);
      
      const reportContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      await writeFile(filePath, reportContent, 'utf8');
      files.push(filePath);
    }

    return files;
  }

  /**
   * Log generation result for monitoring
   */
  private async logGenerationResult(
    result: ReportGenerationResult,
    context: ReportRecoveryContext
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation: 'report_generation',
      success: result.success,
      generationTimeMs: result.generationTimeMs,
      generatedFiles: result.generatedFiles.length,
      errors: result.errors.length,
      warnings: result.warnings.length,
      fallbackUsed: result.fallbackUsed,
      requestedFormats: context.requestedFormats,
      pageCount: context.originalData.pages?.length || 0
    };

    if (result.success) {
      console.log(`✅ Report generation completed in ${result.generationTimeMs}ms`);
      console.log(`   Generated ${result.generatedFiles.length} files`);
      if (result.fallbackUsed) {
        console.log(`   Fallback used: ${result.fallbackUsed}`);
      }
    } else {
      console.error(`❌ Report generation failed after ${result.generationTimeMs}ms`);
      console.error(`   Errors: ${result.errors.length}`);
    }

    // Log to file if configured
    if (this.config.enableFileLogging && this.config.logFilePath) {
      try {
        const { writeFile } = await import('node:fs/promises');
        const logLine = JSON.stringify(logEntry) + '\n';
        await writeFile(this.config.logFilePath, logLine, { flag: 'a' });
      } catch (error) {
        console.warn(`⚠️  Failed to write to log file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Get error handler for advanced operations
   */
  public getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * Get report recovery manager
   */
  public getReportRecovery(): ReportErrorRecovery {
    return this.reportRecovery;
  }

  /**
   * Convert ProcessedAuditData to AuditResult format
   */
  private convertToAuditResult(data: ProcessedAuditData): any {
    // Create a minimal AuditResult structure from ProcessedAuditData
    return {
      meta: data.auditMetadata || {
        configPath: 'unknown',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        elapsedMs: 0,
        totalPages: data.pages?.length || 0,
        totalRunners: 1
      },
      results: (data.pages || []).map(page => ({
        page: {
          label: page.label,
          path: page.path,
          devices: [page.device]
        },
        runnerResults: {
          lighthouse: {
            success: true,
            lhr: {
              categories: {
                performance: { score: (page.scores?.performance || 0) / 100 },
                accessibility: { score: (page.scores?.accessibility || 0) / 100 },
                'best-practices': { score: (page.scores?.bestPractices || 0) / 100 },
                seo: { score: (page.scores?.seo || 0) / 100 }
              },
              audits: this.convertIssuesAndMetricsToAudits(page)
            }
          }
        }
      }))
    };
  }

  /**
   * Convert issues and metrics to Lighthouse audit format
   */
  private convertIssuesAndMetricsToAudits(page: any): any {
    const audits: any = {};

    // Add metrics
    if (page.metrics) {
      audits['largest-contentful-paint'] = { numericValue: page.metrics.lcpMs || 0 };
      audits['first-contentful-paint'] = { numericValue: page.metrics.fcpMs || 0 };
      audits['total-blocking-time'] = { numericValue: page.metrics.tbtMs || 0 };
      audits['cumulative-layout-shift'] = { numericValue: page.metrics.cls || 0 };
    }

    // Add issues as audits
    if (page.issues) {
      page.issues.forEach((issue: any) => {
        audits[issue.id] = {
          title: issue.title,
          description: issue.description,
          score: issue.severity === 'critical' ? 0 : issue.severity === 'high' ? 0.3 : 0.7,
          numericValue: issue.estimatedSavings?.timeMs || 0,
          details: {
            items: issue.affectedResources || []
          }
        };
      });
    }

    return audits;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ReportingErrorHandlerConfig>): void {
    Object.assign(this.config, newConfig);
    this.errorHandler.updateConfig(newConfig);
  }
}