/**
 * Dashboard Generator - Executive summary report generator
 * 
 * This module generates high-level performance overviews for executives
 * and project managers, focusing on key metrics and actionable insights.
 */

import type { ProcessedAuditData, PageAuditResult, Issue } from './report-generator-engine.js';

/**
 * Aggregate data used to render an executive dashboard.
 */
export interface DashboardData {
  performanceOverview: PerformanceOverview;
  scoreDistribution: ScoreDistribution;
  worstPerformingPages: WorstPerformingPage[];
  potentialGains: PotentialGains;
  auditSummary: AuditSummary;
}

/**
 * High-level performance metrics for an audit run.
 */
export interface PerformanceOverview {
  totalPages: number;
  averagePerformanceScore: number;
  pagesAbove90: number;
  pagesBelow50: number;
  criticalIssuesCount: number;
  auditDuration: string;
}

/**
 * Distribution of performance scores across pages.
 */
export interface ScoreDistribution {
  excellent: number; // 90-100
  good: number;      // 75-89
  needsWork: number; // 50-74
  poor: number;      // 0-49
}

/**
 * Summary entry for a worst-performing page.
 */
export interface WorstPerformingPage {
  label: string;
  path: string;
  performanceScore: number;
  device: string;
  primaryIssues: string[];
  estimatedSavingsMs: number;
}

/**
 * Estimated gains from addressing top issues.
 */
export interface PotentialGains {
  totalTimeSavingsMs: number;
  totalBytesSavings: number;
  averagePageImprovement: number;
  topImpactCategories: ImpactCategory[];
}

/**
 * Aggregate impact for a single category.
 */
export interface ImpactCategory {
  category: string;
  affectedPages: number;
  estimatedSavingsMs: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Metadata summary for the audit run.
 */
export interface AuditSummary {
  auditedAt: string;
  configPath: string;
  totalRuntime: string;
  pagesPerMinute: number;
  disclaimer: string;
}

/**
 * Dashboard Generator for executive summary reports
 */
export class DashboardGenerator {
  /**
   * Generate executive dashboard markdown report
   */
  async generateDashboard(data: ProcessedAuditData): Promise<string> {
    const dashboardData = this.processDashboardData(data);
    return this.formatDashboardMarkdown(dashboardData);
  }

  /**
   * Process audit data into dashboard-specific format
   */
  private processDashboardData(data: ProcessedAuditData): DashboardData {
    const performanceOverview = this.calculatePerformanceOverview(data);
    const scoreDistribution = this.calculateScoreDistribution(data.pages);
    const worstPerformingPages = this.identifyWorstPerformingPages(data.pages);
    const potentialGains = this.calculatePotentialGains(data.pages);
    const auditSummary = this.generateAuditSummary(data);

    return {
      performanceOverview,
      scoreDistribution,
      worstPerformingPages,
      potentialGains,
      auditSummary
    };
  }

  /**
   * Calculate high-level performance overview metrics
   */
  private calculatePerformanceOverview(data: ProcessedAuditData): PerformanceOverview {
    const pages = data.pages;
    const totalPages = pages.length;
    const averagePerformanceScore = Math.round(
      pages.reduce((sum, page) => sum + page.scores.performance, 0) / totalPages
    );
    
    const pagesAbove90 = pages.filter(page => page.scores.performance >= 90).length;
    const pagesBelow50 = pages.filter(page => page.scores.performance < 50).length;
    
    const criticalIssuesCount = pages.reduce((sum, page) => 
      sum + page.issues.filter(issue => issue.severity === 'critical').length, 0
    );

    // Calculate audit duration from metadata
    const elapsedMs = data.auditMetadata.elapsedMs || 0;
    const auditDuration = this.formatDuration(elapsedMs);

    return {
      totalPages,
      averagePerformanceScore,
      pagesAbove90,
      pagesBelow50,
      criticalIssuesCount,
      auditDuration
    };
  }

  /**
   * Calculate performance score distribution
   */
  private calculateScoreDistribution(pages: PageAuditResult[]): ScoreDistribution {
    const distribution = {
      excellent: 0, // 90-100
      good: 0,      // 75-89
      needsWork: 0, // 50-74
      poor: 0       // 0-49
    };

    for (const page of pages) {
      const score = page.scores.performance;
      if (score >= 90) distribution.excellent++;
      else if (score >= 75) distribution.good++;
      else if (score >= 50) distribution.needsWork++;
      else distribution.poor++;
    }

    return distribution;
  }

