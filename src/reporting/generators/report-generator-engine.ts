/**
 * Report Generator Engine - Multi-format report generation with streaming support
 * 
 * This module provides the main report generation engine that coordinates
 * different report formats and handles large dataset processing.
 */

import type { AuditResult, AuditMetadata } from '../../core/audit-engine.js';
import type { ReportGenerator, Report, OutputFormat } from '../index.js';
import { StreamingJSONProcessor, shouldUseStreaming, estimateObjectSize } from '../processors/streaming-json-processor.js';
import { ProgressIndicator, MultiStageProgress, createProgressCallback } from '../processors/progress-indicator.js';
import { OptimizedFileIO, calculateOptimalBufferSize } from '../processors/optimized-file-io.js';
import { MemoryOptimizer, withMemoryMonitoring, checkMemoryAvailability } from '../processors/memory-optimizer.js';
import { CompactAuditStorage, StreamingAuditProcessor, MemoryEfficientAggregator } from '../processors/memory-efficient-structures.js';

export interface ReportGeneratorConfig {
  outputFormats: OutputFormat[];
  includeScreenshots: boolean;
  maxIssuesPerReport: number;
  tokenOptimization: boolean;
  streamingThreshold: number; // Number of pages above which to use streaming
  enableProgressIndicators: boolean;
  optimizeFileIO: boolean;
  compressionEnabled: boolean;
  maxMemoryMB: number;
}

export interface ProcessedAuditData {
  pages: PageAuditResult[];
  globalIssues: GlobalIssue[];
  performanceMetrics: PerformanceMetrics;
  auditMetadata: AuditMetadata;
}

export interface PageAuditResult {
  label: string;
  path: string;
  device: 'desktop' | 'mobile';
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: {
    lcpMs: number;
    fcpMs: number;
    tbtMs: number;
    cls: number;
  };
  issues: Issue[];
  opportunities: Opportunity[];
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'javascript' | 'css' | 'images' | 'caching' | 'network';
  affectedResources: Resource[];
  estimatedSavings: {
    timeMs: number;
    bytes: number;
  };
  fixRecommendations: ActionableRecommendation[];
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  estimatedSavings: {
    timeMs: number;
    bytes: number;
  };
}

export interface Resource {
  url: string;
  type: string;
  size: number;
}

export interface ActionableRecommendation {
  action: string;
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: string;
    codeExample?: string;
    documentation: string[];
  };
  framework?: 'nextjs' | 'react' | 'vue' | 'angular';
}

export interface GlobalIssue {
  type: string;
  affectedPages: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export interface PerformanceMetrics {
  averagePerformanceScore: number;
  totalPages: number;
  criticalIssuesCount: number;
  estimatedTotalSavings: number;
}

export interface ReportTemplate {
  name: string;
  format: OutputFormat;
  generate(data: ProcessedAuditData): Promise<string>;
}

export interface DeveloperReports {
  quickFixes: string;
  triage: string;
  overview: string;
}

export interface AIReports {
  analysis: string;
  structuredIssues: string;
}

export interface ExecutiveReports {
  dashboard: string;
  performanceSummary: string;
}

export interface IntegrationOutputs {
  cicdReports: string[];
  webhookPayloads: string[];
}

/**
 * Main report generation engine that coordinates multiple report formats
 */
export class ReportGeneratorEngine implements ReportGenerator {
  private config: ReportGeneratorConfig;
  private templates: Map<string, ReportTemplate>;
  private streamingProcessor: StreamingJSONProcessor;
  private fileIO: OptimizedFileIO;
  private progressIndicator?: ProgressIndicator;
  private memoryOptimizer: MemoryOptimizer;
  private compactStorage: CompactAuditStorage;
  private streamingAuditProcessor: StreamingAuditProcessor;

