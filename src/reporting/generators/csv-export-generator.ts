/**
 * CSV Export Generator - Spreadsheet-compatible performance data export
 * 
 * This module provides CSV export functionality for performance data,
 * issue summaries, and trend analysis data.
 */

import type { ProcessedAuditData, PageAuditResult, Issue } from './report-generator-engine.js';

export interface CSVExportConfig {
  includeMetrics: boolean;
  includeIssues: boolean;
  includeTrends: boolean;
  delimiter: ',' | ';' | '\t';
  includeHeaders: boolean;
}

export interface TrendData {
  timestamp: string;
  averagePerformanceScore: number;
  totalIssues: number;
  criticalIssues: number;
  pageCount: number;
}

/**
 * CSV Export Generator for spreadsheet-compatible performance data
 */
export class CSVExportGenerator {
  private config: CSVExportConfig;

  constructor(config: Partial<CSVExportConfig> = {}) {
    this.config = {
      includeMetrics: true,
      includeIssues: true,
      includeTrends: false,
      delimiter: ',',
      includeHeaders: true,
      ...config
    };
  }

  /**
   * Generate comprehensive CSV export with performance data
   */
  async generatePerformanceCSV(data: ProcessedAuditData): Promise<string> {
    const sections: string[] = [];

    if (this.config.includeHeaders) {
      sections.push('# Signaler Performance Report - CSV Export');
      sections.push(`# Generated: ${new Date().toISOString()}`);
      sections.push(`# Total Pages: ${data.performanceMetrics.totalPages}`);
      sections.push('');
    }

    // Performance overview section
    sections.push(this.generatePerformanceOverview(data));
    sections.push('');

    // Page-by-page performance data
    if (this.config.includeMetrics) {
      sections.push(this.generatePageMetricsCSV(data.pages));
      sections.push('');
    }

    // Issue summary data
    if (this.config.includeIssues) {
      sections.push(await this.generateIssueSummaryCSV(data));
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Generate issue summary CSV for analysis
   */
  async generateIssueSummaryCSV(data: ProcessedAuditData): Promise<string> {
    const sections: string[] = [];

    if (this.config.includeHeaders) {
      sections.push('# Issue Summary Export');
      sections.push('');
    }

    // Issue aggregation by type
    const issueAggregation = this.aggregateIssuesByType(data.pages);
    sections.push(this.formatIssueAggregation(issueAggregation));
    sections.push('');

    // Detailed issue breakdown
    sections.push(this.generateDetailedIssueCSV(data.pages));

    return sections.join('\n');
  }

  /**
   * Generate trend analysis CSV for tracking over time
   */
  async generateTrendAnalysisCSV(historicalData: TrendData[]): Promise<string> {
    const sections: string[] = [];

    if (this.config.includeHeaders) {
      sections.push('# Performance Trend Analysis');
      sections.push('');
    }

    // Trend data headers
    const headers = [
      'Timestamp',
      'Average Performance Score',
      'Total Issues',
      'Critical Issues',
      'Page Count',
      'Performance Change',
      'Issue Change'
    ];

    sections.push(this.formatCSVRow(headers));

    // Calculate changes between periods
    for (let i = 0; i < historicalData.length; i++) {
      const current = historicalData[i];
      const previous = i > 0 ? historicalData[i - 1] : null;

      const performanceChange = previous 
        ? (current.averagePerformanceScore - previous.averagePerformanceScore).toFixed(1)
        : '0';
      
      const issueChange = previous
        ? (current.totalIssues - previous.totalIssues).toString()
        : '0';

      const row = [
        current.timestamp,
        current.averagePerformanceScore.toString(),
        current.totalIssues.toString(),
        current.criticalIssues.toString(),
        current.pageCount.toString(),
        performanceChange,
        issueChange
      ];

      sections.push(this.formatCSVRow(row));
    }

    return sections.join('\n');
  }

  /**
   * Generate performance overview summary
   */
  private generatePerformanceOverview(data: ProcessedAuditData): string {
    const sections: string[] = [];
    
    sections.push('# Performance Overview');
    sections.push(this.formatCSVRow(['Metric', 'Value']));
    sections.push(this.formatCSVRow(['Total Pages', data.performanceMetrics.totalPages.toString()]));
    sections.push(this.formatCSVRow(['Average Performance Score', data.performanceMetrics.averagePerformanceScore.toString()]));
    sections.push(this.formatCSVRow(['Critical Issues Count', data.performanceMetrics.criticalIssuesCount.toString()]));
    sections.push(this.formatCSVRow(['Estimated Total Savings (ms)', data.performanceMetrics.estimatedTotalSavings.toString()]));

    return sections.join('\n');
  }

  /**
   * Generate page-by-page metrics CSV
   */
  private generatePageMetricsCSV(pages: PageAuditResult[]): string {
    const sections: string[] = [];
    
    sections.push('# Page Performance Metrics');
    
    // Headers
    const headers = [
      'Page Label',
      'Path',
      'Device',
      'Performance Score',
      'Accessibility Score',
      'Best Practices Score',
      'SEO Score',
      'LCP (ms)',
      'FCP (ms)',
      'TBT (ms)',
      'CLS',
      'Issues Count',
      'Critical Issues',
      'Estimated Savings (ms)'
    ];
    
    sections.push(this.formatCSVRow(headers));

    // Data rows
    for (const page of pages) {
      const criticalIssues = page.issues.filter(issue => issue.severity === 'critical').length;
      const totalSavings = page.issues.reduce((sum, issue) => sum + issue.estimatedSavings.timeMs, 0);

      const row = [
        page.label,
        page.path,
        page.device,
        page.scores.performance.toString(),
        page.scores.accessibility.toString(),
        page.scores.bestPractices.toString(),
        page.scores.seo.toString(),
        page.metrics.lcpMs.toString(),
        page.metrics.fcpMs.toString(),
        page.metrics.tbtMs.toString(),
        page.metrics.cls.toString(),
        page.issues.length.toString(),
        criticalIssues.toString(),
        totalSavings.toString()
      ];

      sections.push(this.formatCSVRow(row));
    }

    return sections.join('\n');
  }

  /**
   * Generate detailed issue breakdown CSV
   */
  private generateDetailedIssueCSV(pages: PageAuditResult[]): string {
    const sections: string[] = [];
    
    sections.push('# Detailed Issue Breakdown');
    
    // Headers
    const headers = [
      'Page Label',
      'Page Path',
      'Issue ID',
      'Issue Title',
      'Severity',
      'Category',
      'Estimated Savings (ms)',
      'Estimated Savings (bytes)',
      'Affected Resources Count',
      'Fix Difficulty'
    ];
    
    sections.push(this.formatCSVRow(headers));

    // Data rows
    for (const page of pages) {
      for (const issue of page.issues) {
        const fixDifficulty = issue.fixRecommendations.length > 0 
          ? issue.fixRecommendations[0].implementation.difficulty 
          : 'unknown';

        const row = [
          page.label,
          page.path,
          issue.id,
          issue.title,
          issue.severity,
          issue.category,
          issue.estimatedSavings.timeMs.toString(),
          issue.estimatedSavings.bytes.toString(),
          issue.affectedResources.length.toString(),
          fixDifficulty
        ];

        sections.push(this.formatCSVRow(row));
      }
    }

    return sections.join('\n');
  }

  /**
   * Aggregate issues by type across all pages
   */
  private aggregateIssuesByType(pages: PageAuditResult[]): Map<string, IssueAggregation> {
    const aggregation = new Map<string, IssueAggregation>();

    for (const page of pages) {
      for (const issue of page.issues) {
        if (!aggregation.has(issue.id)) {
          aggregation.set(issue.id, {
            issueId: issue.id,
            title: issue.title,
            category: issue.category,
            affectedPages: [],
            totalSavingsMs: 0,
            totalSavingsBytes: 0,
            severityCounts: { critical: 0, high: 0, medium: 0, low: 0 }
          });
        }

        const agg = aggregation.get(issue.id)!;
        agg.affectedPages.push(page.path);
        agg.totalSavingsMs += issue.estimatedSavings.timeMs;
        agg.totalSavingsBytes += issue.estimatedSavings.bytes;
        agg.severityCounts[issue.severity]++;
      }
    }

    return aggregation;
  }

  /**
   * Format issue aggregation as CSV
   */
  private formatIssueAggregation(aggregation: Map<string, IssueAggregation>): string {
    const sections: string[] = [];
    
    sections.push('# Issue Aggregation by Type');
    
    // Headers
    const headers = [
      'Issue ID',
      'Issue Title',
      'Category',
      'Affected Pages Count',
      'Total Savings (ms)',
      'Total Savings (bytes)',
      'Critical Count',
      'High Count',
      'Medium Count',
      'Low Count'
    ];
    
    sections.push(this.formatCSVRow(headers));

    // Sort by total savings (descending)
    const sortedAggregation = Array.from(aggregation.values())
      .sort((a, b) => b.totalSavingsMs - a.totalSavingsMs);

    for (const agg of sortedAggregation) {
      const row = [
        agg.issueId,
        agg.title,
        agg.category,
        agg.affectedPages.length.toString(),
        agg.totalSavingsMs.toString(),
        agg.totalSavingsBytes.toString(),
        agg.severityCounts.critical.toString(),
        agg.severityCounts.high.toString(),
        agg.severityCounts.medium.toString(),
        agg.severityCounts.low.toString()
      ];

      sections.push(this.formatCSVRow(row));
    }

    return sections.join('\n');
  }

  /**
   * Format a row as CSV with proper escaping
   */
  private formatCSVRow(values: string[]): string {
    const delimiter = this.config.delimiter;
    
    const escapedValues = values.map(value => {
      // Escape quotes and wrap in quotes if necessary
      if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });

    return escapedValues.join(delimiter);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CSVExportConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Supporting interfaces
 */
interface IssueAggregation {
  issueId: string;
  title: string;
  category: string;
  affectedPages: string[];
  totalSavingsMs: number;
  totalSavingsBytes: number;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}