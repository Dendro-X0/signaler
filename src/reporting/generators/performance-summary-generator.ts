/**
 * Performance Summary Generator - Historical tracking and trend analysis
 * 
 * This module generates structured performance data for tracking improvements
 * over time and enabling before/after comparisons.
 */

import type { ProcessedAuditData, PageAuditResult } from './report-generator-engine.js';

/**
 * Structured summary report for performance tracking.
 */
export interface PerformanceSummaryReport {
  metadata: SummaryMetadata;
  overallMetrics: OverallMetrics;
  pageMetrics: PageMetrics[];
  categoryBreakdown: CategoryBreakdown;
  issuesSummary: IssuesSummary;
  trendData: TrendData;
  comparisonBaseline: ComparisonBaseline;
}

/**
 * Metadata describing a generated performance summary report.
 */
export interface SummaryMetadata {
  reportVersion: string;
  generatedAt: string;
  auditId: string;
  configPath: string;
  totalPages: number;
  auditDurationMs: number;
  signalerVersion: string;
}

/**
 * Aggregated metrics across the full audit run.
 */
export interface OverallMetrics {
  averageScores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  medianScores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  scoreDistribution: {
    excellent: number; // 90-100
    good: number;      // 75-89
    needsWork: number; // 50-74
    poor: number;      // 0-49
  };
  coreWebVitals: {
    averageLCP: number;
    averageFCP: number;
    averageTBT: number;
    averageCLS: number;
  };
}

/**
 * Metrics for a single page entry within a summary report.
 */
export interface PageMetrics {
  label: string;
  path: string;
  device: string;
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
  issueCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  estimatedSavings: {
    timeMs: number;
    bytes: number;
  };
  hash: string; // For detecting changes
}

/**
 * Category breakdown for issues and impact.
 */
export interface CategoryBreakdown {
  javascript: CategoryMetrics;
  css: CategoryMetrics;
  images: CategoryMetrics;
  caching: CategoryMetrics;
  network: CategoryMetrics;
}

/**
 * Metrics for a single issue category.
 */
export interface CategoryMetrics {
  issueCount: number;
  affectedPages: number;
  totalSavingsMs: number;
  totalSavingsBytes: number;
  averageImpact: number;
}

/**
 * Summary of issue counts and top issue types.
 */
export interface IssuesSummary {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  topIssueTypes: TopIssueType[];
  globalIssues: GlobalIssueSummary[];
}

/**
 * Aggregated entry for a top issue type.
 */
export interface TopIssueType {
  id: string;
  title: string;
  occurrences: number;
  affectedPages: number;
  totalSavingsMs: number;
  severity: string;
}

/**
 * Global issue summary entry.
 */
export interface GlobalIssueSummary {
  type: string;
  affectedPages: number;
  severity: string;
  description: string;
}

/**
 * Trend data point for historical tracking.
 */
export interface TrendData {
  timestamp: number;
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  totalIssues: number;
  criticalIssues: number;
  averageLCP: number;
  averageFCP: number;
  averageTBT: number;
  averageCLS: number;
}

/**
 * Comparison baseline describing previous run and deltas.
 */
export interface ComparisonBaseline {
  canCompare: boolean;
  previousRun?: {
    timestamp: number;
    performanceScore: number;
    totalIssues: number;
    criticalIssues: number;
  };
  improvements?: {
    performanceScoreDelta: number;
    issueCountDelta: number;
    criticalIssuesDelta: number;
    pagesImproved: number;
    pagesRegressed: number;
  };
}

/**
 * Performance Summary Generator for historical tracking
 */
export class PerformanceSummaryGenerator {
  /**
   * Generate performance summary JSON report
   */
  async generateSummary(data: ProcessedAuditData): Promise<string> {
    const summaryData = await this.processSummaryData(data);
    return JSON.stringify(summaryData, null, 2);
  }

  /**
   * Process audit data into summary format
   */
  private async processSummaryData(data: ProcessedAuditData): Promise<PerformanceSummaryReport> {
    const metadata = this.generateMetadata(data);
    const overallMetrics = this.calculateOverallMetrics(data.pages);
    const pageMetrics = this.generatePageMetrics(data.pages);
    const categoryBreakdown = this.calculateCategoryBreakdown(data.pages);
    const issuesSummary = this.generateIssuesSummary(data);
    const trendData = this.generateTrendData(overallMetrics, issuesSummary);
    const comparisonBaseline = await this.generateComparisonBaseline(data, overallMetrics);

    return {
      metadata,
      overallMetrics,
      pageMetrics,
      categoryBreakdown,
      issuesSummary,
      trendData,
      comparisonBaseline
    };
  }

  /**
   * Generate report metadata
   */
  private generateMetadata(data: ProcessedAuditData): SummaryMetadata {
    const auditId = this.generateAuditId(data);
    
    return {
      reportVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      auditId,
      configPath: data.auditMetadata.configPath,
      totalPages: data.pages.length,
      auditDurationMs: data.auditMetadata.elapsedMs,
      signalerVersion: '1.0.12'
    };
  }

