/**
 * Report Generator Engine - Multi-format report generation with streaming support
 * 
 * This module provides the main report generation engine that coordinates
 * different report formats and handles large dataset processing.
 */

import type { AuditResult, AuditMetadata } from '../../core/audit-engine.js';
import type { RunSummary, PageDeviceSummary, ApexDevice } from '../../core/types.js';
import type { ReportGenerator, Report, OutputFormat } from '../index.js';
import { StreamingJSONProcessor, shouldUseStreaming, estimateObjectSize } from '../processors/streaming-json-processor.js';
import { ProgressIndicator, MultiStageProgress, createProgressCallback } from '../processors/progress-indicator.js';
import { OptimizedFileIO, calculateOptimalBufferSize } from '../processors/optimized-file-io.js';
import { MemoryOptimizer, withMemoryMonitoring, checkMemoryAvailability } from '../processors/memory-optimizer.js';
import { CompactAuditStorage, StreamingAuditProcessor, MemoryEfficientAggregator } from '../processors/memory-efficient-structures.js';

/**
 * Configuration for {@link ReportGeneratorEngine}.
 */
export interface ReportGeneratorConfig {
  /**
   * List of output formats to generate reports in.
   */
  outputFormats: OutputFormat[];
  /**
   * Whether to include screenshots in the report.
   */
  includeScreenshots: boolean;
  /**
   * Maximum number of issues to include in each report.
   */
  maxIssuesPerReport: number;
  /**
   * Whether to optimize token usage in the report.
   */
  tokenOptimization: boolean;
  /**
   * Number of pages above which to use streaming report generation.
   */
  streamingThreshold: number;
  /**
   * Whether to display progress indicators during report generation.
   */
  enableProgressIndicators: boolean;
  /**
   * Whether to optimize file I/O operations during report generation.
   */
  optimizeFileIO: boolean;
  /**
   * Whether to enable compression for report output.
   */
  compressionEnabled: boolean;
  /**
   * Maximum amount of memory (in MB) to allocate for report generation.
   */
  maxMemoryMB: number;
}

/**
 * Normalized audit data used internally for report generation.
 */
export interface ProcessedAuditData {
  /**
   * List of page-level audit results.
   */
  pages: PageAuditResult[];
  /**
   * List of global issues affecting multiple pages.
   */
  globalIssues: GlobalIssue[];
  /**
   * Aggregate performance metrics computed across pages.
   */
  performanceMetrics: PerformanceMetrics;
  /**
   * Metadata about the audit run.
   */
  auditMetadata: AuditMetadata;
}

/**
 * Normalized audit result for a single page.
 */
export interface PageAuditResult {
  /**
   * Label for the page (e.g. URL or title).
   */
  label: string;
  /**
   * Path to the page (e.g. URL).
   */
  path: string;
  /**
   * Device type used for the audit (desktop or mobile).
   */
  device: 'desktop' | 'mobile';
  /**
   * Scores for different audit categories.
   */
  scores: {
    /**
     * Performance score.
     */
    performance: number;
    /**
     * Accessibility score.
     */
    accessibility: number;
    /**
     * Best practices score.
     */
    bestPractices: number;
    /**
     * SEO score.
     */
    seo: number;
  };
  /**
   * Metrics for the page (e.g. LCP, FCP, TBT, CLS).
   */
  metrics: {
    /**
     * Largest Contentful Paint (LCP) time in milliseconds.
     */
    lcpMs: number;
    /**
     * First Contentful Paint (FCP) time in milliseconds.
     */
    fcpMs: number;
    /**
     * Total Blocking Time (TBT) in milliseconds.
     */
    tbtMs: number;
    /**
     * Cumulative Layout Shift (CLS) score.
     */
    cls: number;
  };
  /**
   * List of issues detected on the page.
   */
  issues: Issue[];
  /**
   * List of opportunities for improvement on the page.
   */
  opportunities: Opportunity[];
}

/**
 * Issue record produced for report generation.
 */
export interface Issue {
  /**
   * Unique identifier for the issue.
   */
  id: string;
  /**
   * Title of the issue.
   */
  title: string;
  /**
   * Description of the issue.
   */
  description: string;
  /**
   * Severity of the issue (critical, high, medium, or low).
   */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /**
   * Category of the issue (e.g. JavaScript, CSS, images, caching, network).
   */
  category: 'javascript' | 'css' | 'images' | 'caching' | 'network' | 'accessibility' | 'seo' | 'best-practices';
  /**
   * List of resources affected by the issue.
   */
  affectedResources: Resource[];
  /**
   * Estimated savings from fixing the issue.
   */
  estimatedSavings: {
    /**
     * Estimated time savings in milliseconds.
     */
    timeMs: number;
    /**
     * Estimated byte savings.
     */
    bytes: number;
  };
  /**
   * List of actionable recommendations for fixing the issue.
   */
  fixRecommendations: ActionableRecommendation[];
}

/**
 * Opportunity record produced for report generation.
 */
