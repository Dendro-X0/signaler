/**
 * Enhanced Triage Generator - Generates improved triage.md with better prioritization
 * 
 * This module creates an enhanced triage report with improved issue aggregation,
 * framework-specific recommendations, and performance impact calculations.
 */

import type { ProcessedAuditData, Issue, PageAuditResult } from '../processors/raw-results-processor.js';

export interface AggregatedIssue {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly severity: Issue['severity'];
  readonly category: Issue['category'];
  readonly affectedPages: PageIssueDetail[];
  readonly totalImpact: {
    readonly timeMs: number;
    readonly bytes: number;
  };
  readonly averageImpact: {
    readonly timeMs: number;
    readonly bytes: number;
  };
  readonly frameworkRecommendations: FrameworkRecommendation[];
}

export interface PageIssueDetail {
  readonly pageLabel: string;
  readonly pagePath: string;
  readonly device: string;
  readonly performanceScore: number;
  readonly impactMs: number;
  readonly impactBytes: number;
}

export interface FrameworkRecommendation {
  readonly framework: 'nextjs' | 'react' | 'vue' | 'angular' | 'generic';
  readonly recommendation: string;
  readonly implementation: string;
  readonly priority: 'high' | 'medium' | 'low';
}

export interface PerformanceImpactCalculation {
  readonly currentAverageScore: number;
  readonly projectedImprovement: number;
  readonly estimatedNewScore: number;
  readonly confidenceLevel: 'high' | 'medium' | 'low';
}

/**
 * Generates enhanced triage.md report with better prioritization
 */
export class EnhancedTriageGenerator {
  /**
   * Generate the enhanced triage.md content
   */
  generate(data: ProcessedAuditData): string {
    const aggregatedIssues = this.aggregateIssues(data);
    const sortedIssues = this.prioritizeIssues(aggregatedIssues);
    
    const header = this.generateHeader(data);
    const executiveSummary = this.generateExecutiveSummary(data, sortedIssues);
    const prioritizationMatrix = this.generatePrioritizationMatrix(sortedIssues);
    const detailedIssues = this.generateDetailedIssues(sortedIssues);
    const frameworkGuidance = this.generateFrameworkGuidance(sortedIssues);
    const implementationRoadmap = this.generateImplementationRoadmap(sortedIssues);
    const footer = this.generateFooter(data);

    return [
      header,
      '',
      executiveSummary,
      '',
      prioritizationMatrix,
      '',
      detailedIssues,
      '',
      frameworkGuidance,
      '',
      implementationRoadmap,
      '',
      footer
    ].join('\n');
  }

  /**
   * Aggregate issues across multiple pages
   */
  private aggregateIssues(data: ProcessedAuditData): AggregatedIssue[] {
    const issueMap = new Map<string, {
      issue: Issue;
      pageDetails: PageIssueDetail[];
      totalImpact: { timeMs: number; bytes: number };
    }>();

    // Group issues by ID across all pages
    for (const page of data.pages) {
      for (const issue of page.issues) {
        const key = issue.id;
        const pageDetail: PageIssueDetail = {
          pageLabel: page.label,
          pagePath: page.path,
          device: page.device,
          performanceScore: page.scores.performance || 0,
          impactMs: issue.estimatedSavings.timeMs,
          impactBytes: issue.estimatedSavings.bytes
        };

        if (issueMap.has(key)) {
          const existing = issueMap.get(key)!;
          existing.pageDetails.push(pageDetail);
          existing.totalImpact.timeMs += issue.estimatedSavings.timeMs;
          existing.totalImpact.bytes += issue.estimatedSavings.bytes;
        } else {
          issueMap.set(key, {
            issue,
            pageDetails: [pageDetail],
            totalImpact: {
              timeMs: issue.estimatedSavings.timeMs,
              bytes: issue.estimatedSavings.bytes
            }
          });
        }
      }
    }

    // Convert to aggregated issues
    return Array.from(issueMap.values()).map(item => ({
      id: item.issue.id,
      title: item.issue.title,
      description: item.issue.description,
      severity: item.issue.severity,
      category: item.issue.category,
      affectedPages: item.pageDetails,
      totalImpact: item.totalImpact,
      averageImpact: {
        timeMs: Math.round(item.totalImpact.timeMs / item.pageDetails.length),
        bytes: Math.round(item.totalImpact.bytes / item.pageDetails.length)
      },
      frameworkRecommendations: this.generateFrameworkRecommendations(item.issue)
    }));
  }