  /**
   * Calculate overall performance metrics
   */
  private calculateOverallMetrics(pages: PageAuditResult[]): OverallMetrics {
    if (pages.length === 0) {
      return this.getEmptyOverallMetrics();
    }

    // Calculate averages
    const averageScores = {
      performance: this.calculateAverage(pages.map(p => p.scores.performance)),
      accessibility: this.calculateAverage(pages.map(p => p.scores.accessibility)),
      bestPractices: this.calculateAverage(pages.map(p => p.scores.bestPractices)),
      seo: this.calculateAverage(pages.map(p => p.scores.seo))
    };

    // Calculate medians
    const medianScores = {
      performance: this.calculateMedian(pages.map(p => p.scores.performance)),
      accessibility: this.calculateMedian(pages.map(p => p.scores.accessibility)),
      bestPractices: this.calculateMedian(pages.map(p => p.scores.bestPractices)),
      seo: this.calculateMedian(pages.map(p => p.scores.seo))
    };

    // Calculate score distribution
    const scoreDistribution = this.calculateScoreDistribution(pages);

    // Calculate Core Web Vitals averages
    const coreWebVitals = {
      averageLCP: this.calculateAverage(pages.map(p => p.metrics.lcpMs)),
      averageFCP: this.calculateAverage(pages.map(p => p.metrics.fcpMs)),
      averageTBT: this.calculateAverage(pages.map(p => p.metrics.tbtMs)),
      averageCLS: this.calculateAverage(pages.map(p => p.metrics.cls))
    };

    return {
      averageScores,
      medianScores,
      scoreDistribution,
      coreWebVitals
    };
  }

  /**
   * Generate individual page metrics
   */
  private generatePageMetrics(pages: PageAuditResult[]): PageMetrics[] {
    return pages.map(page => {
      const issueCount = this.countIssuesBySeverity(page.issues);
      const estimatedSavings = this.calculatePageSavings(page.issues);
      const hash = this.generatePageHash(page);

      return {
        label: page.label,
        path: page.path,
        device: page.device,
        scores: { ...page.scores },
        metrics: { ...page.metrics },
        issueCount,
        estimatedSavings,
        hash
      };
    });
  }

  /**
   * Calculate category breakdown metrics
   */
  private calculateCategoryBreakdown(pages: PageAuditResult[]): CategoryBreakdown {
    const categories = ['javascript', 'css', 'images', 'caching', 'network'] as const;
    const breakdown: Partial<CategoryBreakdown> = {};

    for (const category of categories) {
      const categoryIssues = pages.flatMap(page => 
        page.issues.filter(issue => issue.category === category)
      );

      const affectedPages = new Set(
        pages.filter(page => 
          page.issues.some(issue => issue.category === category)
        ).map(page => page.path)
      ).size;

      const totalSavingsMs = categoryIssues.reduce(
        (sum, issue) => sum + issue.estimatedSavings.timeMs, 0
      );

      const totalSavingsBytes = categoryIssues.reduce(
        (sum, issue) => sum + issue.estimatedSavings.bytes, 0
      );

      const averageImpact = categoryIssues.length > 0 
        ? totalSavingsMs / categoryIssues.length 
        : 0;

      breakdown[category] = {
        issueCount: categoryIssues.length,
        affectedPages,
        totalSavingsMs: Math.round(totalSavingsMs),
        totalSavingsBytes: Math.round(totalSavingsBytes),
        averageImpact: Math.round(averageImpact)
      };
    }

    return breakdown as CategoryBreakdown;
  }

  /**
   * Generate issues summary
   */
  private generateIssuesSummary(data: ProcessedAuditData): IssuesSummary {
    const allIssues = data.pages.flatMap(page => page.issues);
    
    const severityCounts = {
      critical: allIssues.filter(issue => issue.severity === 'critical').length,
      high: allIssues.filter(issue => issue.severity === 'high').length,
      medium: allIssues.filter(issue => issue.severity === 'medium').length,
      low: allIssues.filter(issue => issue.severity === 'low').length
    };

    const topIssueTypes = this.calculateTopIssueTypes(allIssues);
    const globalIssues = this.summarizeGlobalIssues(data.globalIssues);

    return {
      totalIssues: allIssues.length,
      criticalIssues: severityCounts.critical,
      highIssues: severityCounts.high,
      mediumIssues: severityCounts.medium,
      lowIssues: severityCounts.low,
      topIssueTypes,
      globalIssues
    };
  }

