/**
 * Quick Fixes Generator - Generates QUICK-FIXES.md with top 5 highest-impact issues
 * 
 * This module creates a developer-optimized report focusing on the most critical
 * performance issues with specific file names, byte counts, and actionable fixes.
 */

import type { ProcessedAuditData, Issue } from '../processors/raw-results-processor.js';

/**
 * Issue prioritized by aggregate impact across all pages.
 */
export interface PrioritizedIssue {
  readonly issue: Issue;
  readonly affectedPagesCount: number;
  readonly totalImpactMs: number;
  readonly totalImpactBytes: number;
  readonly affectedPages: string[];
  readonly priority: number;
}

/**
 * Actionable recommendation describing how to remediate an issue.
 */
export interface ActionableRecommendation {
  readonly action: string;
  readonly implementation: {
    readonly difficulty: 'easy' | 'medium' | 'hard';
    readonly estimatedTime: string;
    readonly codeExample?: string;
    readonly documentation: string[];
  };
  readonly framework?: 'nextjs' | 'react' | 'vue' | 'angular';
}

/**
 * Generates QUICK-FIXES.md report with top 5 highest-impact issues
 */
export class QuickFixesGenerator {
  /**
   * Generate the QUICK-FIXES.md content
   */
  generate(data: ProcessedAuditData): string {
    const prioritizedIssues = this.prioritizeIssues(data);
    const top5Issues = prioritizedIssues.slice(0, 5);
    
    const disclaimer = this.generateDisclaimer(data);
    const summary = this.generateSummary(data, top5Issues);
    const issuesSection = this.generateIssuesSection(top5Issues);
    const footer = this.generateFooter(data);

    return [
      '# 🚀 Quick Fixes - Top Performance Issues',
      '',
      disclaimer,
      '',
      summary,
      '',
      issuesSection,
      '',
      footer
    ].join('\n');
  }

  /**
   * Prioritize issues across all pages by impact
   */
  private prioritizeIssues(data: ProcessedAuditData): PrioritizedIssue[] {
    const issueMap = new Map<string, {
      issue: Issue;
      pages: string[];
      totalMs: number;
      totalBytes: number;
    }>();

    // Aggregate issues across all pages
    for (const page of data.pages) {
      for (const issue of page.issues) {
        const key = issue.id;
        if (issueMap.has(key)) {
          const existing = issueMap.get(key)!;
          existing.pages.push(page.label);
          existing.totalMs += issue.estimatedSavings.timeMs;
          existing.totalBytes += issue.estimatedSavings.bytes;
        } else {
          issueMap.set(key, {
            issue,
            pages: [page.label],
            totalMs: issue.estimatedSavings.timeMs,
            totalBytes: issue.estimatedSavings.bytes
          });
        }
      }
    }

    // Convert to prioritized issues and calculate priority scores
    const prioritizedIssues: PrioritizedIssue[] = Array.from(issueMap.values()).map(item => {
      const priority = this.calculatePriority(
        item.totalMs,
        item.totalBytes,
        item.pages.length,
        item.issue.severity
      );

      return {
        issue: item.issue,
        affectedPagesCount: item.pages.length,
        totalImpactMs: item.totalMs,
        totalImpactBytes: item.totalBytes,
        affectedPages: item.pages,
        priority
      };
    });

    // Sort by priority (highest first)
    return prioritizedIssues.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate priority score for an issue
   */
  private calculatePriority(
    totalMs: number,
    totalBytes: number,
    pageCount: number,
    severity: Issue['severity']
  ): number {
    const severityMultiplier = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    }[severity];

    // Normalize time savings (weight: 40%)
    const timeScore = Math.min(totalMs / 1000, 10) * 0.4;
    
    // Normalize byte savings (weight: 30%)
    const byteScore = Math.min(totalBytes / 100000, 10) * 0.3;
    
    // Page count impact (weight: 20%)
    const pageScore = Math.min(pageCount, 10) * 0.2;
    
    // Severity multiplier (weight: 10%)
    const severityScore = severityMultiplier * 0.1;

    return (timeScore + byteScore + pageScore + severityScore) * 10;
  }

  /**
   * Generate performance disclaimer
   */
  private generateDisclaimer(data: ProcessedAuditData): string {
    return [
      '> **⚠️ Performance Score Context**',
      '> ',
      `> ${data.performanceMetrics.disclaimer}`,
      '> ',
      '> **Focus on relative improvements** rather than absolute scores when implementing these fixes.'
    ].join('\n');
  }