  /**
   * Prioritize issues by impact and severity
   */
  private prioritizeIssues(issues: AggregatedIssue[]): AggregatedIssue[] {
    return issues.sort((a, b) => {
      // Primary sort: severity
      const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];
      if (severityDiff !== 0) return severityDiff;

      // Secondary sort: total time impact
      const timeDiff = b.totalImpact.timeMs - a.totalImpact.timeMs;
      if (timeDiff !== 0) return timeDiff;

      // Tertiary sort: number of affected pages
      return b.affectedPages.length - a.affectedPages.length;
    });
  }

  /**
   * Generate report header
   */
  private generateHeader(data: ProcessedAuditData): string {
    return [
      '# 📋 Enhanced Triage Report',
      '',
      '> **Performance Analysis & Prioritization Guide**',
      '> ',
      `> ${data.performanceMetrics.disclaimer}`,
      '> ',
      '> This report provides detailed issue aggregation, framework-specific recommendations,',
      '> and performance impact calculations to guide your optimization efforts.'
    ].join('\n');
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(data: ProcessedAuditData, issues: AggregatedIssue[]): string {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    const totalPotentialSavings = issues.reduce((sum, i) => sum + i.totalImpact.timeMs, 0);
    const avgScore = data.performanceMetrics.averageScores.performance || 0;

    return [
      '## 📊 Executive Summary',
      '',
      `### Performance Overview`,
      `- **${data.performanceMetrics.totalPages} pages audited** in ${Math.round(data.auditMetadata.elapsedMs / 1000 / 60)} minutes`,
      `- **${Math.round(avgScore)} average performance score** across all pages`,
      `- **${issues.length} unique issues** identified across multiple pages`,
      `- **${Math.round(totalPotentialSavings / 1000)}s total potential savings** if all issues resolved`,
      '',
      `### Issue Breakdown`,
      `- 🚨 **${criticalIssues.length} Critical Issues** - Immediate attention required`,
      `- ⚠️ **${highIssues.length} High Priority Issues** - Address within this sprint`,
      `- ⚡ **${issues.filter(i => i.severity === 'medium').length} Medium Issues** - Plan for next iteration`,
      `- ℹ️ **${issues.filter(i => i.severity === 'low').length} Low Priority Issues** - Technical debt cleanup`
    ].join('\n');
  }

  /**
   * Generate prioritization matrix
   */
  private generatePrioritizationMatrix(issues: AggregatedIssue[]): string {
    const top10Issues = issues.slice(0, 10);
    
    const matrixRows = top10Issues.map((issue, index) => {
      const impact = this.calculateImpactScore(issue);
      const effort = this.estimateEffort(issue);
      const priority = this.calculatePriorityScore(impact, effort);
      
      return `| ${index + 1} | ${this.truncateText(issue.title, 40)} | ${issue.severity.toUpperCase()} | ${issue.affectedPages.length} | ${Math.round(issue.totalImpact.timeMs / 1000)}s | ${impact} | ${effort} | ${priority} |`;
    });

    return [
      '## 🎯 Prioritization Matrix',
      '',
      '> **Impact vs Effort Analysis** - Focus on high-impact, low-effort wins first',
      '',
      '| Rank | Issue | Severity | Pages | Savings | Impact | Effort | Priority |',
      '|------|-------|----------|-------|---------|--------|--------|----------|',
      ...matrixRows,
      '',
      '**Legend:**',
      '- **Impact**: 🔥 High, 🔸 Medium, 🔹 Low',
      '- **Effort**: 🟢 Easy, 🟡 Medium, 🔴 Hard',
      '- **Priority**: ⭐⭐⭐ Must Do, ⭐⭐ Should Do, ⭐ Could Do'
    ].join('\n');
  }

  /**
   * Generate detailed issues section
   */
  private generateDetailedIssues(issues: AggregatedIssue[]): string {
    const sections = issues.slice(0, 15).map((issue, index) => 
      this.generateIssueDetail(issue, index + 1)
    );

    return [
      '## 🔍 Detailed Issue Analysis',
      '',
      ...sections
    ].join('\n');
  }

  /**
   * Generate individual issue detail
   */
  private generateIssueDetail(issue: AggregatedIssue, rank: number): string {
    const impactCalculation = this.calculatePerformanceImpact(issue);
    const severityEmoji = this.getSeverityEmoji(issue.severity);
    const categoryEmoji = this.getCategoryEmoji(issue.category);

    return [
      `### ${rank}. ${severityEmoji} ${issue.title} ${categoryEmoji}`,
      '',
      `**Category:** ${issue.category} | **Severity:** ${issue.severity} | **Pages Affected:** ${issue.affectedPages.length}`,
      '',
      `**Total Impact:** ${Math.round(issue.totalImpact.timeMs / 1000)}s potential savings, ${Math.round(issue.totalImpact.bytes / 1024)}KB reduction`,
      `**Average Impact:** ${Math.round(issue.averageImpact.timeMs)}ms per page, ${Math.round(issue.averageImpact.bytes / 1024)}KB per page`,
      '',
      issue.description,
      '',
      '**Affected Pages:**',
      ...issue.affectedPages.slice(0, 5).map(page => 
        `- ${page.pageLabel} (${page.pagePath}) - ${Math.round(page.impactMs)}ms, Score: ${page.performanceScore}`
      ),
      issue.affectedPages.length > 5 ? `- *...and ${issue.affectedPages.length - 5} more pages*` : '',
      '',
      '**Performance Impact Projection:**',
      `- Current average score: ${impactCalculation.currentAverageScore}`,
      `- Projected improvement: +${impactCalculation.projectedImprovement} points`,
      `- Estimated new score: ${impactCalculation.estimatedNewScore}`,
      `- Confidence level: ${impactCalculation.confidenceLevel}`,
      '',
      '**Framework-Specific Recommendations:**',
      ...this.formatFrameworkRecommendations(issue.frameworkRecommendations),
      ''
    ].join('\n');
  }

  /**
   * Generate framework guidance section
   */
  private generateFrameworkGuidance(issues: AggregatedIssue[]): string {
    const frameworkMap = new Map<string, FrameworkRecommendation[]>();
    
    // Group recommendations by framework
    for (const issue of issues) {
      for (const rec of issue.frameworkRecommendations) {
        if (!frameworkMap.has(rec.framework)) {
          frameworkMap.set(rec.framework, []);
        }
        frameworkMap.get(rec.framework)!.push(rec);
      }
    }

    const sections = Array.from(frameworkMap.entries()).map(([framework, recommendations]) => {
      const highPriority = recommendations.filter(r => r.priority === 'high');
      const mediumPriority = recommendations.filter(r => r.priority === 'medium');
      
      return [
        `### ${this.getFrameworkDisplayName(framework)}`,
        '',
        highPriority.length > 0 ? '**High Priority:**' : '',
        ...highPriority.map(r => `- ${r.recommendation}`),
        highPriority.length > 0 ? '' : '',
        mediumPriority.length > 0 ? '**Medium Priority:**' : '',
        ...mediumPriority.map(r => `- ${r.recommendation}`),
        ''
      ].filter(line => line !== '').join('\n');
    });

    return [
      '## 🛠️ Framework-Specific Guidance',
      '',
      ...sections
    ].join('\n');
  }

  /**
   * Generate implementation roadmap
   */
  private generateImplementationRoadmap(issues: AggregatedIssue[]): string {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    const mediumIssues = issues.filter(i => i.severity === 'medium');

    return [
      '## 🗺️ Implementation Roadmap',
      '',
      '### Phase 1: Critical Issues (Week 1)',
      '> **Goal:** Address performance blockers and critical user experience issues',
      '',
      ...criticalIssues.slice(0, 3).map(issue => 
        `- [ ] **${issue.title}** - ${issue.affectedPages.length} pages, ${Math.round(issue.totalImpact.timeMs / 1000)}s savings`
      ),
      '',
      '### Phase 2: High Impact Issues (Week 2-3)',
      '> **Goal:** Implement high-value optimizations with measurable performance gains',
      '',
      ...highIssues.slice(0, 5).map(issue => 
        `- [ ] **${issue.title}** - ${issue.affectedPages.length} pages, ${Math.round(issue.totalImpact.timeMs / 1000)}s savings`
      ),
      '',
      '### Phase 3: Medium Priority Issues (Week 4-6)',
      '> **Goal:** Address remaining performance opportunities and technical debt',
      '',
      ...mediumIssues.slice(0, 5).map(issue => 
        `- [ ] **${issue.title}** - ${issue.affectedPages.length} pages, ${Math.round(issue.totalImpact.timeMs / 1000)}s savings`
      ),
      '',
      '### Success Metrics',
      '- [ ] Average performance score improvement of 10+ points',
      '- [ ] Critical issues reduced to zero',
      '- [ ] Page load time improvement of 2+ seconds',
      '- [ ] User experience metrics (CLS, LCP, FID) in "Good" range'
    ].join('\n');
  }

  /**
   * Generate footer
   */
  private generateFooter(data: ProcessedAuditData): string {
    return [
      '---',
      '',
      '## 📈 Next Steps',
      '',
      '1. **Review Prioritization Matrix** - Focus on high-impact, low-effort wins',
      '2. **Assign Issues to Team Members** - Distribute work based on expertise',
      '3. **Set Performance Budgets** - Prevent future regressions',
      '4. **Schedule Regular Audits** - Monitor progress and catch new issues',
      '5. **Measure Impact** - Re-run audits after each phase to validate improvements',
      '',
      '## 📚 Additional Resources',
      '',
      '- [Web.dev Performance Guide](https://web.dev/performance/)',
      '- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)',
      '- [Core Web Vitals](https://web.dev/vitals/)',
      '',
      `*Enhanced triage report generated by Signaler • ${new Date().toISOString()} • ${data.performanceMetrics.totalPages} pages analyzed*`
    ].join('\n');
  }

  /**
   * Helper methods
   */
  private generateFrameworkRecommendations(issue: Issue): FrameworkRecommendation[] {
    const recommendations: FrameworkRecommendation[] = [];

    // Generate framework-specific recommendations based on issue type
    switch (issue.category) {
      case 'javascript':
        if (issue.id.includes('unused')) {
          recommendations.push({
            framework: 'nextjs',
            recommendation: 'Use Next.js dynamic imports for code splitting',
            implementation: 'Replace static imports with dynamic() for non-critical components',
            priority: 'high'
          });
          recommendations.push({
            framework: 'react',
            recommendation: 'Implement React.lazy() for component-level code splitting',
            implementation: 'Wrap components with React.lazy() and Suspense boundaries',
            priority: 'high'
          });
        }
        break;
      case 'images':
        recommendations.push({
          framework: 'nextjs',
          recommendation: 'Use Next.js Image component for automatic optimization',
          implementation: 'Replace <img> tags with <Image> component from next/image',
          priority: 'high'
        });
        break;
      case 'caching':
        recommendations.push({
          framework: 'nextjs',
          recommendation: 'Configure cache headers in next.config.js',
          implementation: 'Add headers() function to next.config.js for static assets',
          priority: 'medium'
        });
        break;
    }

    // Add generic recommendations if no framework-specific ones exist
    if (recommendations.length === 0) {
      recommendations.push({
        framework: 'generic',
        recommendation: `Optimize ${issue.category} performance`,
        implementation: 'Follow web performance best practices for this category',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  private calculateImpactScore(issue: AggregatedIssue): string {
    const avgTimeMs = issue.averageImpact.timeMs;
    const pageCount = issue.affectedPages.length;
    
    const score = (avgTimeMs / 1000) * Math.log(pageCount + 1);
    
    if (score >= 3) return '🔥';
    if (score >= 1.5) return '🔸';
    return '🔹';
  }

  private estimateEffort(issue: AggregatedIssue): string {
    // Estimate effort based on issue category and complexity
    const effortMap: Record<string, string> = {
      'caching': '🟢',
      'images': '🟡',
      'css': '🟡',
      'javascript': '🔴',
      'network': '🟡'
    };
    
    return effortMap[issue.category] || '🟡';
  }

  private calculatePriorityScore(impact: string, effort: string): string {
    if (impact === '🔥' && effort === '🟢') return '⭐⭐⭐';
    if (impact === '🔥' || (impact === '🔸' && effort === '🟢')) return '⭐⭐';
    return '⭐';
  }

  private calculatePerformanceImpact(issue: AggregatedIssue): PerformanceImpactCalculation {
    const avgCurrentScore = issue.affectedPages.reduce((sum, page) => sum + page.performanceScore, 0) / issue.affectedPages.length;
    const avgImpactMs = issue.averageImpact.timeMs;
    
    // Rough estimation: 100ms improvement ≈ 1-2 performance score points
    const projectedImprovement = Math.min(Math.round(avgImpactMs / 100), 15);
    const estimatedNewScore = Math.min(avgCurrentScore + projectedImprovement, 100);
    
    const confidenceLevel = issue.affectedPages.length >= 5 ? 'high' : 
                           issue.affectedPages.length >= 2 ? 'medium' : 'low';

    return {
      currentAverageScore: Math.round(avgCurrentScore),
      projectedImprovement,
      estimatedNewScore: Math.round(estimatedNewScore),
      confidenceLevel
    };
  }

  private formatFrameworkRecommendations(recommendations: FrameworkRecommendation[]): string[] {
    return recommendations.map(rec => 
      `- **${this.getFrameworkDisplayName(rec.framework)}**: ${rec.recommendation}`
    );
  }

  private getSeverityEmoji(severity: string): string {
    const emojiMap: Record<string, string> = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };
    return emojiMap[severity] || '⚡';
  }

  private getCategoryEmoji(category: string): string {
    const emojiMap: Record<string, string> = {
      javascript: '📜',
      css: '🎨',
      images: '🖼️',
      caching: '💾',
      network: '🌐'
    };
    return emojiMap[category] || '🔧';
  }

  private getFrameworkDisplayName(framework: string): string {
    const nameMap: Record<string, string> = {
      nextjs: 'Next.js',
      react: 'React',
      vue: 'Vue.js',
      angular: 'Angular',
      generic: 'General'
    };
    return nameMap[framework] || framework;
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }
}