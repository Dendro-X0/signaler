import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { EnhancedTriageGenerator } from "../src/reporting/generators/enhanced-triage-generator.js";
import type { ProcessedAuditData, PageAuditResult, Issue } from "../src/reporting/processors/raw-results-processor.js";

describe("Issue Aggregation", () => {
  // Feature: signaler-reporting-improvements, Property 5: Issue Aggregation Accuracy
  it("should correctly count affected pages and calculate cumulative impact metrics for shared issues", () => {
    fc.assert(fc.property(
      fc.record({
        sharedIssues: fc.array(fc.record({
          id: fc.string({ minLength: 5, maxLength: 20 }),
          title: fc.string({ minLength: 10, maxLength: 50 }),
          category: fc.constantFrom('javascript', 'css', 'images', 'caching', 'network'),
          severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
          baseTimeMs: fc.integer({ min: 100, max: 2000 }),
          baseBytes: fc.integer({ min: 1000, max: 100000 })
        }), { minLength: 1, maxLength: 5 }).map(issues => {
          // Ensure unique IDs by appending index
          return issues.map((issue, index) => ({
            ...issue,
            id: `${issue.id}-${index}`
          }));
        }),
        pageCount: fc.integer({ min: 2, max: 10 }),
        variationFactor: fc.float({ min: 0.5, max: 2.0 }) // How much savings can vary per page
      }),
      (testData) => {
        const generator = new EnhancedTriageGenerator();
        
        // Create pages with shared issues
        const pages: PageAuditResult[] = Array.from({ length: testData.pageCount }, (_, pageIndex) => {
          const issues: Issue[] = testData.sharedIssues.map(sharedIssue => {
            // Vary the impact per page but keep the issue ID consistent
            const variation = 0.8 + (Math.random() * 0.4 * testData.variationFactor);
            return {
              id: sharedIssue.id,
              title: sharedIssue.title,
              description: `${sharedIssue.title} on page ${pageIndex + 1}`,
              severity: sharedIssue.severity,
              category: sharedIssue.category,
              affectedResources: [],
              estimatedSavings: {
                timeMs: Math.round(sharedIssue.baseTimeMs * variation),
                bytes: Math.round(sharedIssue.baseBytes * variation)
              }
            };
          });

          return {
            label: `Page ${pageIndex + 1}`,
            path: `/page-${pageIndex + 1}`,
            device: 'desktop' as const,
            scores: {
              performance: 70 + Math.floor(Math.random() * 20),
              accessibility: 85 + Math.floor(Math.random() * 10),
              bestPractices: 80 + Math.floor(Math.random() * 15),
              seo: 90 + Math.floor(Math.random() * 10)
            },
            metrics: {
              lcpMs: 2000 + Math.floor(Math.random() * 1000),
              fcpMs: 1000 + Math.floor(Math.random() * 500),
              tbtMs: 100 + Math.floor(Math.random() * 200),
              cls: Math.random() * 0.2
            },
            issues,
            opportunities: []
          };
        });

        const processedData: ProcessedAuditData = {
          pages,
          globalIssues: [],
          performanceMetrics: {
            averageScores: {
              performance: 75,
              accessibility: 88,
              bestPractices: 85,
              seo: 92
            },
            totalPages: testData.pageCount,
            auditDuration: 120000,
            disclaimer: 'Test disclaimer for aggregation testing'
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

        // Generate the triage report (this will internally aggregate issues)
        const report = generator.generate(processedData);

        // Verify the report contains expected content
        expect(report).toBeDefined();
        expect(report.length).toBeGreaterThan(0);

        // Verify that each shared issue appears in the report
        for (const sharedIssue of testData.sharedIssues) {
          expect(report).toContain(sharedIssue.title);
        }

        // Verify page count is mentioned correctly
        expect(report).toContain(`${testData.pageCount} pages audited`);

        // Verify that the report contains aggregation information
        expect(report).toContain('Pages Affected');
        expect(report).toContain('Total Impact');
        expect(report).toContain('Average Impact');

        // Test the internal aggregation logic by calling private methods through reflection
        // This is a bit hacky but necessary to test the core aggregation logic
        const aggregatedIssues = (generator as any).aggregateIssues(processedData);
        
        // Verify aggregation accuracy
        expect(aggregatedIssues.length).toBe(testData.sharedIssues.length);
        
        for (let i = 0; i < testData.sharedIssues.length; i++) {
          const originalIssue = testData.sharedIssues[i];
          const aggregatedIssue = aggregatedIssues.find((agg: any) => agg.id === originalIssue.id);
          
          expect(aggregatedIssue).toBeDefined();
          expect(aggregatedIssue.affectedPages.length).toBe(testData.pageCount);
          
          // Verify total impact is sum of all page impacts
          let expectedTotalTimeMs = 0;
          let expectedTotalBytes = 0;
          
          for (const page of pages) {
            const pageIssue = page.issues.find(issue => issue.id === originalIssue.id);
            if (pageIssue) {
              expectedTotalTimeMs += pageIssue.estimatedSavings.timeMs;
              expectedTotalBytes += pageIssue.estimatedSavings.bytes;
            }
          }
          
          expect(aggregatedIssue.totalImpact.timeMs).toBe(expectedTotalTimeMs);
          expect(aggregatedIssue.totalImpact.bytes).toBe(expectedTotalBytes);
          
          // Verify average impact is correctly calculated
          const expectedAvgTimeMs = Math.round(expectedTotalTimeMs / testData.pageCount);
          const expectedAvgBytes = Math.round(expectedTotalBytes / testData.pageCount);
          
          expect(aggregatedIssue.averageImpact.timeMs).toBe(expectedAvgTimeMs);
          expect(aggregatedIssue.averageImpact.bytes).toBe(expectedAvgBytes);
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 5: Issue Aggregation Accuracy
  it("should handle pages with different subsets of issues correctly", () => {
    fc.assert(fc.property(
      fc.record({
        issuePool: fc.array(fc.record({
          id: fc.string({ minLength: 5, maxLength: 15 }),
          title: fc.string({ minLength: 10, maxLength: 40 }),
          category: fc.constantFrom('javascript', 'css', 'images', 'caching', 'network'),
          severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
          timeMs: fc.integer({ min: 200, max: 3000 }),
          bytes: fc.integer({ min: 5000, max: 200000 })
        }), { minLength: 3, maxLength: 8 }),
        pageCount: fc.integer({ min: 3, max: 8 })
      }),
      (testData) => {
        const generator = new EnhancedTriageGenerator();
        
        // Create pages where each page has a random subset of issues from the pool
        const pages: PageAuditResult[] = Array.from({ length: testData.pageCount }, (_, pageIndex) => {
          // Each page gets 1-3 random issues from the pool
          const issueCount = 1 + Math.floor(Math.random() * Math.min(3, testData.issuePool.length));
          const selectedIssues = testData.issuePool
            .sort(() => Math.random() - 0.5)
            .slice(0, issueCount);

          const issues: Issue[] = selectedIssues.map(poolIssue => ({
            id: poolIssue.id,
            title: poolIssue.title,
            description: poolIssue.title,
            severity: poolIssue.severity,
            category: poolIssue.category,
            affectedResources: [],
            estimatedSavings: {
              timeMs: poolIssue.timeMs,
              bytes: poolIssue.bytes
            }
          }));

          return {
            label: `Page ${pageIndex + 1}`,
            path: `/page-${pageIndex + 1}`,
            device: Math.random() > 0.5 ? 'desktop' as const : 'mobile' as const,
            scores: {
              performance: 60 + Math.floor(Math.random() * 30)
            },
            metrics: {
              lcpMs: 1500 + Math.floor(Math.random() * 2000)
            },
            issues,
            opportunities: []
          };
        });

        const processedData: ProcessedAuditData = {
          pages,
          globalIssues: [],
          performanceMetrics: {
            averageScores: { performance: 75 },
            totalPages: testData.pageCount,
            auditDuration: 90000,
            disclaimer: 'Test disclaimer for subset aggregation'
          },
          auditMetadata: {
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            elapsedMs: 90000,
            totalPages: testData.pageCount,
            throttlingMethod: 'simulate',
            cpuSlowdownMultiplier: 4
          }
        };

        // Test aggregation with subset logic
        const aggregatedIssues = (generator as any).aggregateIssues(processedData);

        // Count how many pages each issue actually appears on
        const actualPageCounts = new Map<string, number>();
        const actualTotalImpacts = new Map<string, { timeMs: number; bytes: number }>();

        for (const page of pages) {
          for (const issue of page.issues) {
            actualPageCounts.set(issue.id, (actualPageCounts.get(issue.id) || 0) + 1);
            
            const currentImpact = actualTotalImpacts.get(issue.id) || { timeMs: 0, bytes: 0 };
            actualTotalImpacts.set(issue.id, {
              timeMs: currentImpact.timeMs + issue.estimatedSavings.timeMs,
              bytes: currentImpact.bytes + issue.estimatedSavings.bytes
            });
          }
        }

        // Verify aggregation matches actual counts
        for (const aggregatedIssue of aggregatedIssues) {
          const expectedPageCount = actualPageCounts.get(aggregatedIssue.id) || 0;
          const expectedImpact = actualTotalImpacts.get(aggregatedIssue.id) || { timeMs: 0, bytes: 0 };

          expect(aggregatedIssue.affectedPages.length).toBe(expectedPageCount);
          expect(aggregatedIssue.totalImpact.timeMs).toBe(expectedImpact.timeMs);
          expect(aggregatedIssue.totalImpact.bytes).toBe(expectedImpact.bytes);

          // Verify average calculation
          if (expectedPageCount > 0) {
            const expectedAvgTimeMs = Math.round(expectedImpact.timeMs / expectedPageCount);
            const expectedAvgBytes = Math.round(expectedImpact.bytes / expectedPageCount);
            
            expect(aggregatedIssue.averageImpact.timeMs).toBe(expectedAvgTimeMs);
            expect(aggregatedIssue.averageImpact.bytes).toBe(expectedAvgBytes);
          }
        }

        // Verify no issues are lost or duplicated
        const aggregatedIssueIds = new Set(aggregatedIssues.map((issue: any) => issue.id));
        const actualIssueIds = new Set(actualPageCounts.keys());
        
        expect(aggregatedIssueIds.size).toBe(actualIssueIds.size);
        for (const issueId of actualIssueIds) {
          expect(aggregatedIssueIds.has(issueId)).toBe(true);
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 5: Issue Aggregation Accuracy
  it("should maintain data consistency when aggregating zero or single-page issues", () => {
    fc.assert(fc.property(
      fc.record({
        hasEmptyPages: fc.boolean(),
        hasSinglePageIssues: fc.boolean(),
        pageCount: fc.integer({ min: 1, max: 5 })
      }),
      (testData) => {
        const generator = new EnhancedTriageGenerator();
        
        const pages: PageAuditResult[] = [];
        
        // Add empty pages if requested
        if (testData.hasEmptyPages) {
          for (let i = 0; i < Math.ceil(testData.pageCount / 2); i++) {
            pages.push({
              label: `Empty Page ${i + 1}`,
              path: `/empty-${i + 1}`,
              device: 'desktop' as const,
              scores: { performance: 90 },
              metrics: { lcpMs: 1000 },
              issues: [], // No issues
              opportunities: []
            });
          }
        }
        
        // Add pages with single-page issues if requested
        if (testData.hasSinglePageIssues) {
          for (let i = 0; i < Math.floor(testData.pageCount / 2) + 1; i++) {
            pages.push({
              label: `Single Issue Page ${i + 1}`,
              path: `/single-${i + 1}`,
              device: 'mobile' as const,
              scores: { performance: 70 },
              metrics: { lcpMs: 2500 },
              issues: [{
                id: `unique-issue-${i}`,
                title: `Unique issue for page ${i + 1}`,
                description: `This issue only affects page ${i + 1}`,
                severity: 'medium' as const,
                category: 'javascript' as const,
                affectedResources: [],
                estimatedSavings: {
                  timeMs: 500 + i * 100,
                  bytes: 10000 + i * 1000
                }
              }],
              opportunities: []
            });
          }
        }

        // Ensure we have at least one page
        if (pages.length === 0) {
          pages.push({
            label: 'Default Page',
            path: '/default',
            device: 'desktop' as const,
            scores: { performance: 80 },
            metrics: { lcpMs: 1800 },
            issues: [],
            opportunities: []
          });
        }

        const processedData: ProcessedAuditData = {
          pages,
          globalIssues: [],
          performanceMetrics: {
            averageScores: { performance: 80 },
            totalPages: pages.length,
            auditDuration: 60000,
            disclaimer: 'Test disclaimer for edge cases'
          },
          auditMetadata: {
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            elapsedMs: 60000,
            totalPages: pages.length,
            throttlingMethod: 'simulate',
            cpuSlowdownMultiplier: 4
          }
        };

        // Test aggregation with edge cases
        const aggregatedIssues = (generator as any).aggregateIssues(processedData);

        // Should handle empty results gracefully
        expect(Array.isArray(aggregatedIssues)).toBe(true);

        // If there are issues, verify they're properly aggregated
        for (const aggregatedIssue of aggregatedIssues) {
          expect(aggregatedIssue.id).toBeDefined();
          expect(aggregatedIssue.affectedPages.length).toBeGreaterThan(0);
          expect(aggregatedIssue.totalImpact.timeMs).toBeGreaterThanOrEqual(0);
          expect(aggregatedIssue.totalImpact.bytes).toBeGreaterThanOrEqual(0);
          expect(aggregatedIssue.averageImpact.timeMs).toBeGreaterThanOrEqual(0);
          expect(aggregatedIssue.averageImpact.bytes).toBeGreaterThanOrEqual(0);
          
          // Average should be total divided by page count
          const expectedAvgTimeMs = Math.round(aggregatedIssue.totalImpact.timeMs / aggregatedIssue.affectedPages.length);
          const expectedAvgBytes = Math.round(aggregatedIssue.totalImpact.bytes / aggregatedIssue.affectedPages.length);
          
          expect(aggregatedIssue.averageImpact.timeMs).toBe(expectedAvgTimeMs);
          expect(aggregatedIssue.averageImpact.bytes).toBe(expectedAvgBytes);
        }

        // Generate report to ensure it handles edge cases
        const report = generator.generate(processedData);
        expect(report).toBeDefined();
        expect(report.length).toBeGreaterThan(0);
        expect(report).toContain('Enhanced Triage Report');
      }
    ), { numRuns: 100 });
  });
});