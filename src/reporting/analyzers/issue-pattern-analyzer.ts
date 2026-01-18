/**
 * Issue Pattern Analyzer - Identifies systemic issues and patterns across multiple pages
 * 
 * This module analyzes processed audit data to identify patterns, code-splitting
 * opportunities, and systemic issues that affect multiple pages.
 */

import type { ProcessedAuditData, PageAuditResult, Issue } from '../processors/raw-results-processor.js';

export interface IssuePattern {
  readonly type: 'unused-javascript' | 'cache-control' | 'image-optimization' | 'code-splitting' | 'css-optimization';
  readonly affectedPages: string[];
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly estimatedSavings: {
    readonly timeMs: number;
    readonly bytes: number;
  };
  readonly fixComplexity: 'easy' | 'medium' | 'hard';
  readonly recommendations: ActionableRecommendation[];
}

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

export interface CategorizedIssues {
  readonly javascript: Issue[];
  readonly css: Issue[];
  readonly images: Issue[];
  readonly caching: Issue[];
  readonly network: Issue[];
}

export interface ImpactAnalysis {
  readonly totalEstimatedSavingsMs: number;
  readonly totalEstimatedSavingsBytes: number;
  readonly criticalIssuesCount: number;
  readonly highImpactPatternsCount: number;
  readonly codeSplittingOpportunities: number;
}

/**
 * Analyzes processed audit data to identify systemic issues and patterns
 */
export class IssuePatternAnalyzer {
  /**
   * Analyze patterns across all pages to identify systemic issues
   */
  analyzePatterns(data: ProcessedAuditData): IssuePattern[] {
    const patterns: IssuePattern[] = [];

    // Analyze JavaScript patterns
    patterns.push(...this.analyzeJavaScriptPatterns(data.pages));
    
    // Analyze caching patterns
    patterns.push(...this.analyzeCachingPatterns(data.pages));
    
    // Analyze image optimization patterns
    patterns.push(...this.analyzeImagePatterns(data.pages));
    
    // Analyze CSS patterns
    patterns.push(...this.analyzeCSSPatterns(data.pages));

    return patterns.sort((a, b) => this.calculatePatternPriority(b) - this.calculatePatternPriority(a));
  }

  /**
   * Categorize issues by type for easier processing
   */
  categorizeIssues(issues: Issue[]): CategorizedIssues {
    const categorized: CategorizedIssues = {
      javascript: [],
      css: [],
      images: [],
      caching: [],
      network: [],
    };

    for (const issue of issues) {
      categorized[issue.category].push(issue);
    }

    return categorized;
  }

  /**
   * Calculate overall impact of identified patterns
   */
  calculateImpact(patterns: IssuePattern[]): ImpactAnalysis {
    let totalEstimatedSavingsMs = 0;
    let totalEstimatedSavingsBytes = 0;
    let criticalIssuesCount = 0;
    let highImpactPatternsCount = 0;
    let codeSplittingOpportunities = 0;

    for (const pattern of patterns) {
      totalEstimatedSavingsMs += pattern.estimatedSavings.timeMs;
      totalEstimatedSavingsBytes += pattern.estimatedSavings.bytes;
      
      if (pattern.severity === 'critical') {
        criticalIssuesCount++;
      }
      
      if (pattern.severity === 'critical' || pattern.severity === 'high') {
        highImpactPatternsCount++;
      }
      
      if (pattern.type === 'code-splitting' || pattern.type === 'unused-javascript') {
        codeSplittingOpportunities++;
      }
    }

    return {
      totalEstimatedSavingsMs,
      totalEstimatedSavingsBytes,
      criticalIssuesCount,
      highImpactPatternsCount,
      codeSplittingOpportunities,
    };
  }

  private analyzeJavaScriptPatterns(pages: PageAuditResult[]): IssuePattern[] {
    const patterns: IssuePattern[] = [];
    const jsIssueMap = new Map<string, { pages: string[], totalSavings: { timeMs: number, bytes: number } }>();

    // Group JavaScript issues by resource/pattern
    for (const page of pages) {
      const jsIssues = page.issues.filter(issue => issue.category === 'javascript');
      
      for (const issue of jsIssues) {
        const key = this.normalizeJavaScriptIssueKey(issue);
        if (jsIssueMap.has(key)) {
          const existing = jsIssueMap.get(key)!;
          existing.pages.push(page.label);
          existing.totalSavings.timeMs += issue.estimatedSavings.timeMs;
          existing.totalSavings.bytes += issue.estimatedSavings.bytes;
        } else {
          jsIssueMap.set(key, {
            pages: [page.label],
            totalSavings: { ...issue.estimatedSavings }
          });
        }
      }
    }

    // Convert to patterns for issues affecting multiple pages
    for (const [issueKey, data] of jsIssueMap.entries()) {
      if (data.pages.length > 1) {
        const patternType = this.determineJavaScriptPatternType(issueKey);
        const severity = this.calculateSeverityFromSavings(data.totalSavings.timeMs, data.pages.length);
        
        patterns.push({
          type: patternType,
          affectedPages: [...new Set(data.pages)], // Remove duplicates
          severity,
          estimatedSavings: data.totalSavings,
          fixComplexity: this.determineJavaScriptFixComplexity(patternType),
          recommendations: this.generateJavaScriptRecommendations(patternType, issueKey),
        });
      }
    }

    return patterns;
  }

