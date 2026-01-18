import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { RawResultsProcessor } from "../src/reporting/processors/raw-results-processor.js";
import type { RunSummary, PageDeviceSummary, MetricValues, CategoryScores } from "../src/types.js";

describe("Content Inclusion", () => {
  // Feature: signaler-reporting-improvements, Property 3: Required Content Inclusion
  it("all generated reports should contain performance score disclaimer and DevTools comparison", () => {
    fc.assert(fc.property(
      fc.record({
        pages: fc.array(fc.record({
          label: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          path: fc.string({ minLength: 1, maxLength: 50 }).map(s => `/${s.replace(/\s+/g, '-')}`),
          url: fc.webUrl(),
          device: fc.constantFrom('desktop', 'mobile'),
          scores: fc.record({
            performance: fc.option(fc.integer({ min: 0, max: 100 })),
            accessibility: fc.option(fc.integer({ min: 0, max: 100 })),
            bestPractices: fc.option(fc.integer({ min: 0, max: 100 })),
            seo: fc.option(fc.integer({ min: 0, max: 100 }))
          }),
          metrics: fc.record({
            lcpMs: fc.option(fc.integer({ min: 0, max: 10000 })),
            fcpMs: fc.option(fc.integer({ min: 0, max: 5000 })),
            tbtMs: fc.option(fc.integer({ min: 0, max: 2000 })),
            cls: fc.option(fc.float({ min: 0, max: 1 })),
            inpMs: fc.option(fc.integer({ min: 0, max: 1000 }))
          }),
          opportunities: fc.array(fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1 }),
            estimatedSavingsMs: fc.option(fc.integer({ min: 0, max: 5000 })),
            estimatedSavingsBytes: fc.option(fc.integer({ min: 0, max: 1000000 }))
          }))
        }), { minLength: 1, maxLength: 10 }),
        meta: fc.record({
          configPath: fc.string(),
          buildId: fc.option(fc.string()),
          incremental: fc.boolean(),
          resolvedParallel: fc.integer({ min: 1, max: 8 }),
          totalSteps: fc.integer({ min: 1, max: 100 }),
          comboCount: fc.integer({ min: 1, max: 50 }),
          executedCombos: fc.integer({ min: 0, max: 50 }),
          cachedCombos: fc.integer({ min: 0, max: 50 }),
          runsPerCombo: fc.integer({ min: 1, max: 5 }),
          executedSteps: fc.integer({ min: 0, max: 100 }),
          cachedSteps: fc.integer({ min: 0, max: 100 }),
          warmUp: fc.boolean(),
          throttlingMethod: fc.constantFrom('simulate', 'devtools'),
          cpuSlowdownMultiplier: fc.integer({ min: 1, max: 10 }),
          startedAt: fc.date().map(d => d.toISOString()),
          completedAt: fc.date().map(d => d.toISOString()),
          elapsedMs: fc.integer({ min: 1000, max: 600000 }),
          averageStepMs: fc.integer({ min: 100, max: 10000 })
        })
      }),
      (auditData) => {
        const processor = new RawResultsProcessor();
        
        // Ensure meta.comboCount matches pages length for consistency
        const runSummary: RunSummary = {
          ...auditData,
          meta: {
            ...auditData.meta,
            comboCount: auditData.pages.length
          },
          results: auditData.pages as PageDeviceSummary[]
        };

        const processedData = processor.processAuditResults(runSummary);

        // Verify performance disclaimer is present and contains required elements
        expect(processedData.performanceMetrics.disclaimer).toBeDefined();
        expect(processedData.performanceMetrics.disclaimer).toContain('automated testing environment');
        expect(processedData.performanceMetrics.disclaimer).toContain('DevTools');
        expect(processedData.performanceMetrics.disclaimer).toContain('relative performance differences');
        
        // Verify timing context is included
        expect(processedData.performanceMetrics.disclaimer).toContain('minutes');
        expect(processedData.performanceMetrics.disclaimer).toContain(auditData.meta.throttlingMethod);
        expect(processedData.performanceMetrics.disclaimer).toContain(`${auditData.meta.cpuSlowdownMultiplier}x`);
        
        // Verify audit metadata contains essential information
        expect(processedData.auditMetadata.startedAt).toBeDefined();
        expect(processedData.auditMetadata.completedAt).toBeDefined();
        expect(processedData.auditMetadata.elapsedMs).toBeGreaterThan(0);
        expect(processedData.auditMetadata.totalPages).toBe(auditData.pages.length);
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 3: Required Content Inclusion
  it("processed data should contain actionable recommendations based on issue types", () => {
    fc.assert(fc.property(
      fc.record({
        pages: fc.array(fc.record({
          label: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          path: fc.string({ minLength: 1, maxLength: 50 }).map(s => `/${s.replace(/\s+/g, '-')}`),
          url: fc.webUrl(),
          device: fc.constantFrom('desktop', 'mobile'),
          scores: fc.record({
            performance: fc.option(fc.integer({ min: 0, max: 100 })),
            accessibility: fc.option(fc.integer({ min: 0, max: 100 })),
            bestPractices: fc.option(fc.integer({ min: 0, max: 100 })),
            seo: fc.option(fc.integer({ min: 0, max: 100 }))
          }),
          metrics: fc.record({
            lcpMs: fc.option(fc.integer({ min: 0, max: 10000 })),
            fcpMs: fc.option(fc.integer({ min: 0, max: 5000 })),
            tbtMs: fc.option(fc.integer({ min: 0, max: 2000 })),
            cls: fc.option(fc.float({ min: 0, max: 1 })),
            inpMs: fc.option(fc.integer({ min: 0, max: 1000 }))
          }),
          opportunities: fc.array(fc.record({
            id: fc.constantFrom(
              'unused-javascript',
              'unused-css-rules', 
              'modern-image-formats',
              'uses-long-cache-ttl',
              'unminified-javascript'
            ),
            title: fc.string({ minLength: 1 }),
            estimatedSavingsMs: fc.option(fc.integer({ min: 100, max: 5000 })),
            estimatedSavingsBytes: fc.option(fc.integer({ min: 1000, max: 1000000 }))
          }), { minLength: 1, maxLength: 5 })
        }), { minLength: 1, maxLength: 5 }),
        meta: fc.record({
          configPath: fc.string(),
          buildId: fc.option(fc.string()),
          incremental: fc.boolean(),
          resolvedParallel: fc.integer({ min: 1, max: 8 }),
          totalSteps: fc.integer({ min: 1, max: 100 }),
          comboCount: fc.integer({ min: 1, max: 50 }),
          executedCombos: fc.integer({ min: 0, max: 50 }),
          cachedCombos: fc.integer({ min: 0, max: 50 }),
          runsPerCombo: fc.integer({ min: 1, max: 5 }),
          executedSteps: fc.integer({ min: 0, max: 100 }),
          cachedSteps: fc.integer({ min: 0, max: 100 }),
          warmUp: fc.boolean(),
          throttlingMethod: fc.constantFrom('simulate', 'devtools'),
          cpuSlowdownMultiplier: fc.integer({ min: 1, max: 10 }),
          startedAt: fc.date().map(d => d.toISOString()),
          completedAt: fc.date().map(d => d.toISOString()),
          elapsedMs: fc.integer({ min: 1000, max: 600000 }),
          averageStepMs: fc.integer({ min: 100, max: 10000 })
        })
      }),
      (auditData) => {
        const processor = new RawResultsProcessor();
        
        const runSummary: RunSummary = {
          ...auditData,
          meta: {
            ...auditData.meta,
            comboCount: auditData.pages.length
          },
          results: auditData.pages as PageDeviceSummary[]
        };

        const processedData = processor.processAuditResults(runSummary);

        // Verify that issues are properly categorized
        for (const page of processedData.pages) {
          for (const issue of page.issues) {
            expect(issue.id).toBeDefined();
            expect(issue.title).toBeDefined();
            expect(issue.severity).toMatch(/^(critical|high|medium|low)$/);
            expect(issue.category).toMatch(/^(javascript|css|images|caching|network)$/);
            expect(issue.estimatedSavings).toBeDefined();
            expect(issue.estimatedSavings.timeMs).toBeGreaterThanOrEqual(0);
            expect(issue.estimatedSavings.bytes).toBeGreaterThanOrEqual(0);
          }
        }

        // Verify that opportunities are preserved
        for (const page of processedData.pages) {
          for (const opportunity of page.opportunities) {
            expect(opportunity.id).toBeDefined();
            expect(opportunity.title).toBeDefined();
            expect(opportunity.description).toBeDefined();
          }
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 3: Required Content Inclusion
  it("validation should identify missing required content", () => {
    fc.assert(fc.property(
      fc.record({
        hasResults: fc.boolean(),
        hasMeta: fc.boolean(),
        hasValidPages: fc.boolean(),
        pageCount: fc.integer({ min: 0, max: 10 })
      }),
      (testCase) => {
        const processor = new RawResultsProcessor();
        
        // Create test data based on what should be missing
        let testData: any = {};
        
        if (testCase.hasMeta) {
          testData.meta = {
            configPath: 'test',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            elapsedMs: 1000,
            comboCount: testCase.pageCount,
            throttlingMethod: 'simulate',
            cpuSlowdownMultiplier: 4,
            incremental: false,
            resolvedParallel: 1,
            totalSteps: 1,
            executedCombos: 1,
            cachedCombos: 0,
            runsPerCombo: 1,
            executedSteps: 1,
            cachedSteps: 0,
            warmUp: false,
            averageStepMs: 1000
          };
        }
        
        if (testCase.hasResults && testCase.hasValidPages) {
          testData.results = Array.from({ length: testData.pageCount }, (_, i) => ({
            label: `Page ${i}`,
            path: `/page-${i}`,
            url: `https://example.com/page-${i}`,
            device: 'desktop' as const,
            scores: { performance: 80 },
            metrics: { lcpMs: 2000 },
            opportunities: []
          }));
        } else if (testCase.hasResults) {
          testData.results = testCase.hasValidPages ? [] : null;
        }

        const validation = processor.validateResults(testData as RunSummary);
        
        // Should be invalid if any required content is missing
        if (!testCase.hasMeta || !testCase.hasResults || !testCase.hasValidPages) {
          expect(validation.isValid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
        } else if (testCase.pageCount === 0) {
          // Empty results should be valid but with warnings
          expect(validation.isValid).toBe(true);
          expect(validation.warnings.length).toBeGreaterThan(0);
        } else {
          expect(validation.isValid).toBe(true);
        }
      }
    ), { numRuns: 100 });
  });
});