  /**
   * Generate summary section
   */
  private generateSummary(data: ProcessedAuditData, top5Issues: PrioritizedIssue[]): string {
    const totalPotentialSavings = top5Issues.reduce((sum, item) => sum + item.totalImpactMs, 0);
    const totalAffectedPages = new Set(top5Issues.flatMap(item => item.affectedPages)).size;
    const avgTimePerFix = top5Issues.length > 0 ? 
      top5Issues.reduce((sum, item) => sum + this.getEstimatedFixTime(item.issue), 0) / top5Issues.length : 0;

    return [
      '## 📊 Impact Summary',
      '',
      `- **${top5Issues.length} critical issues** identified across ${totalAffectedPages} pages`,
      `- **${Math.round(totalPotentialSavings / 1000)}s potential time savings** if all fixes are implemented`,
      `- **~${Math.round(avgTimePerFix)} hours average** implementation time per fix`,
      `- **${data.performanceMetrics.totalPages} total pages** audited in ${Math.round(data.auditMetadata.elapsedMs / 1000 / 60)} minutes`
    ].join('\n');
  }

  /**
   * Generate issues section with detailed fixes
   */
  private generateIssuesSection(issues: PrioritizedIssue[]): string {
    if (issues.length === 0) {
      return [
        '## 🎉 No Critical Issues Found',
        '',
        'Great job! No high-impact performance issues were detected.',
        'Consider running additional audits or checking for smaller optimizations.'
      ].join('\n');
    }

    const sections = issues.map((item, index) => this.generateIssueSection(item, index + 1));
    return [
      '## 🔧 Top Issues & Fixes',
      '',
      ...sections
    ].join('\n');
  }

  /**
   * Generate individual issue section
   */
  private generateIssueSection(item: PrioritizedIssue, rank: number): string {
    const { issue } = item;
    const recommendations = this.generateActionableRecommendations(issue);
    const difficultyEmoji = this.getDifficultyEmoji(recommendations[0]?.implementation.difficulty || 'medium');
    const severityEmoji = this.getSeverityEmoji(issue.severity);

    return [
      `### ${rank}. ${severityEmoji} ${issue.title} ${difficultyEmoji}`,
      '',
      `**Impact:** ${Math.round(item.totalImpactMs / 1000)}s potential savings • ${item.affectedPagesCount} pages affected`,
      '',
      `**Affected Pages:** ${item.affectedPages.slice(0, 3).join(', ')}${item.affectedPages.length > 3 ? ` (+${item.affectedPages.length - 3} more)` : ''}`,
      '',
      issue.description,
      '',
      ...this.generateRecommendationsMarkdown(recommendations),
      ''
    ].join('\n');
  }