  private analyzeCachingPatterns(pages: PageAuditResult[]): IssuePattern[] {
    const patterns: IssuePattern[] = [];
    const cachingIssues = new Map<string, string[]>();

    for (const page of pages) {
      const cacheIssues = page.issues.filter(issue => issue.category === 'caching');
      
      for (const issue of cacheIssues) {
        const key = issue.id;
        if (cachingIssues.has(key)) {
          cachingIssues.get(key)!.push(page.label);
        } else {
          cachingIssues.set(key, [page.label]);
        }
      }
    }

    // Global caching issues affecting all or most pages
    for (const [issueId, affectedPages] of cachingIssues.entries()) {
      if (affectedPages.length >= Math.ceil(pages.length * 0.5)) { // Affects 50%+ of pages
        patterns.push({
          type: 'cache-control',
          affectedPages: [...new Set(affectedPages)],
          severity: affectedPages.length === pages.length ? 'critical' : 'high',
          estimatedSavings: this.estimateCachingSavings(affectedPages.length),
          fixComplexity: 'easy',
          recommendations: this.generateCachingRecommendations(issueId),
        });
      }
    }

    return patterns;
  }

  private analyzeImagePatterns(pages: PageAuditResult[]): IssuePattern[] {
    const patterns: IssuePattern[] = [];
    const imageIssues = new Map<string, { pages: string[], totalBytes: number }>();

    for (const page of pages) {
      const imgIssues = page.issues.filter(issue => issue.category === 'images');
      
      for (const issue of imgIssues) {
        const key = issue.id;
        if (imageIssues.has(key)) {
          const existing = imageIssues.get(key)!;
          existing.pages.push(page.label);
          existing.totalBytes += issue.estimatedSavings.bytes;
        } else {
          imageIssues.set(key, {
            pages: [page.label],
            totalBytes: issue.estimatedSavings.bytes
          });
        }
      }
    }

    for (const [issueId, data] of imageIssues.entries()) {
      if (data.pages.length > 1) {
        patterns.push({
          type: 'image-optimization',
          affectedPages: [...new Set(data.pages)],
          severity: this.calculateSeverityFromBytes(data.totalBytes),
          estimatedSavings: {
            timeMs: Math.floor(data.totalBytes / 1000), // Rough estimate: 1ms per KB
            bytes: data.totalBytes,
          },
          fixComplexity: 'medium',
          recommendations: this.generateImageRecommendations(issueId),
        });
      }
    }

    return patterns;
  }

  private analyzeCSSPatterns(pages: PageAuditResult[]): IssuePattern[] {
    const patterns: IssuePattern[] = [];
    const cssIssues = new Map<string, { pages: string[], totalSavings: { timeMs: number, bytes: number } }>();

    for (const page of pages) {
      const cssProblems = page.issues.filter(issue => issue.category === 'css');
      
      for (const issue of cssProblems) {
        const key = issue.id;
        if (cssIssues.has(key)) {
          const existing = cssIssues.get(key)!;
          existing.pages.push(page.label);
          existing.totalSavings.timeMs += issue.estimatedSavings.timeMs;
          existing.totalSavings.bytes += issue.estimatedSavings.bytes;
        } else {
          cssIssues.set(key, {
            pages: [page.label],
            totalSavings: { ...issue.estimatedSavings }
          });
        }
      }
    }

    for (const [issueId, data] of cssIssues.entries()) {
      if (data.pages.length > 1) {
        patterns.push({
          type: 'css-optimization',
          affectedPages: [...new Set(data.pages)],
          severity: this.calculateSeverityFromSavings(data.totalSavings.timeMs, data.pages.length),
          estimatedSavings: data.totalSavings,
          fixComplexity: 'medium',
          recommendations: this.generateCSSRecommendations(issueId),
        });
      }
    }

    return patterns;
  }

  private normalizeJavaScriptIssueKey(issue: Issue): string {
    // Extract meaningful parts from issue ID/title to group similar issues
    if (issue.id.includes('unused-javascript')) {
      // Group by general unused JS pattern rather than specific files
      return 'unused-javascript-general';
    }
    if (issue.id.includes('unminified-javascript')) {
      return 'unminified-javascript-general';
    }
    return issue.id;
  }

  private determineJavaScriptPatternType(issueKey: string): 'unused-javascript' | 'code-splitting' {
    if (issueKey.includes('unused')) {
      return 'code-splitting';
    }
    return 'unused-javascript';
  }