export interface Opportunity {
  /**
   * Unique identifier for the opportunity.
   */
  id: string;
  /**
   * Title of the opportunity.
   */
  title: string;
  /**
   * Description of the opportunity.
   */
  description: string;
  /**
   * Estimated savings from addressing the opportunity.
   */
  estimatedSavings: {
    /**
     * Estimated time savings in milliseconds.
     */
    timeMs: number;
    /**
     * Estimated byte savings.
     */
    bytes: number;
  };
}

/**
 * Resource referenced by an issue or opportunity.
 */
export interface Resource {
  /**
   * URL of the resource.
   */
  url: string;
  /**
   * Type of the resource (e.g. image, script, stylesheet).
   */
  type: string;
  /**
   * Size of the resource in bytes.
   */
  size: number;
}

/**
 * Actionable recommendation describing how to remediate an issue.
 */
export interface ActionableRecommendation {
  /**
   * Action to take to fix the issue.
   */
  action: string;
  /**
   * Implementation details for the recommendation.
   */
  implementation: {
    /**
     * Difficulty level of the recommendation (easy, medium, or hard).
     */
    difficulty: 'easy' | 'medium' | 'hard';
    /**
     * Estimated time required to implement the recommendation.
     */
    estimatedTime: string;
    /**
     * Optional code example for the recommendation.
     */
    codeExample?: string;
    /**
     * List of documentation resources for the recommendation.
     */
    documentation: string[];
  };
  /**
   * Optional framework-specific information for the recommendation.
   */
  framework?: 'nextjs' | 'react' | 'vue' | 'angular';
}

/**
 * Issue that affects multiple pages.
 */
export interface GlobalIssue {
  /**
   * Type of the issue.
   */
  type: string;
  /**
   * List of pages affected by the issue.
   */
  affectedPages: string[];
  /**
   * Severity of the issue (critical, high, medium, or low).
   */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /**
   * Description of the issue.
   */
  description: string;
}

/**
 * Aggregate performance metrics computed across pages.
 */
export interface PerformanceMetrics {
  /**
   * Average performance score across pages.
   */
  averagePerformanceScore: number;
  /**
   * Total number of pages audited.
   */
  totalPages: number;
  /**
   * Number of critical issues detected.
   */
  criticalIssuesCount: number;
  /**
   * Estimated total savings from fixing all issues.
   */
  estimatedTotalSavings: number;
  /**
   * Average scores per category (aligned with raw-results-processor)
   */
  averageScores: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
  };
  /**
   * Total audit duration
   */
  auditDuration: number;
  /**
   * Performance score disclaimer
   */
  disclaimer: string;
}

/**
 * Report template contract used by the generator engine.
 */
export interface ReportTemplate {
  /**
   * Name of the report template.
   */
  name: string;
  /**
   * Output format of the report.
   */
  format: OutputFormat;
  /**
   * Generate the report content using the provided data.
   */
  generate(data: ProcessedAuditData): Promise<string>;
}

/**
 * Developer-focused report outputs.
 */
export interface DeveloperReports {
  /**
   * Quick fixes report content.
   */
  quickFixes: string;
  /**
   * Triage report content.
   */
  triage: string;
  /**
   * Overview report content.
   */
  overview: string;
}

/**
 * AI-focused report outputs.
 */
export interface AIReports {
  /**
   * Analysis report content.
   */
  analysis: string;
  /**
   * Structured issues report content.
   */
  structuredIssues: string;
}

/**
 * Executive-focused report outputs.
 */
export interface ExecutiveReports {
  /**
   * Dashboard report content.
   */
  dashboard: string;
  /**
   * Performance summary report content.
   */
  performanceSummary: string;
}

/**
 * Integration outputs suitable for CI/CD and webhooks.
 */
