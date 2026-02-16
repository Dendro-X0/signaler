/**
 * Raw Results Processor - Processes Lighthouse audit results into structured data
 * 
 * This module handles the processing of raw Lighthouse audit results,
 * including validation, normalization, and adding performance score context.
 */

import type { RunSummary, PageDeviceSummary, MetricValues, CategoryScores } from '../../types.js';

/**
 * Normalized audit data derived from raw Lighthouse results.
 */
export interface ProcessedAuditData {
  readonly pages: PageAuditResult[];
  readonly globalIssues: GlobalIssue[];
  readonly performanceMetrics: PerformanceMetrics;
  readonly auditMetadata: AuditMetadata;
}

/**
 * Normalized audit result for a single page.
 */
export interface PageAuditResult {
  readonly label: string;
  readonly path: string;
  readonly device: 'desktop' | 'mobile';
  readonly scores: CategoryScores;
  readonly metrics: MetricValues;
  readonly issues: Issue[];
  readonly opportunities: Opportunity[];
}

/**
 * Identified issue impacting a page.
 */
export interface Issue {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly category: 'javascript' | 'css' | 'images' | 'caching' | 'network' | 'accessibility' | 'seo' | 'best-practices';
  readonly affectedResources: Resource[];
  readonly estimatedSavings: {
    readonly timeMs: number;
    readonly bytes: number;
  };
}

/**
 * Opportunity candidate with estimated savings.
 */
export interface Opportunity {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly estimatedSavingsMs?: number;
  readonly estimatedSavingsBytes?: number;
}

/**
 * Resource affected by an {@link Issue}.
 */
export interface Resource {
  readonly url: string;
  readonly type: 'script' | 'stylesheet' | 'image' | 'font' | 'other';
  readonly size: number;
}

/**
 * Issue that affects multiple pages.
 */
export interface GlobalIssue {
  readonly type: string;
  readonly description: string;
  readonly affectedPages: string[];
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Aggregate metrics derived from processed results.
 */
export interface PerformanceMetrics {
  readonly averageScores: CategoryScores;
  readonly totalPages: number;
  readonly auditDuration: number;
  readonly disclaimer: string;
}

/**
 * Metadata describing a processed audit run.
 */
export interface AuditMetadata {
  readonly startedAt: string;
  readonly completedAt: string;
  readonly elapsedMs: number;
  readonly totalPages: number;
  readonly throttlingMethod: string;
  readonly cpuSlowdownMultiplier: number;
}

/**
 * Validation report for raw results input.
 */
export interface ValidationReport {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Processes raw Lighthouse audit results into structured data
 */
export class RawResultsProcessor {
  /**
   * Process Lighthouse audit results into structured data
   */
  processAuditResults(results: RunSummary): ProcessedAuditData {
    const validationReport = this.validateResults(results);
    if (!validationReport.isValid) {
      throw new Error(`Invalid audit results: ${validationReport.errors.join(', ')}`);
    }

    const pages = this.processPages(results.results);
    const globalIssues = this.identifyGlobalIssues(pages);
    const performanceMetrics = this.calculatePerformanceMetrics(results);
    const auditMetadata = this.extractAuditMetadata(results.meta);

    return {
      pages,
      globalIssues,
      performanceMetrics,
      auditMetadata,
    };
  }

  /**
   * Validate audit results for completeness and correctness
   */
  validateResults(results: RunSummary): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!results) {
      errors.push('Results object is null or undefined');
      return { isValid: false, errors, warnings };
    }

    if (!results.meta) {
      errors.push('Missing metadata in results');
    }

    if (!Array.isArray(results.results)) {
      errors.push('Results must contain an array of page results');
    } else if (results.results.length === 0) {
      warnings.push('No page results found in audit data');
    }

