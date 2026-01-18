import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { IssuePatternAnalyzer } from "../src/reporting/analyzers/issue-pattern-analyzer.js";
import type { ProcessedAuditData, PageAuditResult, Issue } from "../src/reporting/processors/raw-results-processor.js";

describe("Pattern Recognition", () => {
  // Feature: signaler-reporting-improvements, Property 6: Pattern Recognition
  it("should identify code-splitting opportunities when JavaScript files appear unused across multiple pages", () => {
    fc.assert(fc.property(
      fc.record({
        sharedJsFile: fc.string({ minLength: 5, maxLength: 20 }).map(s => `${s}.js`),
        pageCount: fc.integer({ min: 2, max: 10 }),
        savingsPerPage: fc.integer({ min: 500, max: 5000 }),
        bytesPerPage: fc.integer({ min: 10000, max: 500000 })
      }),
      (testData) => {
        const analyzer = new IssuePatternAnalyzer();
        
        // Create pages with the same unused JavaScript issue
        const pages: PageAuditResult[] = Array.from({ length: testData.pageCount }, (_, i) => ({
          label: `Page ${i + 1}`,
          path: `/page-${i + 1}`,
          device: 'desktop' as const,
          scores: { performance: 80 },
          metrics: { lcpMs: 2000 },
          issues: [{
            id: `unused-javascript-${testData.sharedJsFile}`,
            title: `Unused JavaScript: ${testData.sharedJsFile}`,
            description: `Remove unused JavaScript from ${testData.sharedJsFile}`,
            severity: 'medium' as const,
            category: 'javascript' as const,
            affectedResources: [{
              url: `https://example.com/static/${testData.sharedJsFile}`,
              type: 'script' as const,
              size: testData.bytesPerPage
            }],
            estimatedSavings: {
              timeMs: testData.savingsPerPage,
              bytes: testData.bytesPerPage
            }
          }],
          opportunities: []
        }));

        const processedData: ProcessedAuditData = {
          pages,
          globalIssues: [],
          performanceMetrics: {
            averageScores: { performance: 80 },
            totalPages: testData.pageCount,
            auditDuration: 60000,
            disclaimer: 'Test disclaimer'
          },
          auditMetadata: {
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            elapsedMs: 60000,
            totalPages: testData.pageCount,
            throttlingMethod: 'simulate',
            cpuSlowdownMultiplier: 4
          }
        };

        const patterns = analyzer.analyzePatterns(processedData);

        // Should identify code-splitting opportunity
        const codeSplittingPatterns = patterns.filter(p => 
          p.type === 'code-splitting' || p.type === 'unused-javascript'
        );
        
        expect(codeSplittingPatterns.length).toBeGreaterThan(0);
        
        const pattern = codeSplittingPatterns[0];
        expect(pattern.affectedPages.length).toBe(testData.pageCount);
        expect(pattern.estimatedSavings.timeMs).toBeGreaterThan(0);
        expect(pattern.estimatedSavings.bytes).toBeGreaterThan(0);
        expect(pattern.severity).toMatch(/^(critical|high|medium|low)$/);
        expect(pattern.recommendations.length).toBeGreaterThan(0);
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 6: Pattern Recognition
  it("should detect global caching issues when cache problems affect majority of pages", () => {
    fc.assert(fc.property(
      fc.record({
        totalPages: fc.integer({ min: 4, max: 20 }),
        affectedPageRatio: fc.float({ min: 0.5, max: 1.0 }) // 50-100% of pages affected
      }),
      (testData) => {
        const analyzer = new IssuePatternAnalyzer();
        const affectedPageCount = Math.ceil(testData.totalPages * testData.affectedPageRatio);
        
        // Create pages where majority have caching issues
        const pages: PageAuditResult[] = Array.from({ length: testData.totalPages }, (_, i) => {
          const hasCachingIssue = i < affectedPageCount;
          
          return {
            label: `Page ${i + 1}`,
            path: `/page-${i + 1}`,
            device: 'desktop' as const,
            scores: { performance: 75 },
            metrics: { lcpMs: 2500 },
            issues: hasCachingIssue ? [{
              id: 'uses-long-cache-ttl',
              title: 'Serve static assets with an efficient cache policy',
              description: 'Static assets should be cached with long TTL',
              severity: 'medium' as const,
              category: 'caching' as const,
              affectedResources: [],
              estimatedSavings: {
                timeMs: 300,
                bytes: 50000
              }
            }] : [],
            opportunities: []
          };
        });

        const processedData: ProcessedAuditData = {
          pages,
          globalIssues: [],
          performanceMetrics: {
            averageScores: { performance: 75 },
            totalPages: testData.totalPages,
            auditDuration: 90000,
            disclaimer: 'Test disclaimer'
          },
          auditMetadata: {
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            elapsedMs: 90000,
            totalPages: testData.totalPages,
            throttlingMethod: 'simulate',
            cpuSlowdownMultiplier: 4
          }
        };

        const patterns = analyzer.analyzePatterns(processedData);

        if (affectedPageCount >= Math.ceil(testData.totalPages * 0.5)) {
          // Should detect caching pattern when 50%+ pages affected
          const cachingPatterns = patterns.filter(p => p.type === 'cache-control');
          expect(cachingPatterns.length).toBeGreaterThan(0);
          
          const pattern = cachingPatterns[0];
          expect(pattern.affectedPages.length).toBe(affectedPageCount);
          expect(pattern.severity).toMatch(/^(critical|high|medium|low)$/);
          expect(pattern.fixComplexity).toBe('easy');
          expect(pattern.recommendations.length).toBeGreaterThan(0);
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 6: Pattern Recognition
  it("should categorize issues correctly by type", () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        id: fc.string({ minLength: 5, maxLength: 30 }),
        title: fc.string({ minLength: 10, maxLength: 50 }),
        category: fc.constantFrom('javascript', 'css', 'images', 'caching', 'network'),
        severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
        timeMs: fc.integer({ min: 0, max: 5000 }),
        bytes: fc.integer({ min: 0, max: 1000000 })
      }), { minLength: 1, maxLength: 20 }),
      (issueSpecs) => {
        const analyzer = new IssuePatternAnalyzer();
        
        const issues: Issue[] = issueSpecs.map(spec => ({
          id: spec.id,
          title: spec.title,
          description: spec.title,
          severity: spec.severity,
          category: spec.category,
          affectedResources: [],
          estimatedSavings: {
            timeMs: spec.timeMs,
            bytes: spec.bytes
          }
        }));

        const categorized = analyzer.categorizeIssues(issues);

        // Verify all issues are properly categorized
        const totalCategorized = 
          categorized.javascript.length +
          categorized.css.length +
          categorized.images.length +
          categorized.caching.length +
          categorized.network.length;
        
        expect(totalCategorized).toBe(issues.length);

        // Verify each category contains only issues of that type
        for (const jsIssue of categorized.javascript) {
          expect(jsIssue.category).toBe('javascript');
        }
        for (const cssIssue of categorized.css) {
          expect(cssIssue.category).toBe('css');
        }
        for (const imgIssue of categorized.images) {
          expect(imgIssue.category).toBe('images');
        }
        for (const cacheIssue of categorized.caching) {
          expect(cacheIssue.category).toBe('caching');
        }
        for (const netIssue of categorized.network) {
          expect(netIssue.category).toBe('network');
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 6: Pattern Recognition
  it("should calculate impact analysis correctly from patterns", () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        type: fc.constantFrom('unused-javascript', 'cache-control', 'image-optimization', 'code-splitting', 'css-optimization'),
        severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
        timeMs: fc.integer({ min: 100, max: 10000 }),
        bytes: fc.integer({ min: 1000, max: 2000000 }),
        pageCount: fc.integer({ min: 1, max: 15 })
      }), { minLength: 1, max: 10 }),
      (patternSpecs) => {
        const analyzer = new IssuePatternAnalyzer();
        
        const patterns = patternSpecs.map(spec => ({
          type: spec.type,
          affectedPages: Array.from({ length: spec.pageCount }, (_, i) => `Page ${i + 1}`),
          severity: spec.severity,
          estimatedSavings: {
            timeMs: spec.timeMs,
            bytes: spec.bytes
          },
          fixComplexity: 'medium' as const,
          recommendations: []
        }));

        const impact = analyzer.calculateImpact(patterns);

        // Verify totals are calculated correctly
        const expectedTotalMs = patternSpecs.reduce((sum, spec) => sum + spec.timeMs, 0);
        const expectedTotalBytes = patternSpecs.reduce((sum, spec) => sum + spec.bytes, 0);
        const expectedCritical = patternSpecs.filter(spec => spec.severity === 'critical').length;
        const expectedHighImpact = patternSpecs.filter(spec => 
          spec.severity === 'critical' || spec.severity === 'high'
        ).length;
        const expectedCodeSplitting = patternSpecs.filter(spec => 
          spec.type === 'code-splitting' || spec.type === 'unused-javascript'
        ).length;

        expect(impact.totalEstimatedSavingsMs).toBe(expectedTotalMs);
        expect(impact.totalEstimatedSavingsBytes).toBe(expectedTotalBytes);
        expect(impact.criticalIssuesCount).toBe(expectedCritical);
        expect(impact.highImpactPatternsCount).toBe(expectedHighImpact);
        expect(impact.codeSplittingOpportunities).toBe(expectedCodeSplitting);
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 6: Pattern Recognition
  it("should assign appropriate severity levels based on estimated savings", () => {
    fc.assert(fc.property(
      fc.record({
        pageCount: fc.integer({ min: 2, max: 10 }),
        savingsPerPage: fc.integer({ min: 100, max: 8000 })
      }),
      (testData) => {
        const analyzer = new IssuePatternAnalyzer();
        const totalSavings = testData.savingsPerPage * testData.pageCount;
        const avgSavings = testData.savingsPerPage;
        
        // Create pages with consistent savings
        const pages: PageAuditResult[] = Array.from({ length: testData.pageCount }, (_, i) => ({
          label: `Page ${i + 1}`,
          path: `/page-${i + 1}`,
          device: 'desktop' as const,
          scores: { performance: 70 },
          metrics: { lcpMs: 3000 },
          issues: [{
            id: 'test-issue',
            title: 'Test performance issue',
            description: 'Test issue for severity calculation',
            severity: 'medium' as const,
            category: 'javascript' as const,
            affectedResources: [],
            estimatedSavings: {
              timeMs: testData.savingsPerPage,
              bytes: 100000
            }
          }],
          opportunities: []
        }));

        const processedData: ProcessedAuditData = {
          pages,
          globalIssues: [],
          performanceMetrics: {
            averageScores: { performance: 70 },
            totalPages: testData.pageCount,
            auditDuration: 120000,
            disclaimer: 'Test disclaimer'
          },
          auditMetadata: {
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            elapsedMs: 120000,
            totalPages: testData.pageCount,
            throttlingMethod: 'simulate',
            cpuSlowdownMultiplier: 4
          }
        };

        const patterns = analyzer.analyzePatterns(processedData);

        if (patterns.length > 0) {
          const pattern = patterns[0];
          
          // Verify severity assignment logic
          if (avgSavings >= 2000) {
            expect(pattern.severity).toBe('critical');
          } else if (avgSavings >= 1000) {
            expect(pattern.severity).toBe('high');
          } else if (avgSavings >= 500) {
            expect(pattern.severity).toBe('medium');
          } else {
            expect(pattern.severity).toBe('low');
          }
          
          // Verify total savings are accumulated correctly
          expect(pattern.estimatedSavings.timeMs).toBe(totalSavings);
        }
      }
    ), { numRuns: 100 });
  });
});