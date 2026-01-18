/**
 * AI Analysis Generator - Token-efficient structured data for AI processing
 * 
 * This generator creates optimized JSON reports specifically designed for AI analysis,
 * focusing on token efficiency while maintaining comprehensive issue data.
 */

import type { ProcessedAuditData, Issue, GlobalIssue, ReportTemplate } from './report-generator-engine.js';

export interface AIAnalysisReport {
  summary: {
    totalPages: number;
    averagePerformanceScore: number;
    criticalIssuesCount: number;
    estimatedTotalSavings: number;
    auditDuration: string;
    disclaimer: string;
  };
  patterns: IssuePattern[];
  prioritizedFixes: PrioritizedFix[];
  globalRecommendations: GlobalRecommendation[];
  tokenOptimized: boolean;
  version: string;
}

export interface IssuePattern {
  type: string;
  affectedPages: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  estimatedSavings: {
    timeMs: number;
    bytes: number;
  };
  fixComplexity: 'easy' | 'medium' | 'hard';
  category: 'javascript' | 'css' | 'images' | 'caching' | 'network';
  description: string;
  impact: number; // 0-100 score for prioritization
}

export interface PrioritizedFix {
  rank: number;
  issueType: string;
  affectedPagesCount: number;
  impact: {
    performanceGain: number;
    implementationEffort: number;
    priority: number;
  };
  implementation: {
    steps: string[];
    codeExamples: CodeExample[];
    testingGuidance: string;
    estimatedTime: string;
  };
  framework?: 'nextjs' | 'react' | 'vue' | 'angular';
}

export interface CodeExample {
  language: string;
  code: string;
  description: string;
  framework?: string;
}

export interface GlobalRecommendation {
  category: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'medium' | 'hard';
  applicableFrameworks: string[];
}

/**
 * AI Analysis Template - Generates token-efficient AI-optimized reports
 */
export class AIAnalysisTemplate implements ReportTemplate {
  name = 'ai-analysis';
  format = 'json' as const;