    // Validate individual page results
    if (Array.isArray(results.results)) {
      for (const [index, pageResult] of results.results.entries()) {
        if (!pageResult.label) {
          errors.push(`Page result ${index} missing label`);
        }
        if (!pageResult.path) {
          errors.push(`Page result ${index} missing path`);
        }
        if (!pageResult.device) {
          errors.push(`Page result ${index} missing device type`);
        }
        if (!pageResult.scores) {
          errors.push(`Page result ${index} missing scores`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Normalize scores and add performance context
   */
  normalizeScores(results: RunSummary): RunSummary {
    const normalizedResults = results.results.map(page => ({
      ...page,
      scores: {
        performance: this.normalizeScore(page.scores.performance),
        accessibility: this.normalizeScore(page.scores.accessibility),
        bestPractices: this.normalizeScore(page.scores.bestPractices),
        seo: this.normalizeScore(page.scores.seo),
      },
    }));

    return {
      ...results,
      results: normalizedResults,
    };
  }

  private processPages(pageResults: readonly PageDeviceSummary[]): PageAuditResult[] {
    return pageResults.map(page => ({
      label: page.label,
      path: page.path,
      device: page.device,
      scores: page.scores,
      metrics: page.metrics,
      issues: this.extractIssues(page),
      opportunities: this.extractOpportunities(page),
    }));
  }

  private extractIssues(page: PageDeviceSummary): Issue[] {
    const issues: Issue[] = [];

    // 1. Process explicit failed audits (Red/Orange issues from all categories)
    if (page.failedAudits) {
      for (const audit of page.failedAudits) {
        issues.push({
          id: audit.id,
          title: audit.title,
          description: audit.description,
          severity: this.classifyAuditSeverity(audit.score, audit.id),
          category: this.categorizeIssue(audit.id),
          affectedResources: [], // Detailed resource mapping could be added here
          estimatedSavings: {
            timeMs: audit.details?.overallSavingsMs || 0,
            bytes: audit.details?.overallSavingsBytes || 0,
          },
        });
      }
    }

    // 2. Process performance opportunities (if not already captured by failed audits)
    for (const opp of page.opportunities) {
      if (!issues.some(i => i.id === opp.id)) {
        issues.push({
          id: opp.id,
          title: opp.title,
          description: opp.title,
          severity: this.classifySeverity(opp.estimatedSavingsMs || 0),
          category: this.categorizeIssue(opp.id),
          affectedResources: [],
          estimatedSavings: {
            timeMs: opp.estimatedSavingsMs || 0,
            bytes: opp.estimatedSavingsBytes || 0,
          },
        });
      }
    }

    return issues;
  }

  private classifyAuditSeverity(score: number, id: string): 'critical' | 'high' | 'medium' | 'low' {
    // Specific high-impact audits
    const criticalAudits = ['interactive', 'largest-contentful-paint', 'total-blocking-time'];
    if (criticalAudits.includes(id) && score < 0.5) return 'critical';

    if (score < 0.5) return 'high';
    if (score < 0.9) return 'medium';
    return 'low';
  }

  private extractOpportunities(page: PageDeviceSummary): Opportunity[] {
    return page.opportunities.map(opp => ({
      id: opp.id,
      title: opp.title,
      description: opp.title,
      estimatedSavingsMs: opp.estimatedSavingsMs,
      estimatedSavingsBytes: opp.estimatedSavingsBytes,
    }));
  }

  private identifyGlobalIssues(pages: PageAuditResult[]): GlobalIssue[] {
    const issueMap = new Map<string, { pages: string[], issue: Issue }>();

    // Group issues by ID across all pages
    for (const page of pages) {
      for (const issue of page.issues) {
        const key = issue.id;
        if (issueMap.has(key)) {
          issueMap.get(key)!.pages.push(page.label);
        } else {
          issueMap.set(key, { pages: [page.label], issue });
        }
      }
    }

    // Convert to global issues (affecting multiple pages)
    return Array.from(issueMap.entries())
      .filter(([, data]) => data.pages.length > 1)
      .map(([, data]) => ({
        type: data.issue.id,
        description: data.issue.title,
        affectedPages: data.pages,
        severity: data.issue.severity,
      }));
  }

  private calculatePerformanceMetrics(results: RunSummary): PerformanceMetrics {
    const scores = results.results.map(r => r.scores);
    const totalPages = results.results.length;

    const averageScores: CategoryScores = {
      performance: this.calculateAverage(scores.map(s => s.performance).filter(Boolean)),
      accessibility: this.calculateAverage(scores.map(s => s.accessibility).filter(Boolean)),
      bestPractices: this.calculateAverage(scores.map(s => s.bestPractices).filter(Boolean)),
      seo: this.calculateAverage(scores.map(s => s.seo).filter(Boolean)),
    };

    return {
      averageScores,
      totalPages,
      auditDuration: results.meta.elapsedMs,
      disclaimer: this.generatePerformanceDisclaimer(results.meta),
    };
  }

  private extractAuditMetadata(meta: RunSummary['meta']): AuditMetadata {
    return {
      startedAt: meta.startedAt,
      completedAt: meta.completedAt,
      elapsedMs: meta.elapsedMs,
      totalPages: meta.comboCount,
      throttlingMethod: meta.throttlingMethod,
      cpuSlowdownMultiplier: meta.cpuSlowdownMultiplier,
    };
  }

  private normalizeScore(score: number | undefined): number | undefined {
    if (score === undefined) return undefined;
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  private classifySeverity(savingsMs: number): 'critical' | 'high' | 'medium' | 'low' {
    if (savingsMs >= 2000) return 'critical';
    if (savingsMs >= 1000) return 'high';
    if (savingsMs >= 500) return 'medium';
    return 'low';
  }

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

  private calculateAverage(values: (number | undefined)[]): number | undefined {
    const validValues = values.filter((v): v is number => v !== undefined);
    if (validValues.length === 0) return undefined;
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  }

  private generatePerformanceDisclaimer(meta: RunSummary['meta']): string {
    const pagesText = meta.comboCount === 1 ? 'page' : 'pages';
    const timeText = (meta.elapsedMs / 1000 / 60).toFixed(1);

    return `Performance scores generated by Signaler's automated testing environment may be lower than manual Chrome DevTools testing. ` +
      `This audit processed ${meta.comboCount} ${pagesText} in ${timeText} minutes using ${meta.throttlingMethod} throttling ` +
      `with ${meta.cpuSlowdownMultiplier}x CPU slowdown. Focus on relative performance differences between pages rather than absolute scores.`;
  }
}