  private calculateSeverityFromSavings(timeMs: number, pageCount: number): 'critical' | 'high' | 'medium' | 'low' {
    const avgSavings = timeMs / pageCount;
    if (avgSavings >= 2000) return 'critical';
    if (avgSavings >= 1000) return 'high';
    if (avgSavings >= 500) return 'medium';
    return 'low';
  }

  private calculateSeverityFromBytes(bytes: number): 'critical' | 'high' | 'medium' | 'low' {
    if (bytes >= 500000) return 'critical'; // 500KB+
    if (bytes >= 200000) return 'high';     // 200KB+
    if (bytes >= 50000) return 'medium';    // 50KB+
    return 'low';
  }

  private determineJavaScriptFixComplexity(patternType: 'unused-javascript' | 'code-splitting'): 'easy' | 'medium' | 'hard' {
    switch (patternType) {
      case 'unused-javascript':
        return 'easy';
      case 'code-splitting':
        return 'medium';
      default:
        return 'medium';
    }
  }

  private estimateCachingSavings(pageCount: number): { timeMs: number, bytes: number } {
    // Rough estimates for caching improvements
    return {
      timeMs: pageCount * 200, // 200ms per page
      bytes: pageCount * 50000, // 50KB per page
    };
  }

  private calculatePatternPriority(pattern: IssuePattern): number {
    let priority = 0;
    
    // Severity weight
    switch (pattern.severity) {
      case 'critical': priority += 1000; break;
      case 'high': priority += 500; break;
      case 'medium': priority += 200; break;
      case 'low': priority += 50; break;
    }
    
    // Pages affected weight
    priority += pattern.affectedPages.length * 10;
    
    // Estimated savings weight
    priority += Math.floor(pattern.estimatedSavings.timeMs / 100);
    
    return priority;
  }

  private generateJavaScriptRecommendations(patternType: 'unused-javascript' | 'code-splitting', issueKey: string): ActionableRecommendation[] {
    const recommendations: ActionableRecommendation[] = [];

    if (patternType === 'code-splitting') {
      recommendations.push({
        action: 'Implement dynamic imports for unused JavaScript',
        implementation: {
          difficulty: 'medium',
          estimatedTime: '2-4 hours',
          codeExample: `// Replace static imports with dynamic imports
// Before: import { heavyFunction } from './heavy-module';
// After: const { heavyFunction } = await import('./heavy-module');`,
          documentation: [
            'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import',
            'https://webpack.js.org/guides/code-splitting/'
          ],
        },
        framework: 'react',
      });
    }

    if (patternType === 'unused-javascript') {
      recommendations.push({
        action: 'Remove or lazy-load unused JavaScript bundles',
        implementation: {
          difficulty: 'easy',
          estimatedTime: '1-2 hours',
          codeExample: `// Use webpack-bundle-analyzer to identify unused code
npm install --save-dev webpack-bundle-analyzer
// Add to webpack config or use with Next.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})`,
          documentation: [
            'https://github.com/webpack-contrib/webpack-bundle-analyzer',
            'https://nextjs.org/docs/advanced-features/analyzing-bundles'
          ],
        },
        framework: 'nextjs',
      });
    }

    return recommendations;
  }

  private generateCachingRecommendations(issueId: string): ActionableRecommendation[] {
    return [{
      action: 'Configure proper cache headers for static assets',
      implementation: {
        difficulty: 'easy',
        estimatedTime: '30 minutes',
        codeExample: `// Next.js next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}`,
        documentation: [
          'https://nextjs.org/docs/api-reference/next.config.js/headers',
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control'
        ],
      },
      framework: 'nextjs',
    }];
  }

  private generateImageRecommendations(issueId: string): ActionableRecommendation[] {
    return [{
      action: 'Optimize images with modern formats and proper sizing',
      implementation: {
        difficulty: 'medium',
        estimatedTime: '2-3 hours',
        codeExample: `// Next.js Image component with optimization
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={800}
  height={600}
  priority
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>`,
        documentation: [
          'https://nextjs.org/docs/api-reference/next/image',
          'https://web.dev/serve-images-webp/'
        ],
      },
      framework: 'nextjs',
    }];
  }

  private generateCSSRecommendations(issueId: string): ActionableRecommendation[] {
    return [{
      action: 'Remove unused CSS and optimize critical rendering path',
      implementation: {
        difficulty: 'medium',
        estimatedTime: '1-3 hours',
        codeExample: `// Use PurgeCSS to remove unused styles
// Install: npm install --save-dev @fullhuman/postcss-purgecss
// postcss.config.js
module.exports = {
  plugins: [
    '@fullhuman/postcss-purgecss': {
      content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
      defaultExtractor: content => content.match(/[\\w-/:]+(?<!:)/g) || []
    }
  ]
}`,
        documentation: [
          'https://purgecss.com/',
          'https://web.dev/extract-critical-css/'
        ],
      },
    }];
  }
}