export interface IntegrationOutputs {
  /**
   * List of CI/CD report contents.
   */
  cicdReports: string[];
  /**
   * List of webhook payload contents.
   */
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
   * Map RunSummary to ProcessedAuditData
   */
  public mapRunSummaryToProcessedData(summary: RunSummary): ProcessedAuditData {
    const pages: PageAuditResult[] = summary.results.map(r => ({
      label: r.label,
      path: r.path,
      device: r.device as 'desktop' | 'mobile',
      scores: {
        performance: r.scores.performance || 0,
        accessibility: r.scores.accessibility || 0,
        bestPractices: r.scores.bestPractices || 0,
        seo: r.scores.seo || 0
      },
      metrics: {
        lcpMs: r.metrics.lcpMs || 0,
        fcpMs: r.metrics.fcpMs || 0,
        tbtMs: r.metrics.tbtMs || 0,
        cls: r.metrics.cls || 0
      },
      issues: [
        ...(r.opportunities || []).map(o => ({
          id: o.id,
          title: o.title,
          description: '',
          severity: this.classifySeverity(o.estimatedSavingsMs || 0),
          category: this.categorizeIssue(o.id),
          affectedResources: [],
          estimatedSavings: {
            timeMs: o.estimatedSavingsMs || 0,
            bytes: o.estimatedSavingsBytes || 0
          },
          fixRecommendations: []
        })),
        ...(r.failedAudits || []).map(f => ({
          id: f.id,
          title: f.title,
          description: f.description,
          severity: this.classifyAuditSeverity(f.score, f.id),
          category: this.categorizeIssue(f.id),
          affectedResources: [],
          estimatedSavings: {
            timeMs: 0,
            bytes: 0
          },
          fixRecommendations: []
        }))
      ],
      opportunities: (r.opportunities || []).map(o => ({
        id: o.id,
        title: o.title,
        description: '',
        estimatedSavings: {
          timeMs: o.estimatedSavingsMs || 0,
          bytes: o.estimatedSavingsBytes || 0
        }
      }))
    }));

    const performanceMetrics = this.calculatePerformanceMetrics(pages);

    return {
      pages,
      globalIssues: [],
      performanceMetrics,
      auditMetadata: {
        configPath: summary.meta.configPath,
        startedAt: summary.meta.startedAt,
        completedAt: summary.meta.completedAt,
        elapsedMs: summary.meta.elapsedMs,
        totalPages: summary.meta.comboCount,
        totalRunners: 1,
        throttlingMethod: summary.meta.throttlingMethod,
        cpuSlowdownMultiplier: summary.meta.cpuSlowdownMultiplier
      }
    };
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
        totalRunners: data.meta.totalRunners,
        throttlingMethod: 'simulate',
        cpuSlowdownMultiplier: 4
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
        totalRunners: data.meta.totalRunners,
        throttlingMethod: 'simulate',
        cpuSlowdownMultiplier: 4
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
          severity: this.classifyAuditSeverity(audit.score, auditId),
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
    const averageA11yScore = pages.reduce((sum, page) => sum + (page.scores.accessibility || 0), 0) / totalPages;
    const averageBestPracticesScore = pages.reduce((sum, page) => sum + (page.scores.bestPractices || 0), 0) / totalPages;
    const averageSEOScore = pages.reduce((sum, page) => sum + (page.scores.seo || 0), 0) / totalPages;

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
      estimatedTotalSavings: Math.round(estimatedTotalSavings),
      averageScores: {
        performance: Math.round(averagePerformanceScore),
        accessibility: Math.round(averageA11yScore),
        bestPractices: Math.round(averageBestPracticesScore),
        seo: Math.round(averageSEOScore)
      },
      auditDuration: 0, // Should be passed from somewhere, but setting default for now
      disclaimer: 'Performance metrics calculated across all audited pages.'
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
   * Categorize issue based on ID
   */
  private categorizeIssue(issueId: string): 'javascript' | 'css' | 'images' | 'caching' | 'network' | 'accessibility' | 'seo' | 'best-practices' {
    // A11y group
    const a11yKeywords = ['aria-', 'label', 'alt-', 'contrast', 'color-contrast', 'html-has-lang', 'image-alt'];
    if (a11yKeywords.some(k => issueId.includes(k))) return 'accessibility';

    // SEO group
    const seoKeywords = ['meta-description', 'http-status-code', 'font-size', 'link-text', 'crawlable'];
    if (seoKeywords.some(k => issueId.includes(k))) return 'seo';

    // Best Practices group
    const bpKeywords = ['doctype', 'charset', 'image-aspect-ratio', 'deprecated-apis'];
    if (bpKeywords.some(k => issueId.includes(k))) return 'best-practices';

    if (issueId.includes('unused-javascript') || issueId.includes('unminified-javascript')) {
      return 'javascript';
    }
    if (issueId.includes('unused-css') || issueId.includes('unminified-css')) {
      return 'css';
    }
    if (issueId.includes('modern-image-formats') || issueId.includes('optimized-images')) {
      return 'images';
    }
    if (issueId.includes('uses-long-cache-ttl') || issueId.includes('efficient-animated-content')) {
      return 'caching';
    }
    return 'network';
  }

  /**
   * Classify audit severity based on score
   */
  private classifyAuditSeverity(score: number, id: string): 'critical' | 'high' | 'medium' | 'low' {
    const criticalAudits = ['interactive', 'largest-contentful-paint', 'total-blocking-time'];
    if (criticalAudits.includes(id) && score < 0.5) return 'critical';

    if (score < 0.5) return 'high';
    if (score < 0.9) return 'medium';
    return 'low';
  }

  /**
   * Classify severity based on savings
   */
  private classifySeverity(savingsMs: number): 'critical' | 'high' | 'medium' | 'low' {
    if (savingsMs >= 2000) return 'critical';
    if (savingsMs >= 1000) return 'high';
    if (savingsMs >= 500) return 'medium';
    return 'low';
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
  private generator = new EnhancedTriageGenerator();

  async generate(data: ProcessedAuditData): Promise<string> {
    return this.generator.generate(data);
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
import { EnhancedTriageGenerator } from './enhanced-triage-generator.js';

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