  constructor(config: ReportGeneratorConfig) {
    this.config = config;
    this.templates = new Map();
    
    // Initialize memory optimizer
    this.memoryOptimizer = new MemoryOptimizer({
      maxHeapSizeMB: config.maxMemoryMB || 512,
      enableAutoGC: true,
      memoryWarningThreshold: 70,
      emergencyThreshold: 90
    });

    // Initialize compact storage for memory efficiency
    this.compactStorage = new CompactAuditStorage();
    
    // Initialize streaming audit processor
    this.streamingAuditProcessor = new StreamingAuditProcessor(50);
    
    // Initialize streaming processor
    this.streamingProcessor = new StreamingJSONProcessor({
      chunkSize: 50,
      maxMemoryMB: config.maxMemoryMB || 512,
      enableCompression: config.compressionEnabled || false,
      progressCallback: config.enableProgressIndicators 
        ? (processed, total) => this.progressIndicator?.update({ current: processed, total })
        : undefined
    });

    // Initialize optimized file I/O
    this.fileIO = new OptimizedFileIO({
      batchSize: 10,
      enableCompression: config.compressionEnabled || false,
      bufferSize: calculateOptimalBufferSize(),
      maxConcurrentWrites: 5
    });

    // Set up memory monitoring
    this.setupMemoryMonitoring();
    
    this.initializeTemplates();
  }

