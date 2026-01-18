import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { PerformanceBudgetManager, type BudgetResult, type PerformanceBudgetConfig } from "../src/performance-budget.js";
import type { PageDeviceSummary, CategoryScores, MetricValues } from "../src/types.js";

describe("Exit Code Behavior", () => {
  // Feature: signaler-reporting-improvements, Property 9: Exit Code Behavior
  it("should return appropriate exit codes based on budget violations and CI mode", () => {
    fc.assert(fc.property(
      fc.record({
        ciMode: fc.boolean(),
        failOnBudget: fc.boolean(),
        budgetConfig: fc.record({
          categories: fc.option(fc.record({
            performance: fc.option(fc.integer({ min: 0, max: 100 })),
            accessibility: fc.option(fc.integer({ min: 0, max: 100 })),
            bestPractices: fc.option(fc.integer({ min: 0, max: 100 })),
            seo: fc.option(fc.integer({ min: 0, max: 100 }))
          })),
          metrics: fc.option(fc.record({
            lcpMs: fc.option(fc.integer({ min: 1000, max: 10000 })),
            fcpMs: fc.option(fc.integer({ min: 500, max: 5000 })),
            tbtMs: fc.option(fc.integer({ min: 0, max: 1000 })),
            cls: fc.option(fc.float({ min: 0, max: 1 })),
            inpMs: fc.option(fc.integer({ min: 0, max: 1000 }))
          })),
          failureThreshold: fc.constantFrom("any", "majority", "all")
        }),
        auditResults: fc.array(fc.record({
          url: fc.webUrl(),
          path: fc.webPath(),
          label: fc.string({ minLength: 1, maxLength: 50 }),
          device: fc.constantFrom("mobile", "desktop"),
          scores: fc.record({
            performance: fc.option(fc.integer({ min: 0, max: 100 })),
            accessibility: fc.option(fc.integer({ min: 0, max: 100 })),
            bestPractices: fc.option(fc.integer({ min: 0, max: 100 })),
            seo: fc.option(fc.integer({ min: 0, max: 100 }))
          }),
          metrics: fc.record({
            lcpMs: fc.option(fc.integer({ min: 500, max: 15000 })),
            fcpMs: fc.option(fc.integer({ min: 200, max: 8000 })),
            tbtMs: fc.option(fc.integer({ min: 0, max: 2000 })),
            cls: fc.option(fc.float({ min: 0, max: 2 })),
            inpMs: fc.option(fc.integer({ min: 0, max: 2000 }))
          }),
          opportunities: fc.array(fc.record({
            id: fc.string(),
            title: fc.string(),
            estimatedSavingsMs: fc.option(fc.integer({ min: 0, max: 5000 })),
            estimatedSavingsBytes: fc.option(fc.integer({ min: 0, max: 1000000 }))
          }))
        }), { minLength: 1, maxLength: 10 })
      }),
      (testData) => {
        const { ciMode, failOnBudget, budgetConfig, auditResults } = testData;
        
        // Create budget manager
        const manager = new PerformanceBudgetManager(budgetConfig as PerformanceBudgetConfig);
        
        // Evaluate budgets
        const budgetResult: BudgetResult = manager.evaluateBudgets(auditResults as PageDeviceSummary[]);
        
        // Get exit code
        const exitCode = manager.getExitCode(budgetResult, ciMode, failOnBudget);
        
        // Validate exit code behavior
        if (!ciMode && !failOnBudget) {
          // Should always return 0 when not in CI mode and not failing on budget
          expect(exitCode).toBe(0);
        } else if (budgetResult.passed) {
          // Should return 0 when all budgets pass
          expect(exitCode).toBe(0);
        } else {
          // Should return 1 when budgets fail and either CI mode or failOnBudget is true
          expect(exitCode).toBe(1);
        }
        
        // Additional validation: exit code should be 0 or 1
        expect([0, 1]).toContain(exitCode);
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 9: Exit Code Behavior
  it("should consistently handle budget violations across different failure thresholds", () => {
    fc.assert(fc.property(
      fc.record({
        failureThreshold: fc.constantFrom("any", "majority", "all"),
        violationCount: fc.integer({ min: 0, max: 10 }),
        totalPages: fc.integer({ min: 1, max: 10 }),
        ciMode: fc.boolean()
      }),
      (testData) => {
        const { failureThreshold, violationCount, totalPages, ciMode } = testData;
        
        // Create mock budget result
        const budgetResult: BudgetResult = {
          passed: violationCount === 0,
          violations: Array(violationCount).fill(null).map((_, i) => ({
            pageLabel: `Page ${i}`,
            path: `/page-${i}`,
            device: "desktop" as const,
            kind: "category" as const,
            id: "performance",
            value: 50,
            limit: 80,
            severity: "warning" as const
          })),
          summary: {
            totalPages,
            failedPages: Math.min(violationCount, totalPages),
            criticalViolations: 0,
            warningViolations: violationCount
          }
        };
        
        const config: PerformanceBudgetConfig = {
          failureThreshold,
          categories: { performance: 80 }
        };
        
        const manager = new PerformanceBudgetManager(config);
        const exitCode = manager.getExitCode(budgetResult, ciMode, false);
        
        if (!ciMode) {
          expect(exitCode).toBe(0);
        } else {
          // Exit code should match budget result
          expect(exitCode).toBe(budgetResult.passed ? 0 : 1);
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 9: Exit Code Behavior
  it("should handle edge cases with empty audit results", () => {
    fc.assert(fc.property(
      fc.record({
        ciMode: fc.boolean(),
        failOnBudget: fc.boolean(),
        hasCategories: fc.boolean(),
        hasMetrics: fc.boolean()
      }),
      (testData) => {
        const { ciMode, failOnBudget, hasCategories, hasMetrics } = testData;
        
        const config: PerformanceBudgetConfig = {
          categories: hasCategories ? { performance: 80 } : undefined,
          metrics: hasMetrics ? { lcpMs: 2500 } : undefined,
          failureThreshold: "any"
        };
        
        const manager = new PerformanceBudgetManager(config);
        
        // Test with empty results
        const budgetResult = manager.evaluateBudgets([]);
        const exitCode = manager.getExitCode(budgetResult, ciMode, failOnBudget);
        
        // Empty results should always pass (no violations possible)
        expect(budgetResult.passed).toBe(true);
        expect(exitCode).toBe(0);
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 9: Exit Code Behavior
  it("should maintain consistent exit code behavior regardless of violation severity", () => {
    fc.assert(fc.property(
      fc.record({
        criticalCount: fc.integer({ min: 0, max: 5 }),
        warningCount: fc.integer({ min: 0, max: 5 }),
        ciMode: fc.boolean(),
        failOnBudget: fc.boolean()
      }),
      (testData) => {
        const { criticalCount, warningCount, ciMode, failOnBudget } = testData;
        const totalViolations = criticalCount + warningCount;
        
        const budgetResult: BudgetResult = {
          passed: totalViolations === 0,
          violations: [
            ...Array(criticalCount).fill(null).map((_, i) => ({
              pageLabel: `Critical Page ${i}`,
              path: `/critical-${i}`,
              device: "desktop" as const,
              kind: "category" as const,
              id: "performance",
              value: 30,
              limit: 80,
              severity: "critical" as const
            })),
            ...Array(warningCount).fill(null).map((_, i) => ({
              pageLabel: `Warning Page ${i}`,
              path: `/warning-${i}`,
              device: "mobile" as const,
              kind: "metric" as const,
              id: "lcpMs",
              value: 3000,
              limit: 2500,
              severity: "warning" as const
            }))
          ],
          summary: {
            totalPages: Math.max(1, totalViolations),
            failedPages: totalViolations > 0 ? 1 : 0,
            criticalViolations: criticalCount,
            warningViolations: warningCount
          }
        };
        
        const config: PerformanceBudgetConfig = { failureThreshold: "any" };
        const manager = new PerformanceBudgetManager(config);
        const exitCode = manager.getExitCode(budgetResult, ciMode, failOnBudget);
        
        // Exit code should depend on whether there are any violations, not their severity
        if (!ciMode && !failOnBudget) {
          expect(exitCode).toBe(0);
        } else {
          expect(exitCode).toBe(totalViolations > 0 ? 1 : 0);
        }
      }
    ), { numRuns: 100 });
  });
});