  /**
   * Generate actionable recommendations for an issue
   */
  private generateActionableRecommendations(issue: Issue): ActionableRecommendation[] {
    const recommendations: Record<string, ActionableRecommendation> = {
      'unused-javascript': {
        action: 'Remove unused JavaScript code or implement code splitting',
        implementation: {
          difficulty: 'medium',
          estimatedTime: '2-4 hours',
          codeExample: `// Use dynamic imports for code splitting
const LazyComponent = lazy(() => import('./LazyComponent'));

// Or use Next.js dynamic imports
const DynamicComponent = dynamic(() => import('./DynamicComponent'), {
  loading: () => <p>Loading...</p>
});`,
          documentation: [
            'https://web.dev/remove-unused-code/',
            'https://nextjs.org/docs/advanced-features/dynamic-import'
          ]
        },
        framework: 'nextjs'
      },
      'unused-css-rules': {
        action: 'Remove unused CSS rules and optimize stylesheets',
        implementation: {
          difficulty: 'easy',
          estimatedTime: '1-2 hours',
          codeExample: `// Use PurgeCSS or similar tools
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  css: ['./src/**/*.css'],
  // Remove unused CSS automatically
}`,
          documentation: [
            'https://web.dev/unused-css-rules/',
            'https://purgecss.com/'
          ]
        }
      },
      'render-blocking-resources': {
        action: 'Optimize render-blocking resources',
        implementation: {
          difficulty: 'medium',
          estimatedTime: '2-3 hours',
          codeExample: `// Preload critical resources
<link rel="preload" href="/critical.css" as="style">
<link rel="preload" href="/critical.js" as="script">

// Use async/defer for non-critical scripts
<script src="/non-critical.js" defer></script>`,
          documentation: [
            'https://web.dev/render-blocking-resources/',
            'https://web.dev/preload-critical-assets/'
          ]
        }
      },
      'modern-image-formats': {
        action: 'Convert images to modern formats (WebP, AVIF)',
        implementation: {
          difficulty: 'easy',
          estimatedTime: '1-2 hours',
          codeExample: `// Next.js Image component with automatic optimization
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={500}
  height={300}
  priority // For above-the-fold images
/>`,
          documentation: [
            'https://web.dev/serve-images-webp/',
            'https://nextjs.org/docs/api-reference/next/image'
          ]
        },
        framework: 'nextjs'
      },
      'uses-long-cache-ttl': {
        action: 'Implement proper caching headers',
        implementation: {
          difficulty: 'medium',
          estimatedTime: '1-3 hours',
          codeExample: `// Next.js next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  }
};`,
          documentation: [
            'https://web.dev/uses-long-cache-ttl/',
            'https://nextjs.org/docs/api-reference/next.config.js/headers'
          ]
        },
        framework: 'nextjs'
      }
    };

    const recommendation = recommendations[issue.id];
    return recommendation ? [recommendation] : [{
      action: `Optimize ${issue.category} performance`,
      implementation: {
        difficulty: 'medium',
        estimatedTime: '2-4 hours',
        documentation: ['https://web.dev/performance/']
      }
    }];
  }

  /**
   * Generate markdown for recommendations
   */
  private generateRecommendationsMarkdown(recommendations: ActionableRecommendation[]): string[] {
    if (recommendations.length === 0) return [];

    const rec = recommendations[0];
    const lines = [
      `**🔧 Fix:** ${rec.action}`,
      '',
      `**⏱️ Estimated Time:** ${rec.implementation.estimatedTime} (${rec.implementation.difficulty} difficulty)`,
      ''
    ];

    if (rec.implementation.codeExample) {
      lines.push(
        '**💻 Code Example:**',
        '```javascript',
        rec.implementation.codeExample,
        '```',
        ''
      );
    }

    if (rec.implementation.documentation.length > 0) {
      lines.push(
        '**📚 Documentation:**',
        ...rec.implementation.documentation.map(link => `- [${this.getLinkTitle(link)}](${link})`),
        ''
      );
    }

    return lines;
  }

  /**
   * Generate footer with additional guidance
   */
  private generateFooter(data: ProcessedAuditData): string {
    return [
      '---',
      '',
      '## 🎯 Implementation Strategy',
      '',
      '1. **Start with Critical Issues** - Focus on issues affecting multiple pages first',
      '2. **Measure Impact** - Re-run audits after each fix to validate improvements',
      '3. **Consider Framework** - Use framework-specific optimizations when available',
      '4. **Test Thoroughly** - Ensure fixes don\'t break functionality',
      '',
      '## 📈 Next Steps',
      '',
      '- Review the full `triage.md` report for additional optimizations',
      '- Check `DASHBOARD.md` for executive summary and progress tracking',
      '- Consider implementing performance budgets to prevent regressions',
      '',
      `*Report generated by Signaler • ${new Date().toISOString()} • ${data.performanceMetrics.totalPages} pages audited*`
    ].join('\n');
  }

  /**
   * Helper methods
   */
  private getEstimatedFixTime(issue: Issue): number {
    const timeMap: Record<string, number> = {
      'unused-javascript': 3,
      'unused-css-rules': 1.5,
      'render-blocking-resources': 2.5,
      'modern-image-formats': 1.5,
      'uses-long-cache-ttl': 2
    };
    return timeMap[issue.id] || 2;
  }

  private getDifficultyEmoji(difficulty: string): string {
    const emojiMap: Record<string, string> = {
      easy: '🟢',
      medium: '🟡',
      hard: '🔴'
    };
    return emojiMap[difficulty] || '🟡';
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

  private getLinkTitle(url: string): string {
    if (url.includes('web.dev')) return 'Web.dev Guide';
    if (url.includes('nextjs.org')) return 'Next.js Docs';
    if (url.includes('purgecss.com')) return 'PurgeCSS';
    return 'Documentation';
  }
}