  /**
   * Generate a report in the specified format
   */
  async generate(data: AuditResult, format: OutputFormat): Promise<Report> {
    // Check memory availability before starting
    const estimatedMemoryNeeded = estimateObjectSize(data) / 1024 / 1024; // MB
    const memoryCheck = checkMemoryAvailability(estimatedMemoryNeeded);
    
    if (!memoryCheck.available) {
      console.warn(`Warning: ${memoryCheck.recommendation}`);
    }

    return withMemoryMonitoring(async (monitor) => {
      const startTime = Date.now();
      
      // Initialize progress indicator if enabled
      if (this.config.enableProgressIndicators) {
        this.progressIndicator = new ProgressIndicator({
          format: 'bar',
          showETA: true,
          showThroughput: true
        });
        this.progressIndicator.start(100, 'Generating report');
      }

      try {
        // Process raw audit data with memory optimization
        this.progressIndicator?.update({ current: 10, stage: 'Processing audit data' });
        const processedData = await this.processAuditDataWithMemoryOptimization(data);
        
        // Determine if streaming should be used
        const dataSize = estimateObjectSize(processedData);
        const shouldStream = shouldUseStreaming(dataSize, processedData.pages.length, this.config.maxMemoryMB);
        
        this.progressIndicator?.update({ current: 30, stage: 'Generating content' });
        
        let content: string;
        if (shouldStream) {
          content = await this.generateWithStreaming(processedData, format);
        } else {
          content = await this.generateStandard(processedData, format);
        }

        const generationTime = Date.now() - startTime;
        
        this.progressIndicator?.complete('Report generated successfully');
        
        return {
          format,
          content,
          metadata: {
            generatedAt: new Date().toISOString(),
            version: '1.0.0',
            source: 'signaler-report-generator',
            generationTimeMs: generationTime,
            pageCount: processedData.pages.length,
            streamingUsed: shouldStream
          }
        };
      } catch (error) {
        this.progressIndicator?.error(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }, {
      maxHeapSizeMB: this.config.maxMemoryMB,
      enableAutoGC: true
    }).then(({ result }) => result);
  }

  /**
   * Get supported output formats
   */
  getSupportedFormats(): OutputFormat[] {
    return ['html', 'json', 'markdown', 'csv'];
  }

  /**
   * Generate multiple report formats from analyzed data
   */
  async generateDeveloperReports(data: ProcessedAuditData): Promise<DeveloperReports> {
    const multiStage = new MultiStageProgress();
    
    // Add stages for each report type
    multiStage.addStage('quick-fixes', 1);
    multiStage.addStage('triage', 1);
    multiStage.addStage('overview', 1);

    try {
      // Generate quick fixes report
      multiStage.startStage('quick-fixes', 100);
      const quickFixesTemplate = this.templates.get('quick-fixes-md');
      if (!quickFixesTemplate) {
        throw new Error('Quick fixes template not found');
      }
      const quickFixes = await quickFixesTemplate.generate(data);
      multiStage.completeStage('Quick fixes report generated');

      // Generate triage report
      multiStage.startStage('triage', 100);
      const triageTemplate = this.templates.get('triage-md');
      if (!triageTemplate) {
        throw new Error('Triage template not found');
      }
      const triage = await triageTemplate.generate(data);
      multiStage.completeStage('Triage report generated');

      // Generate overview report
      multiStage.startStage('overview', 100);
      const overviewTemplate = this.templates.get('overview-md');
      if (!overviewTemplate) {
        throw new Error('Overview template not found');
      }
      const overview = await overviewTemplate.generate(data);
      multiStage.completeStage('Overview report generated');

      multiStage.complete('All developer reports generated');

      return { quickFixes, triage, overview };
    } catch (error) {
      throw new Error(`Developer report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate AI-optimized reports
   */
  async generateAIReports(data: ProcessedAuditData): Promise<AIReports> {
    const analysisTemplate = this.templates.get('ai-analysis-json');
    const structuredTemplate = this.templates.get('structured-issues-json');

    if (!analysisTemplate || !structuredTemplate) {
      throw new Error('Required AI report templates not found');
    }

    return {
      analysis: await analysisTemplate.generate(data),
      structuredIssues: await structuredTemplate.generate(data)
    };
  }

  /**
   * Generate executive dashboard reports
   */
  async generateExecutiveReports(data: ProcessedAuditData): Promise<ExecutiveReports> {
    const dashboardTemplate = this.templates.get('dashboard-md');
    const summaryTemplate = this.templates.get('performance-summary-json');

    if (!dashboardTemplate || !summaryTemplate) {
      throw new Error('Required executive report templates not found');
    }

    return {
      dashboard: await dashboardTemplate.generate(data),
      performanceSummary: await summaryTemplate.generate(data)
    };
  }

  /**
   * Generate integration outputs for CI/CD and webhooks
   */
  async generateIntegrationOutputs(data: ProcessedAuditData): Promise<IntegrationOutputs> {
    const cicdTemplate = this.templates.get('cicd-json');
    const webhookTemplate = this.templates.get('webhook-json');

    if (!cicdTemplate || !webhookTemplate) {
      throw new Error('Required integration templates not found');
    }

    return {
      cicdReports: [await cicdTemplate.generate(data)],
      webhookPayloads: [await webhookTemplate.generate(data)]
    };
  }

  /**
   * Process raw audit results into structured data with memory optimization
   */
  private async processAuditDataWithMemoryOptimization(data: AuditResult): Promise<ProcessedAuditData> {
    const pages: PageAuditResult[] = [];
    const globalIssues: GlobalIssue[] = [];
    
    // Use compact storage for large datasets
    if (data.results.length > this.config.streamingThreshold) {
      return this.processLargeDatasetWithCompactStorage(data);
    }
    
    // Process each page result with memory monitoring
    for (const pageResult of data.results) {
      const processedPage = await this.processPageResult(pageResult);
      pages.push(processedPage);
      
      // Check memory usage periodically
      const memUsage = process.memoryUsage();
      if (memUsage.heapUsed > this.config.maxMemoryMB * 1024 * 1024 * 0.8) {
        this.memoryOptimizer.forceGarbageCollection();
      }
    }

    // Calculate performance metrics using memory-efficient aggregation
    const performanceMetrics = await MemoryEfficientAggregator.calculateMetrics(
      (async function* () {
        for (const page of pages) {
          yield page;
        }
      })()
    );
    
    // Identify global issues with memory optimization
    const issueAggregation = MemoryEfficientAggregator.aggregateIssues(pages, this.config.maxMemoryMB);
    
    // Convert aggregation to global issues
    for (const [issueKey, aggregation] of issueAggregation) {
      if (aggregation.count > 1) {
        globalIssues.push({
          type: issueKey,
          affectedPages: aggregation.affectedPages,
          severity: 'medium', // Default severity
          description: `Issue affects ${aggregation.count} pages`
        });
      }
    }

    return {
      pages,
      globalIssues,
      performanceMetrics,
      auditMetadata: {
        configPath: data.meta.configPath,
        startedAt: data.meta.startedAt,
        completedAt: data.meta.completedAt,
        elapsedMs: data.meta.elapsedMs,
        totalPages: data.meta.totalPages,
        totalRunners: data.meta.totalRunners
      }
    };
  }

  /**
   * Process large datasets using compact storage
   */
  private async processLargeDatasetWithCompactStorage(data: AuditResult): Promise<ProcessedAuditData> {
    // Clear any existing data
    this.compactStorage.clear();
    
    // Process results in streaming fashion
    const processedPages: PageAuditResult[] = [];
    
    for await (const processedPage of this.streamingAuditProcessor.processAuditStream(
      (async function* () {
        for (const pageResult of data.results) {
          yield pageResult;
        }
      })()
    )) {
      processedPages.push(processedPage);
    }

    // Calculate metrics from compact storage
    const compactStorage = this.compactStorage;
    const performanceMetrics = await MemoryEfficientAggregator.calculateMetrics(
      (async function* () {
        for (const page of compactStorage.getAllPages()) {
          yield page;
        }
      })()
    );

    return {
      pages: processedPages,
      globalIssues: [], // Will be calculated separately for large datasets
      performanceMetrics,
      auditMetadata: {
        configPath: data.meta.configPath,
        startedAt: data.meta.startedAt,
        completedAt: data.meta.completedAt,
        elapsedMs: data.meta.elapsedMs,
        totalPages: data.meta.totalPages,
        totalRunners: data.meta.totalRunners
      }
    };
  }

  /**
   * Set up memory monitoring and alerts
   */
  private setupMemoryMonitoring(): void {
    this.memoryOptimizer.on('memory-warning', (alert) => {
      console.warn(`Memory Warning: ${alert.message}`);
      if (alert.suggestedAction) {
        console.warn(`Suggestion: ${alert.suggestedAction}`);
      }
    });

    this.memoryOptimizer.on('memory-emergency', (alert) => {
      console.error(`Memory Emergency: ${alert.message}`);
      if (alert.suggestedAction) {
        console.error(`Action Required: ${alert.suggestedAction}`);
      }
    });

    this.memoryOptimizer.on('gc-performed', (gcInfo) => {
      if (this.config.enableProgressIndicators) {
        console.log(`GC performed: freed ${gcInfo.freedMB.toFixed(1)}MB`);
      }
    });
  }

  /**
   * Process individual page result
   */
  private async processPageResult(pageResult: any): Promise<PageAuditResult> {
    // Extract Lighthouse data if available
    const lighthouseResult = pageResult.runnerResults?.lighthouse;
    
    if (!lighthouseResult || !lighthouseResult.success) {
      // Return minimal data for failed audits
      return {
        label: pageResult.page.label,
        path: pageResult.page.path,
        device: pageResult.page.devices?.[0] || 'desktop',
        scores: {
          performance: 0,
          accessibility: 0,
          bestPractices: 0,
          seo: 0
        },
        metrics: {
          lcpMs: 0,
          fcpMs: 0,
          tbtMs: 0,
          cls: 0
        },
        issues: [],
        opportunities: []
      };
    }

    // Extract scores and metrics from Lighthouse result
    const lhr = lighthouseResult.lhr || {};
    const categories = lhr.categories || {};
    const audits = lhr.audits || {};

    return {
      label: pageResult.page.label,
      path: pageResult.page.path,
      device: pageResult.page.devices?.[0] || 'desktop',
      scores: {
        performance: Math.round((categories.performance?.score || 0) * 100),
        accessibility: Math.round((categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
        seo: Math.round((categories.seo?.score || 0) * 100)
      },
      metrics: {
        lcpMs: audits['largest-contentful-paint']?.numericValue || 0,
        fcpMs: audits['first-contentful-paint']?.numericValue || 0,
        tbtMs: audits['total-blocking-time']?.numericValue || 0,
        cls: audits['cumulative-layout-shift']?.numericValue || 0
      },
      issues: this.extractIssues(audits),
      opportunities: this.extractOpportunities(audits)
    };
  }

  /**
   * Extract issues from Lighthouse audits
   */
  private extractIssues(audits: any): Issue[] {
    const issues: Issue[] = [];
    
    // Common performance issues to extract
    const issueAudits = [
      'unused-javascript',
      'unused-css-rules',
      'render-blocking-resources',
      'unminified-css',
      'unminified-javascript',
      'inefficient-animated-content',
      'non-composited-animations'
    ];

    for (const auditId of issueAudits) {
      const audit = audits[auditId];
      if (audit && audit.score !== null && audit.score < 1) {
        issues.push({
          id: auditId,
          title: audit.title || auditId,
          description: audit.description || '',
          severity: this.calculateSeverity(audit.score, audit.numericValue),
          category: this.categorizeIssue(auditId),
          affectedResources: this.extractResources(audit),
          estimatedSavings: {
            timeMs: audit.numericValue || 0,
            bytes: this.extractBytesSavings(audit)
          },
          fixRecommendations: this.generateRecommendations(auditId)
        });
      }
    }

    return issues;
  }

  /**
   * Extract opportunities from Lighthouse audits
   */
  private extractOpportunities(audits: any): Opportunity[] {
    const opportunities: Opportunity[] = [];
    
    const opportunityAudits = [
      'modern-image-formats',
      'uses-optimized-images',
      'uses-text-compression',
      'uses-responsive-images'
    ];

    for (const auditId of opportunityAudits) {
      const audit = audits[auditId];
      if (audit && audit.score !== null && audit.score < 1) {
        opportunities.push({
          id: auditId,
          title: audit.title || auditId,
          description: audit.description || '',
          estimatedSavings: {
            timeMs: audit.numericValue || 0,
            bytes: this.extractBytesSavings(audit)
          }
        });
      }
    }

    return opportunities;
  }

  /**
   * Calculate performance metrics across all pages
   */
  private calculatePerformanceMetrics(pages: PageAuditResult[]): PerformanceMetrics {
    const totalPages = pages.length;
    const averagePerformanceScore = pages.reduce((sum, page) => sum + page.scores.performance, 0) / totalPages;
    const criticalIssuesCount = pages.reduce((sum, page) => 
      sum + page.issues.filter(issue => issue.severity === 'critical').length, 0
    );
    const estimatedTotalSavings = pages.reduce((sum, page) => 
      sum + page.issues.reduce((issueSum, issue) => issueSum + issue.estimatedSavings.timeMs, 0), 0
    );

    return {
      averagePerformanceScore: Math.round(averagePerformanceScore),
      totalPages,
      criticalIssuesCount,
      estimatedTotalSavings: Math.round(estimatedTotalSavings)
    };
  }

  /**
   * Identify issues that affect multiple pages
   */
  private identifyGlobalIssues(pages: PageAuditResult[]): GlobalIssue[] {
    const issueMap = new Map<string, string[]>();
    
    // Group issues by type across pages
    for (const page of pages) {
      for (const issue of page.issues) {
        if (!issueMap.has(issue.id)) {
          issueMap.set(issue.id, []);
        }
        issueMap.get(issue.id)!.push(page.path);
      }
    }

    const globalIssues: GlobalIssue[] = [];
    
    // Identify issues affecting multiple pages
    for (const [issueId, affectedPages] of issueMap) {
      if (affectedPages.length > 1) {
        const firstIssue = pages
          .flatMap(page => page.issues)
          .find(issue => issue.id === issueId);
        
        if (firstIssue) {
          globalIssues.push({
            type: issueId,
            affectedPages,
            severity: firstIssue.severity,
            description: firstIssue.description
          });
        }
      }
    }

    return globalIssues;
  }

  /**
   * Generate report using streaming for large datasets
   */
  private async generateWithStreaming(data: ProcessedAuditData, format: OutputFormat): Promise<string> {
    this.progressIndicator?.update({ current: 40, stage: 'Using streaming processing' });
    
    const template = this.templates.get(`streaming-${format}`);
    if (!template) {
      // Fallback to standard generation with memory monitoring
      return this.generateWithMemoryOptimization(data, format);
    }
    
    this.progressIndicator?.update({ current: 80, stage: 'Streaming content generation' });
    return template.generate(data);
  }

  /**
   * Generate report with memory optimization
   */
  private async generateWithMemoryOptimization(data: ProcessedAuditData, format: OutputFormat): Promise<string> {
    const template = this.templates.get(`standard-${format}`);
    if (!template) {
      throw new Error(`Template not found for format: ${format}`);
    }

    // Process data in chunks to manage memory usage
    const { results } = await this.streamingProcessor.processWithMemoryMonitoring(
      [data], // Single item array for consistency
      async (item) => template.generate(item)
    );

    return results[0];
  }

  /**
   * Generate report using standard processing
   */
  private async generateStandard(data: ProcessedAuditData, format: OutputFormat): Promise<string> {
    this.progressIndicator?.update({ current: 60, stage: 'Standard processing' });
    
    const template = this.templates.get(`standard-${format}`);
    if (!template) {
      throw new Error(`Template not found for format: ${format}`);
    }
    
    this.progressIndicator?.update({ current: 90, stage: 'Finalizing content' });
    return template.generate(data);
  }

  /**
   * Write reports to files with optimization
   */
  async writeReportsToFiles(
    reports: Record<string, string>,
    outputDirectory: string
  ): Promise<void> {
    const writeOperations = Object.entries(reports).map(([filename, content]) => ({
      path: `${outputDirectory}/${filename}`,
      content,
      compress: this.config.compressionEnabled && content.length > 1024
    }));

    const result = await this.fileIO.batchWrite(writeOperations);
    
    if (result.errorCount > 0) {
      const errorMessages = result.errors.map(e => `${e.path}: ${e.error}`).join(', ');
      throw new Error(`Failed to write ${result.errorCount} files: ${errorMessages}`);
    }
  }

  /**
   * Get performance metrics including memory usage
   */
  getPerformanceMetrics(): {
    fileIO: any;
    streaming: any;
    memory: any;
    compactStorage: any;
  } {
    return {
      fileIO: this.fileIO.getMetrics(),
      streaming: this.streamingProcessor.getMetrics(),
      memory: this.memoryOptimizer.getMemorySummary(),
      compactStorage: this.compactStorage.getMemoryStats()
    };
  }

  /**
   * Clean up resources and stop monitoring
   */
  async cleanup(): Promise<void> {
    this.memoryOptimizer.stopMonitoring();
    this.compactStorage.clear();
    this.streamingAuditProcessor.clear();
    await this.fileIO.cleanup();
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring(): void {
    this.memoryOptimizer.startMonitoring();
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring(): void {
    this.memoryOptimizer.stopMonitoring();
  }

  /**
   * Initialize report templates
   */
  private initializeTemplates(): void {
    // Basic templates - these would be implemented as separate classes
    this.templates.set('standard-json', new JSONTemplate());
    this.templates.set('standard-markdown', new MarkdownTemplate());
    this.templates.set('standard-html', new HTMLTemplate());
    this.templates.set('standard-csv', new CSVTemplate());
    
    // Specialized templates
    this.templates.set('quick-fixes-md', new QuickFixesTemplate());
    this.templates.set('triage-md', new TriageTemplate());
    this.templates.set('overview-md', new OverviewTemplate());
    this.templates.set('ai-analysis-json', new AIAnalysisTemplate());
    this.templates.set('structured-issues-json', new StructuredIssuesTemplate());
    this.templates.set('dashboard-md', new DashboardTemplate());
    this.templates.set('performance-summary-json', new PerformanceSummaryTemplate());
    this.templates.set('cicd-json', new CICDTemplate());
    this.templates.set('webhook-json', new WebhookTemplate());
  }

  /**
   * Helper methods
   */
  private calculateSeverity(score: number, numericValue: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score < 0.5 && numericValue > 1000) return 'critical';
    if (score < 0.7 && numericValue > 500) return 'high';
    if (score < 0.9) return 'medium';
    return 'low';
  }

  private categorizeIssue(auditId: string): 'javascript' | 'css' | 'images' | 'caching' | 'network' {
    if (auditId.includes('javascript')) return 'javascript';
    if (auditId.includes('css')) return 'css';
    if (auditId.includes('image')) return 'images';
    if (auditId.includes('cache')) return 'caching';
    return 'network';
  }

  private extractResources(audit: any): Resource[] {
    const details = audit.details;
    if (!details || !details.items) return [];
    
    return details.items.map((item: any) => ({
      url: item.url || '',
      type: item.resourceType || 'unknown',
      size: item.totalBytes || item.wastedBytes || 0
    }));
  }

  private extractBytesSavings(audit: any): number {
    const details = audit.details;
    if (!details || !details.items) return 0;
    
    return details.items.reduce((sum: number, item: any) => 
      sum + (item.wastedBytes || item.totalBytes || 0), 0
    );
  }

  private generateRecommendations(auditId: string): ActionableRecommendation[] {
    // Basic recommendations - would be expanded with actual implementation
    const recommendations: Record<string, ActionableRecommendation> = {
      'unused-javascript': {
        action: 'Remove unused JavaScript code',
        implementation: {
          difficulty: 'medium',
          estimatedTime: '2-4 hours',
          codeExample: 'Use dynamic imports: import("./module").then(module => ...)',
          documentation: ['https://web.dev/remove-unused-code/']
        },
        framework: 'nextjs'
      },
      'unused-css-rules': {
        action: 'Remove unused CSS rules',
        implementation: {
          difficulty: 'easy',
          estimatedTime: '1-2 hours',
          documentation: ['https://web.dev/unused-css-rules/']
        }
      }
    };

    return recommendations[auditId] ? [recommendations[auditId]] : [];
  }
}

/**
 * Basic template implementations
 */
class JSONTemplate implements ReportTemplate {
  name = 'json';
  format: OutputFormat = 'json';

  async generate(data: ProcessedAuditData): Promise<string> {
    return JSON.stringify(data, null, 2);
  }
}

class MarkdownTemplate implements ReportTemplate {
  name = 'markdown';
  format: OutputFormat = 'markdown';

  async generate(data: ProcessedAuditData): Promise<string> {
    return `# Signaler Audit Report

## Performance Overview
- Total Pages: ${data.performanceMetrics.totalPages}
- Average Performance Score: ${data.performanceMetrics.averagePerformanceScore}
- Critical Issues: ${data.performanceMetrics.criticalIssuesCount}

## Pages Audited
${data.pages.map(page => `- ${page.label}: ${page.scores.performance}/100`).join('\n')}
`;
  }
}

class HTMLTemplate implements ReportTemplate {
  name = 'html';
  format: OutputFormat = 'html';

  async generate(data: ProcessedAuditData): Promise<string> {
    const { HTMLReportGenerator } = await import('./html-report-generator.js');
    const { VisualPerformanceDashboard } = await import('./visual-performance-dashboard.js');
    const { IssueVisualization } = await import('./issue-visualization.js');
    
    const htmlGenerator = new HTMLReportGenerator();
    const dashboardGenerator = new VisualPerformanceDashboard();
    const issueVisualizer = new IssueVisualization();
    
    // Generate main HTML report
    const mainReport = await htmlGenerator.generateReport(data);
    
    // Generate dashboard section
    const dashboard = await dashboardGenerator.generateDashboard(data);
    
    // Generate issue explorer
    const issueExplorer = await issueVisualizer.generateIssueExplorer(data);
    
    // Combine all sections into comprehensive HTML report
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signaler Performance Report</title>
  <meta name="description" content="Comprehensive web performance audit report generated by Signaler">
  
  <!-- Chart.js for interactive charts -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
  
  <!-- Custom styles -->
  <style>
    /* Base CSS variables */
    :root {
      --primary-color: #2563eb;
      --success-color: #16a34a;
      --warning-color: #d97706;
      --error-color: #dc2626;
      --critical-color: #991b1b;
      --background-color: #ffffff;
      --surface-color: #f8fafc;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --border-color: #e2e8f0;
      --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    }

    .theme-dark {
      --background-color: #0f172a;
      --surface-color: #1e293b;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --border-color: #334155;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: var(--text-primary);
      background-color: var(--background-color);
      margin: 0;
      padding: 0;
    }

    .report-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    .report-section {
      margin-bottom: 3rem;
    }

    .section-divider {
      height: 1px;
      background: var(--border-color);
      margin: 3rem 0;
    }

    /* Navigation between sections */
    .report-nav {
      position: sticky;
      top: 0;
      background: var(--surface-color);
      border-bottom: 1px solid var(--border-color);
      z-index: 100;
      padding: 1rem 0;
    }

    .nav-tabs {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
    }

    .nav-tab {
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: 0.25rem;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .nav-tab.active {
      background: var(--primary-color);
      color: white;
    }

    .nav-tab:hover {
      background: var(--primary-color);
      color: white;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .report-container {
        padding: 0 0.5rem;
      }

      .nav-tabs {
        flex-direction: column;
        gap: 0.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="report-nav">
    <div class="report-container">
      <nav class="nav-tabs">
        <button class="nav-tab active" onclick="showSection('overview')">Overview</button>
        <button class="nav-tab" onclick="showSection('dashboard')">Performance Dashboard</button>
        <button class="nav-tab" onclick="showSection('issues')">Issue Explorer</button>
        <button class="nav-tab" onclick="showSection('pages')">Page Details</button>
      </nav>
    </div>
  </div>

  <div class="report-container">
    <div id="overview-section" class="report-section">
      ${mainReport}
    </div>

    <div class="section-divider"></div>

    <div id="dashboard-section" class="report-section" style="display: none;">
      ${dashboard}
    </div>

    <div class="section-divider"></div>

    <div id="issues-section" class="report-section" style="display: none;">
      ${issueExplorer}
    </div>

    <div class="section-divider"></div>

    <div id="pages-section" class="report-section" style="display: none;">
      <h2>Detailed Page Analysis</h2>
      <p>Individual page performance metrics and recommendations will be displayed here.</p>
    </div>
  </div>

  <script>
    // Section navigation
    function showSection(sectionName) {
      // Hide all sections
      const sections = document.querySelectorAll('.report-section');
      sections.forEach(section => section.style.display = 'none');
      
      // Show selected section
      const targetSection = document.getElementById(sectionName + '-section');
      if (targetSection) {
        targetSection.style.display = 'block';
      }
      
      // Update nav tabs
      const tabs = document.querySelectorAll('.nav-tab');
      tabs.forEach(tab => tab.classList.remove('active'));
      event.target.classList.add('active');
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Initialize report
    document.addEventListener('DOMContentLoaded', function() {
      // Show overview section by default
      showSection('overview');
      
      // Initialize theme detection
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('theme-dark');
      }
    });
  </script>
</body>
</html>`;
  }
}

class CSVTemplate implements ReportTemplate {
  name = 'csv';
  format: OutputFormat = 'csv';

  async generate(data: ProcessedAuditData): Promise<string> {
    const { CSVExportGenerator } = await import('./csv-export-generator.js');
    const csvGenerator = new CSVExportGenerator();
    return csvGenerator.generatePerformanceCSV(data);
  }
}

// Specialized template stubs - these would be fully implemented
class QuickFixesTemplate implements ReportTemplate {
  name = 'quick-fixes';
  format: OutputFormat = 'markdown';
  async generate(data: ProcessedAuditData): Promise<string> {
    return '# Quick Fixes\n\nTop 5 highest-impact issues...';
  }
}

class TriageTemplate implements ReportTemplate {
  name = 'triage';
  format: OutputFormat = 'markdown';
  async generate(data: ProcessedAuditData): Promise<string> {
    return '# Triage Report\n\nPrioritized issues...';
  }
}

class OverviewTemplate implements ReportTemplate {
  name = 'overview';
  format: OutputFormat = 'markdown';
  async generate(data: ProcessedAuditData): Promise<string> {
    return '# Overview\n\nAudit overview...';
  }
}

// Import the actual AI-optimized templates
import { AIAnalysisTemplate } from './ai-analysis-generator.js';
import { StructuredIssuesTemplate } from './structured-issues-generator.js';
import { DashboardGenerator } from './dashboard-generator.js';
import { PerformanceSummaryGenerator } from './performance-summary-generator.js';

class DashboardTemplate implements ReportTemplate {
  name = 'dashboard';
  format: OutputFormat = 'markdown';
  private generator = new DashboardGenerator();

  async generate(data: ProcessedAuditData): Promise<string> {
    return this.generator.generateDashboard(data);
  }
}

class PerformanceSummaryTemplate implements ReportTemplate {
  name = 'performance-summary';
  format: OutputFormat = 'json';
  private generator = new PerformanceSummaryGenerator();

  async generate(data: ProcessedAuditData): Promise<string> {
    return this.generator.generateSummary(data);
  }
}

class CICDTemplate implements ReportTemplate {
  name = 'cicd';
  format: OutputFormat = 'json';
  async generate(data: ProcessedAuditData): Promise<string> {
    return JSON.stringify({ cicd: true, metrics: data.performanceMetrics }, null, 2);
  }
}

class WebhookTemplate implements ReportTemplate {
  name = 'webhook';
  format: OutputFormat = 'json';
  async generate(data: ProcessedAuditData): Promise<string> {
    return JSON.stringify({ webhook: true, summary: data.performanceMetrics }, null, 2);
  }
}