  /**
   * Generate trend data point for this audit
   */
  private generateTrendData(overallMetrics: OverallMetrics, issuesSummary: IssuesSummary): TrendData {
    return {
      timestamp: Date.now(),
      performanceScore: overallMetrics.averageScores.performance,
      accessibilityScore: overallMetrics.averageScores.accessibility,
      bestPracticesScore: overallMetrics.averageScores.bestPractices,
      seoScore: overallMetrics.averageScores.seo,
      totalIssues: issuesSummary.totalIssues,
      criticalIssues: issuesSummary.criticalIssues,
      averageLCP: overallMetrics.coreWebVitals.averageLCP,
      averageFCP: overallMetrics.coreWebVitals.averageFCP,
      averageTBT: overallMetrics.coreWebVitals.averageTBT,
      averageCLS: overallMetrics.coreWebVitals.averageCLS
    };
  }

  /**
   * Generate comparison baseline (would integrate with historical data storage)
   */
  private async generateComparisonBaseline(
    data: ProcessedAuditData, 
    currentMetrics: OverallMetrics
  ): Promise<ComparisonBaseline> {
    // In a real implementation, this would load previous run data from storage
    // For now, we'll return a baseline structure that indicates no comparison is available
    
    return {
      canCompare: false,
      // previousRun: undefined,
      // improvements: undefined
    };
  }

  /**
   * Helper methods
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }

  private calculateScoreDistribution(pages: PageAuditResult[]): OverallMetrics['scoreDistribution'] {
    const distribution = { excellent: 0, good: 0, needsWork: 0, poor: 0 };
    
    for (const page of pages) {
      const score = page.scores.performance;
      if (score >= 90) distribution.excellent++;
      else if (score >= 75) distribution.good++;
      else if (score >= 50) distribution.needsWork++;
      else distribution.poor++;
    }

    return distribution;
  }

  private countIssuesBySeverity(issues: any[]): PageMetrics['issueCount'] {
    return {
      critical: issues.filter(issue => issue.severity === 'critical').length,
      high: issues.filter(issue => issue.severity === 'high').length,
      medium: issues.filter(issue => issue.severity === 'medium').length,
      low: issues.filter(issue => issue.severity === 'low').length
    };
  }

  private calculatePageSavings(issues: any[]): PageMetrics['estimatedSavings'] {
    return {
      timeMs: Math.round(issues.reduce((sum, issue) => sum + issue.estimatedSavings.timeMs, 0)),
      bytes: Math.round(issues.reduce((sum, issue) => sum + issue.estimatedSavings.bytes, 0))
    };
  }

  private generatePageHash(page: PageAuditResult): string {
    // Generate a simple hash based on page path and scores for change detection
    const hashInput = `${page.path}-${page.scores.performance}-${page.scores.accessibility}-${page.scores.bestPractices}-${page.scores.seo}`;
    return Buffer.from(hashInput).toString('base64').slice(0, 8);
  }

  private calculateTopIssueTypes(issues: any[]): TopIssueType[] {
    const issueTypeMap = new Map<string, {
      title: string;
      occurrences: number;
      pages: Set<string>;
      totalSavingsMs: number;
      severity: string;
    }>();

    // Group issues by type
    for (const issue of issues) {
      if (!issueTypeMap.has(issue.id)) {
        issueTypeMap.set(issue.id, {
          title: issue.title,
          occurrences: 0,
          pages: new Set(),
          totalSavingsMs: 0,
          severity: issue.severity
        });
      }

      const issueData = issueTypeMap.get(issue.id)!;
      issueData.occurrences++;
      issueData.totalSavingsMs += issue.estimatedSavings.timeMs;
      
      // Note: We don't have page context here, so we'll use a placeholder
      issueData.pages.add('page-' + issueData.occurrences);
    }

    // Convert to array and sort by impact
    return Array.from(issueTypeMap.entries())
      .map(([id, data]) => ({
        id,
        title: data.title,
        occurrences: data.occurrences,
        affectedPages: data.pages.size,
        totalSavingsMs: Math.round(data.totalSavingsMs),
        severity: data.severity
      }))
      .sort((a, b) => b.totalSavingsMs - a.totalSavingsMs)
      .slice(0, 10); // Top 10 issue types
  }

  private summarizeGlobalIssues(globalIssues: any[]): GlobalIssueSummary[] {
    return globalIssues.map(issue => ({
      type: issue.type,
      affectedPages: issue.affectedPages.length,
      severity: issue.severity,
      description: issue.description
    }));
  }

  private generateAuditId(data: ProcessedAuditData): string {
    // Generate a unique audit ID based on timestamp and config
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configHash = Buffer.from(data.auditMetadata.configPath).toString('base64').slice(0, 6);
    return `audit-${timestamp}-${configHash}`;
  }

  private getEmptyOverallMetrics(): OverallMetrics {
    return {
      averageScores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
      medianScores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
      scoreDistribution: { excellent: 0, good: 0, needsWork: 0, poor: 0 },
      coreWebVitals: { averageLCP: 0, averageFCP: 0, averageTBT: 0, averageCLS: 0 }
    };
  }
}