  /**
   * Identify the worst performing pages for executive attention
   */
  private identifyWorstPerformingPages(pages: PageAuditResult[]): WorstPerformingPage[] {
    return pages
      .sort((a, b) => a.scores.performance - b.scores.performance)
      .slice(0, 5) // Top 5 worst performing
      .map(page => {
        const primaryIssues = page.issues
          .filter(issue => issue.severity === 'critical' || issue.severity === 'high')
          .slice(0, 3) // Top 3 issues
          .map(issue => issue.title);

        const estimatedSavingsMs = page.issues.reduce(
          (sum, issue) => sum + issue.estimatedSavings.timeMs, 0
        );

        return {
          label: page.label,
          path: page.path,
          performanceScore: page.scores.performance,
          device: page.device,
          primaryIssues,
          estimatedSavingsMs: Math.round(estimatedSavingsMs)
        };
      });
  }

  /**
   * Calculate total potential performance gains
   */
  private calculatePotentialGains(pages: PageAuditResult[]): PotentialGains {
    let totalTimeSavingsMs = 0;
    let totalBytesSavings = 0;
    const categoryImpact = new Map<string, { pages: Set<string>, savingsMs: number }>();

    for (const page of pages) {
      for (const issue of page.issues) {
        totalTimeSavingsMs += issue.estimatedSavings.timeMs;
        totalBytesSavings += issue.estimatedSavings.bytes;

        // Track category impact
        if (!categoryImpact.has(issue.category)) {
          categoryImpact.set(issue.category, { pages: new Set(), savingsMs: 0 });
        }
        const categoryData = categoryImpact.get(issue.category)!;
        categoryData.pages.add(page.path);
        categoryData.savingsMs += issue.estimatedSavings.timeMs;
      }
    }

    // Calculate average improvement per page
    const averagePageImprovement = pages.length > 0 
      ? Math.round(totalTimeSavingsMs / pages.length) 
      : 0;

    // Generate top impact categories
    const topImpactCategories: ImpactCategory[] = Array.from(categoryImpact.entries())
      .map(([category, data]) => ({
        category: this.formatCategoryName(category),
        affectedPages: data.pages.size,
        estimatedSavingsMs: Math.round(data.savingsMs),
        priority: this.calculateCategoryPriority(data.savingsMs, data.pages.size)
      }))
      .sort((a, b) => b.estimatedSavingsMs - a.estimatedSavingsMs)
      .slice(0, 4); // Top 4 categories

    return {
      totalTimeSavingsMs: Math.round(totalTimeSavingsMs),
      totalBytesSavings: Math.round(totalBytesSavings),
      averagePageImprovement,
      topImpactCategories
    };
  }

  /**
   * Generate audit summary information
   */
  private generateAuditSummary(data: ProcessedAuditData): AuditSummary {
    const metadata = data.auditMetadata;
    const auditedAt = new Date(metadata.completedAt).toLocaleString();
    const totalRuntime = this.formatDuration(metadata.elapsedMs);
    const pagesPerMinute = Math.round((data.pages.length / (metadata.elapsedMs / 60000)) * 10) / 10;

    const disclaimer = "Performance scores are generated in an automated testing environment and may be lower than manual Chrome DevTools results. Focus on relative improvements rather than absolute scores.";

    return {
      auditedAt,
      configPath: metadata.configPath,
      totalRuntime,
      pagesPerMinute,
      disclaimer
    };
  }