  async generate(data: ProcessedAuditData): Promise<string> {
    const report = this.createAIAnalysisReport(data);
    
    // Compress data for large audits
    if (data.pages.length > 50) {
      return this.compressReport(report);
    }
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Create the main AI analysis report structure
   */
  private createAIAnalysisReport(data: ProcessedAuditData): AIAnalysisReport {
    const patterns = this.analyzeIssuePatterns(data);
    const prioritizedFixes = this.createPrioritizedFixes(patterns, data);
    const globalRecommendations = this.generateGlobalRecommendations(data);

    return {
      summary: {
        totalPages: data.performanceMetrics.totalPages,
        averagePerformanceScore: data.performanceMetrics.averagePerformanceScore,
        criticalIssuesCount: data.performanceMetrics.criticalIssuesCount,
        estimatedTotalSavings: data.performanceMetrics.estimatedTotalSavings,
        auditDuration: this.formatDuration(data.auditMetadata.elapsedMs),
        disclaimer: "Scores may be lower than DevTools due to automated testing environment. Focus on relative improvements."
      },
      patterns,
      prioritizedFixes,
      globalRecommendations,
      tokenOptimized: true,
      version: '1.0.0'
    };
  }

  /**
   * Analyze issue patterns across pages for systemic problems
   */
  private analyzeIssuePatterns(data: ProcessedAuditData): IssuePattern[] {
    const issueMap = new Map<string, {
      pages: string[];
      issues: Issue[];
      totalSavings: { timeMs: number; bytes: number };
    }>();

    // Aggregate issues by type across all pages
    for (const page of data.pages) {
      for (const issue of page.issues) {
        if (!issueMap.has(issue.id)) {
          issueMap.set(issue.id, {
            pages: [],
            issues: [],
            totalSavings: { timeMs: 0, bytes: 0 }
          });
        }

        const entry = issueMap.get(issue.id)!;
        entry.pages.push(page.path);
        entry.issues.push(issue);
        entry.totalSavings.timeMs += issue.estimatedSavings.timeMs;
        entry.totalSavings.bytes += issue.estimatedSavings.bytes;
      }
    }

    // Convert to patterns and calculate impact scores
    const patterns: IssuePattern[] = [];
    
    for (const [issueId, entry] of issueMap) {
      const firstIssue = entry.issues[0];
      const impact = this.calculateImpactScore(entry.totalSavings, entry.pages.length, firstIssue.severity);
      
      patterns.push({
        type: issueId,
        affectedPages: [...new Set(entry.pages)], // Remove duplicates
        severity: this.aggregateSeverity(entry.issues.map(i => i.severity)),
        estimatedSavings: entry.totalSavings,
        fixComplexity: this.determineComplexity(issueId, entry.pages.length),
        category: firstIssue.category,
        description: this.createPatternDescription(issueId, entry.pages.length),
        impact
      });
    }

    // Sort by impact score (highest first)
    return patterns.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Create prioritized fixes based on patterns
   */
  private createPrioritizedFixes(patterns: IssuePattern[], data: ProcessedAuditData): PrioritizedFix[] {
    const fixes: PrioritizedFix[] = [];
    
    // Take top 10 patterns for prioritized fixes
    const topPatterns = patterns.slice(0, 10);
    
    for (let i = 0; i < topPatterns.length; i++) {
      const pattern = topPatterns[i];
      const fix = this.createFixFromPattern(pattern, i + 1);
      fixes.push(fix);
    }

    return fixes;
  }

  /**
   * Create a prioritized fix from an issue pattern
   */
  private createFixFromPattern(pattern: IssuePattern, rank: number): PrioritizedFix {
    const implementation = this.getImplementationGuidance(pattern.type);
    const framework = this.detectFramework(pattern.type);
    
    return {
      rank,
      issueType: pattern.type,
      affectedPagesCount: pattern.affectedPages.length,
      impact: {
        performanceGain: Math.round(pattern.estimatedSavings.timeMs / 100), // Convert to score
        implementationEffort: this.complexityToEffort(pattern.fixComplexity),
        priority: pattern.impact
      },
      implementation,
      framework
    };
  }

  /**
   * Get implementation guidance for specific issue types
   */
  private getImplementationGuidance(issueType: string): {
    steps: string[];
    codeExamples: CodeExample[];
    testingGuidance: string;
    estimatedTime: string;
  } {
    const guidance: Record<string, any> = {
      'unused-javascript': {
        steps: [
          'Identify unused JavaScript bundles',
          'Implement dynamic imports for non-critical code',
          'Use code splitting at route level',
          'Remove dead code and unused dependencies'
        ],
        codeExamples: [
          {
            language: 'javascript',
            code: 'const LazyComponent = lazy(() => import("./LazyComponent"));',
            description: 'React lazy loading',
            framework: 'react'
          },
          {
            language: 'javascript',
            code: 'import("./module").then(module => module.default());',
            description: 'Dynamic import pattern'
          }
        ],
        testingGuidance: 'Verify bundle size reduction and runtime functionality',
        estimatedTime: '2-4 hours'
      },
      'unused-css-rules': {
        steps: [
          'Audit CSS usage with tools like PurgeCSS',
          'Remove unused CSS rules and selectors',
          'Implement CSS-in-JS for component-scoped styles',
          'Use critical CSS extraction'
        ],
        codeExamples: [
          {
            language: 'css',
            code: '@media (max-width: 768px) { .unused-class { display: none; } }',
            description: 'Example of potentially unused CSS'
          }
        ],
        testingGuidance: 'Test visual regression and responsive design',
        estimatedTime: '1-3 hours'
      },
      'render-blocking-resources': {
        steps: [
          'Identify render-blocking CSS and JavaScript',
          'Inline critical CSS',
          'Defer non-critical JavaScript',
          'Use resource hints (preload, prefetch)'
        ],
        codeExamples: [
          {
            language: 'html',
            code: '<link rel="preload" href="critical.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">',
            description: 'Preload critical CSS'
          }
        ],
        testingGuidance: 'Measure First Contentful Paint improvement',
        estimatedTime: '3-6 hours'
      }
    };

    return guidance[issueType] || {
      steps: ['Analyze the specific issue', 'Implement appropriate fix', 'Test thoroughly'],
      codeExamples: [],
      testingGuidance: 'Verify performance improvement',
      estimatedTime: '2-4 hours'
    };
  }

  /**
   * Generate global recommendations based on overall audit data
   */
  private generateGlobalRecommendations(data: ProcessedAuditData): GlobalRecommendation[] {
    const recommendations: GlobalRecommendation[] = [];
    
    // Analyze overall performance patterns
    const avgScore = data.performanceMetrics.averagePerformanceScore;
    
    if (avgScore < 50) {
      recommendations.push({
        category: 'Critical Performance',
        recommendation: 'Implement comprehensive performance optimization strategy focusing on JavaScript bundle reduction and image optimization',
        impact: 'high',
        effort: 'hard',
        applicableFrameworks: ['nextjs', 'react', 'vue', 'angular']
      });
    }
    
    if (avgScore < 70) {
      recommendations.push({
        category: 'Performance Optimization',
        recommendation: 'Focus on code splitting, lazy loading, and resource optimization',
        impact: 'medium',
        effort: 'medium',
        applicableFrameworks: ['nextjs', 'react', 'vue']
      });
    }

    // Check for common patterns
    const hasJSIssues = data.pages.some(page => 
      page.issues.some(issue => issue.category === 'javascript')
    );
    
    if (hasJSIssues) {
      recommendations.push({
        category: 'JavaScript Optimization',
        recommendation: 'Implement tree shaking, code splitting, and remove unused dependencies',
        impact: 'high',
        effort: 'medium',
        applicableFrameworks: ['nextjs', 'react', 'vue', 'angular']
      });
    }

    const hasImageIssues = data.pages.some(page =>
      page.issues.some(issue => issue.category === 'images')
    );

    if (hasImageIssues) {
      recommendations.push({
        category: 'Image Optimization',
        recommendation: 'Implement next-gen image formats, responsive images, and lazy loading',
        impact: 'medium',
        effort: 'easy',
        applicableFrameworks: ['nextjs', 'react', 'vue', 'angular']
      });
    }

    return recommendations;
  }

  /**
   * Compress report for large audits to reduce token usage
   */
  private compressReport(report: AIAnalysisReport): string {
    // Create a compressed version with abbreviated keys and reduced data
    const compressed = {
      s: { // summary
        tp: report.summary.totalPages,
        aps: report.summary.averagePerformanceScore,
        cic: report.summary.criticalIssuesCount,
        ets: report.summary.estimatedTotalSavings,
        d: report.summary.disclaimer
      },
      p: report.patterns.slice(0, 15).map(pattern => ({ // patterns (top 15)
        t: pattern.type,
        apc: pattern.affectedPages.length,
        s: pattern.severity,
        es: pattern.estimatedSavings,
        fc: pattern.fixComplexity,
        c: pattern.category,
        i: pattern.impact
      })),
      pf: report.prioritizedFixes.slice(0, 8).map(fix => ({ // prioritized fixes (top 8)
        r: fix.rank,
        it: fix.issueType,
        apc: fix.affectedPagesCount,
        i: fix.impact,
        et: fix.implementation.estimatedTime
      })),
      gr: report.globalRecommendations.map(rec => ({ // global recommendations
        c: rec.category,
        r: rec.recommendation,
        i: rec.impact,
        e: rec.effort
      })),
      to: true, // tokenOptimized
      v: report.version
    };

    return JSON.stringify(compressed);
  }

  /**
   * Helper methods
   */
  private calculateImpactScore(savings: { timeMs: number; bytes: number }, pageCount: number, severity: string): number {
    const severityMultiplier = { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 1;
    const timeScore = Math.min(savings.timeMs / 100, 50); // Cap at 50
    const bytesScore = Math.min(savings.bytes / 10000, 30); // Cap at 30
    const pageMultiplier = Math.min(pageCount / 5, 4); // Cap at 4x
    
    return Math.round((timeScore + bytesScore) * severityMultiplier * pageMultiplier);
  }

  private aggregateSeverity(severities: string[]): 'critical' | 'high' | 'medium' | 'low' {
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  private determineComplexity(issueId: string, pageCount: number): 'easy' | 'medium' | 'hard' {
    const complexIssues = ['render-blocking-resources', 'unused-javascript', 'third-party-summary'];
    const easyIssues = ['unused-css-rules', 'unminified-css', 'unminified-javascript'];
    
    if (complexIssues.includes(issueId) || pageCount > 20) return 'hard';
    if (easyIssues.includes(issueId) && pageCount < 5) return 'easy';
    return 'medium';
  }

  private createPatternDescription(issueId: string, pageCount: number): string {
    const descriptions: Record<string, string> = {
      'unused-javascript': `Unused JavaScript detected across ${pageCount} pages. Consider code splitting and dynamic imports.`,
      'unused-css-rules': `Unused CSS rules found on ${pageCount} pages. Implement CSS purging or component-scoped styles.`,
      'render-blocking-resources': `Render-blocking resources slowing ${pageCount} pages. Optimize critical resource loading.`,
      'unminified-css': `Unminified CSS on ${pageCount} pages. Enable CSS minification in build process.`,
      'unminified-javascript': `Unminified JavaScript on ${pageCount} pages. Enable JS minification in build process.`
    };
    
    return descriptions[issueId] || `Performance issue "${issueId}" affects ${pageCount} pages.`;
  }

  private complexityToEffort(complexity: string): number {
    return { easy: 1, medium: 2, hard: 3 }[complexity] || 2;
  }

  private detectFramework(issueType: string): 'nextjs' | 'react' | 'vue' | 'angular' | undefined {
    // Simple heuristic - could be enhanced with actual detection
    const jsIssues = ['unused-javascript', 'render-blocking-resources'];
    if (jsIssues.includes(issueType)) {
      return 'nextjs'; // Default to Next.js for JS optimization
    }
    return undefined;
  }

  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}