  /**
   * Format dashboard data as markdown
   */
  private formatDashboardMarkdown(data: DashboardData): string {
    const { performanceOverview, scoreDistribution, worstPerformingPages, potentialGains, auditSummary } = data;

    return `# 📊 Executive Performance Dashboard

> **Audit completed:** ${auditSummary.auditedAt}  
> **Runtime:** ${auditSummary.totalRuntime} (${auditSummary.pagesPerMinute} pages/min)

## 🎯 Performance Overview

| Metric | Value | Status |
|--------|-------|--------|
| **Total Pages Audited** | ${performanceOverview.totalPages} | ✅ Complete |
| **Average Performance Score** | ${performanceOverview.averagePerformanceScore}/100 | ${this.getScoreStatus(performanceOverview.averagePerformanceScore)} |
| **Pages Above 90** | ${performanceOverview.pagesAbove90} (${Math.round((performanceOverview.pagesAbove90 / performanceOverview.totalPages) * 100)}%) | ${performanceOverview.pagesAbove90 > performanceOverview.totalPages * 0.5 ? '🟢 Good' : '🟡 Needs Work'} |
| **Pages Below 50** | ${performanceOverview.pagesBelow50} (${Math.round((performanceOverview.pagesBelow50 / performanceOverview.totalPages) * 100)}%) | ${performanceOverview.pagesBelow50 === 0 ? '🟢 Excellent' : performanceOverview.pagesBelow50 < performanceOverview.totalPages * 0.2 ? '🟡 Monitor' : '🔴 Critical'} |
| **Critical Issues** | ${performanceOverview.criticalIssuesCount} | ${performanceOverview.criticalIssuesCount === 0 ? '🟢 None' : performanceOverview.criticalIssuesCount < 5 ? '🟡 Few' : '🔴 Many'} |

## 📈 Score Distribution

\`\`\`
Excellent (90-100): ${'█'.repeat(Math.round(scoreDistribution.excellent / performanceOverview.totalPages * 20))} ${scoreDistribution.excellent} pages
Good (75-89):       ${'█'.repeat(Math.round(scoreDistribution.good / performanceOverview.totalPages * 20))} ${scoreDistribution.good} pages
Needs Work (50-74): ${'█'.repeat(Math.round(scoreDistribution.needsWork / performanceOverview.totalPages * 20))} ${scoreDistribution.needsWork} pages
Poor (0-49):        ${'█'.repeat(Math.round(scoreDistribution.poor / performanceOverview.totalPages * 20))} ${scoreDistribution.poor} pages
\`\`\`

## 🚨 Pages Requiring Immediate Attention

${worstPerformingPages.length === 0 ? '✅ **All pages performing well!**' : worstPerformingPages.map((page, index) => `
### ${index + 1}. ${page.label}
- **Score:** ${page.performanceScore}/100 (${page.device})
- **Path:** \`${page.path}\`
- **Potential Savings:** ${this.formatTime(page.estimatedSavingsMs)}
- **Key Issues:** ${page.primaryIssues.length > 0 ? page.primaryIssues.join(', ') : 'No critical issues identified'}
`).join('')}

## 💰 Potential Performance Gains

### Total Impact
- **Time Savings:** ${this.formatTime(potentialGains.totalTimeSavingsMs)} across all pages
- **Data Savings:** ${this.formatBytes(potentialGains.totalBytesSavings)}
- **Average Per Page:** ${this.formatTime(potentialGains.averagePageImprovement)} improvement potential

### Top Impact Categories
${potentialGains.topImpactCategories.map((category, index) => `
${index + 1}. **${category.category}** ${this.getPriorityIcon(category.priority)}
   - Affects ${category.affectedPages} page${category.affectedPages !== 1 ? 's' : ''}
   - Potential savings: ${this.formatTime(category.estimatedSavingsMs)}
   - Priority: ${category.priority.toUpperCase()}
`).join('')}

## 📋 Next Steps

### Immediate Actions (This Week)
${worstPerformingPages.length > 0 ? `
- 🔴 **Critical:** Address the ${Math.min(3, worstPerformingPages.length)} worst-performing pages
- 🔍 **Review:** Check \`QUICK-FIXES.md\` for specific implementation steps
- 📊 **Monitor:** Set up performance budgets to prevent regressions
` : `
- ✅ **Maintain:** Current performance levels are good
- 📊 **Monitor:** Set up performance budgets to prevent regressions
- 🔍 **Optimize:** Review \`QUICK-FIXES.md\` for additional improvements
`}

### Medium-term Goals (This Month)
- 🎯 **Target:** Achieve ${Math.min(90, performanceOverview.averagePerformanceScore + 15)}/100 average performance score
- 🛠️ **Focus:** Address ${potentialGains.topImpactCategories[0]?.category || 'JavaScript'} optimization opportunities
- 📈 **Track:** Implement before/after comparison tracking

### Resources
- **Detailed Issues:** See \`triage.md\` for complete issue breakdown
- **AI Analysis:** Check \`AI-ANALYSIS.json\` for automated recommendations
- **Quick Wins:** Review \`QUICK-FIXES.md\` for immediate improvements

---

## ⚠️ Important Notes

**${auditSummary.disclaimer}**

**Configuration:** \`${auditSummary.configPath}\`

*Report generated by Signaler v1.0.12 - High-performance Lighthouse batch auditing*
`;
  }

  /**
   * Helper methods for formatting
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  private formatTime(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  private formatCategoryName(category: string): string {
    const categoryNames: Record<string, string> = {
      'javascript': 'JavaScript Optimization',
      'css': 'CSS Optimization',
      'images': 'Image Optimization',
      'caching': 'Caching Strategy',
      'network': 'Network Optimization'
    };
    return categoryNames[category] || category;
  }

  private calculateCategoryPriority(savingsMs: number, affectedPages: number): 'critical' | 'high' | 'medium' | 'low' {
    const impact = savingsMs * affectedPages;
    if (impact > 10000) return 'critical';
    if (impact > 5000) return 'high';
    if (impact > 1000) return 'medium';
    return 'low';
  }

  private getScoreStatus(score: number): string {
    if (score >= 90) return '🟢 Excellent';
    if (score >= 75) return '🟡 Good';
    if (score >= 50) return '🟠 Needs Work';
    return '🔴 Poor';
  }

  private getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    };
    return icons[priority] || '⚪';
  }
}