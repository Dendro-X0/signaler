import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { ReportGeneratorEngine, type ReportGeneratorConfig, type ProcessedAuditData } from "../src/reporting/generators/report-generator-engine.js";
import type { AuditResult } from "../src/core/audit-engine.js";

describe("Report File Generation", () => {
  // Feature: signaler-reporting-improvements, Property 4: Report File Generation
  it("should generate all required report files with valid structure and content", () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        pages: fc.array(fc.record({
          label: fc.string({ minLength: 1, maxLength: 50 }),
          path: fc.webPath(),
          device: fc.constantFrom('desktop', 'mobile'),
          scores: fc.record({
            performance: fc.integer({ min: 0, max: 100 }),
            accessibility: fc.integer({ min: 0, max: 100 }),
            bestPractices: fc.integer({ min: 0, max: 100 }),
            seo: fc.integer({ min: 0, max: 100 })
          }),
          metrics: fc.record({
            lcpMs: fc.integer({ min: 0, max: 10000 }),
            fcpMs: fc.integer({ min: 0, max: 5000 }),
            tbtMs: fc.integer({ min: 0, max: 2000 }),
            cls: fc.float({ min: 0, max: 1 })
          }),
          issues: fc.array(fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1 }),
            description: fc.string(),
            severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
            category: fc.constantFrom('javascript', 'css', 'images', 'caching', 'network'),
            affectedResources: fc.array(fc.record({
              url: fc.webUrl(),
              type: fc.string(),
              size: fc.integer({ min: 0, max: 1000000 })
            })),
            estimatedSavings: fc.record({
              timeMs: fc.integer({ min: 0, max: 5000 }),
              bytes: fc.integer({ min: 0, max: 1000000 })
            }),
            fixRecommendations: fc.array(fc.record({
              action: fc.string({ minLength: 1 }),
              implementation: fc.record({
                difficulty: fc.constantFrom('easy', 'medium', 'hard'),
                estimatedTime: fc.string({ minLength: 1 }),
                codeExample: fc.option(fc.string()),
                documentation: fc.array(fc.webUrl())
              }),
              framework: fc.option(fc.constantFrom('nextjs', 'react', 'vue', 'angular'))
            }))
          })),
          opportunities: fc.array(fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1 }),
            description: fc.string(),
            estimatedSavings: fc.record({
              timeMs: fc.integer({ min: 0, max: 5000 }),
              bytes: fc.integer({ min: 0, max: 1000000 })
            })
          }))
        }), { minLength: 1, maxLength: 10 }),
        globalIssues: fc.array(fc.record({
          type: fc.string({ minLength: 1 }),
          affectedPages: fc.array(fc.webPath(), { minLength: 1 }),
          severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
          description: fc.string()
        })),
        performanceMetrics: fc.record({
          averagePerformanceScore: fc.integer({ min: 0, max: 100 }),
          totalPages: fc.integer({ min: 1, max: 100 }),
          criticalIssuesCount: fc.integer({ min: 0, max: 50 }),
          estimatedTotalSavings: fc.integer({ min: 0, max: 100000 })
        }),
        auditMetadata: fc.record({
          configPath: fc.string(),
          startedAt: fc.integer({ min: 1577836800000, max: Date.now() }).map(ts => new Date(ts).toISOString()),
          completedAt: fc.integer({ min: 1577836800000, max: Date.now() }).map(ts => new Date(ts).toISOString()),
          elapsedMs: fc.integer({ min: 1000, max: 300000 }),
          totalPages: fc.integer({ min: 1, max: 100 }),
          totalRunners: fc.integer({ min: 1, max: 10 })
        })
      }),
      async (processedData) => {
        const config: ReportGeneratorConfig = {
          outputFormats: ['json', 'markdown', 'html', 'csv'],
          includeScreenshots: false,
          maxIssuesPerReport: 50,
          tokenOptimization: true,
          streamingThreshold: 20
        };

        const engine = new ReportGeneratorEngine(config);

        // Test developer reports generation
        const developerReports = await engine.generateDeveloperReports(processedData);
        
        // Verify QUICK-FIXES.md is generated
        expect(developerReports.quickFixes).toBeDefined();
        expect(typeof developerReports.quickFixes).toBe('string');
        expect(developerReports.quickFixes.length).toBeGreaterThan(0);

        // Verify triage.md is generated
        expect(developerReports.triage).toBeDefined();
        expect(typeof developerReports.triage).toBe('string');
        expect(developerReports.triage.length).toBeGreaterThan(0);

        // Verify overview.md is generated
        expect(developerReports.overview).toBeDefined();
        expect(typeof developerReports.overview).toBe('string');
        expect(developerReports.overview.length).toBeGreaterThan(0);

        // Test AI reports generation
        const aiReports = await engine.generateAIReports(processedData);
        
        // Verify AI-ANALYSIS.json is generated
        expect(aiReports.analysis).toBeDefined();
        expect(typeof aiReports.analysis).toBe('string');
        expect(aiReports.analysis.length).toBeGreaterThan(0);
        
        // Verify it's valid JSON
        expect(() => JSON.parse(aiReports.analysis)).not.toThrow();

        // Verify structured-issues.json is generated
        expect(aiReports.structuredIssues).toBeDefined();
        expect(typeof aiReports.structuredIssues).toBe('string');
        expect(aiReports.structuredIssues.length).toBeGreaterThan(0);
        
        // Verify it's valid JSON
        expect(() => JSON.parse(aiReports.structuredIssues)).not.toThrow();

        // Test executive reports generation
        const executiveReports = await engine.generateExecutiveReports(processedData);
        
        // Verify DASHBOARD.md is generated
        expect(executiveReports.dashboard).toBeDefined();
        expect(typeof executiveReports.dashboard).toBe('string');
        expect(executiveReports.dashboard.length).toBeGreaterThan(0);

        // Verify performance-summary.json is generated
        expect(executiveReports.performanceSummary).toBeDefined();
        expect(typeof executiveReports.performanceSummary).toBe('string');
        expect(executiveReports.performanceSummary.length).toBeGreaterThan(0);
        
        // Verify it's valid JSON
        expect(() => JSON.parse(executiveReports.performanceSummary)).not.toThrow();
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 4: Report File Generation
  it("should generate reports with consistent structure across different data sizes", () => {
    fc.assert(fc.asyncProperty(
      fc.integer({ min: 1, max: 50 }).chain(pageCount => 
        fc.record({
          pageCount: fc.constant(pageCount),
          pages: fc.array(fc.record({
            label: fc.string({ minLength: 1, maxLength: 20 }),
            path: fc.webPath(),
            device: fc.constantFrom('desktop', 'mobile'),
            scores: fc.record({
              performance: fc.integer({ min: 0, max: 100 }),
              accessibility: fc.integer({ min: 0, max: 100 }),
              bestPractices: fc.integer({ min: 0, max: 100 }),
              seo: fc.integer({ min: 0, max: 100 })
            }),
            metrics: fc.record({
              lcpMs: fc.integer({ min: 0, max: 10000 }),
              fcpMs: fc.integer({ min: 0, max: 5000 }),
              tbtMs: fc.integer({ min: 0, max: 2000 }),
              cls: fc.float({ min: 0, max: 1 })
            }),
            issues: fc.array(fc.record({
              id: fc.string({ minLength: 1 }),
              title: fc.string({ minLength: 1 }),
              description: fc.string(),
              severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
              category: fc.constantFrom('javascript', 'css', 'images', 'caching', 'network'),
              affectedResources: fc.array(fc.record({
                url: fc.webUrl(),
                type: fc.string(),
                size: fc.integer({ min: 0, max: 1000000 })
              })),
              estimatedSavings: fc.record({
                timeMs: fc.integer({ min: 0, max: 5000 }),
                bytes: fc.integer({ min: 0, max: 1000000 })
              }),
              fixRecommendations: fc.array(fc.record({
                action: fc.string({ minLength: 1 }),
                implementation: fc.record({
                  difficulty: fc.constantFrom('easy', 'medium', 'hard'),
                  estimatedTime: fc.string({ minLength: 1 }),
                  codeExample: fc.option(fc.string()),
                  documentation: fc.array(fc.webUrl())
                }),
                framework: fc.option(fc.constantFrom('nextjs', 'react', 'vue', 'angular'))
              }))
            })),
            opportunities: fc.array(fc.record({
              id: fc.string({ minLength: 1 }),
              title: fc.string({ minLength: 1 }),
              description: fc.string(),
              estimatedSavings: fc.record({
                timeMs: fc.integer({ min: 0, max: 5000 }),
                bytes: fc.integer({ min: 0, max: 1000000 })
              })
            }))
          }), { minLength: pageCount, maxLength: pageCount }),
          globalIssues: fc.array(fc.record({
            type: fc.string({ minLength: 1 }),
            affectedPages: fc.array(fc.webPath(), { minLength: 1 }),
            severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
            description: fc.string()
          })),
          performanceMetrics: fc.record({
            averagePerformanceScore: fc.integer({ min: 0, max: 100 }),
            totalPages: fc.constant(pageCount),
            criticalIssuesCount: fc.integer({ min: 0, max: 50 }),
            estimatedTotalSavings: fc.integer({ min: 0, max: 100000 })
          }),
          auditMetadata: fc.record({
            configPath: fc.string(),
            startedAt: fc.integer({ min: 1577836800000, max: Date.now() }).map(ts => new Date(ts).toISOString()),
            completedAt: fc.integer({ min: 1577836800000, max: Date.now() }).map(ts => new Date(ts).toISOString()),
            elapsedMs: fc.integer({ min: 1000, max: 300000 }),
            totalPages: fc.constant(pageCount),
            totalRunners: fc.integer({ min: 1, max: 10 })
          })
        })
      ),
      async (data) => {
        const config: ReportGeneratorConfig = {
          outputFormats: ['json', 'markdown'],
          includeScreenshots: false,
          maxIssuesPerReport: 50,
          tokenOptimization: true,
          streamingThreshold: 20
        };

        const engine = new ReportGeneratorEngine(config);

        // Generate reports for different data sizes
        const developerReports = await engine.generateDeveloperReports(data);
        const aiReports = await engine.generateAIReports(data);
        const executiveReports = await engine.generateExecutiveReports(data);

        // Verify all reports are generated regardless of data size
        expect(developerReports.quickFixes).toBeDefined();
        expect(developerReports.triage).toBeDefined();
        expect(developerReports.overview).toBeDefined();
        expect(aiReports.analysis).toBeDefined();
        expect(aiReports.structuredIssues).toBeDefined();
        expect(executiveReports.dashboard).toBeDefined();
        expect(executiveReports.performanceSummary).toBeDefined();

        // Verify reports contain data proportional to input size
        const parsedAI = JSON.parse(aiReports.analysis);
        const parsedSummary = JSON.parse(executiveReports.performanceSummary);
        
        // The reports should reflect the actual page count
        expect(parsedSummary.metadata.totalPages).toBe(data.pageCount);
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 4: Report File Generation
  it("should handle empty or minimal data gracefully", () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        pages: fc.array(fc.record({
          label: fc.string({ minLength: 1, maxLength: 10 }),
          path: fc.webPath(),
          device: fc.constantFrom('desktop', 'mobile'),
          scores: fc.record({
            performance: fc.integer({ min: 0, max: 100 }),
            accessibility: fc.integer({ min: 0, max: 100 }),
            bestPractices: fc.integer({ min: 0, max: 100 }),
            seo: fc.integer({ min: 0, max: 100 })
          }),
          metrics: fc.record({
            lcpMs: fc.integer({ min: 0, max: 10000 }),
            fcpMs: fc.integer({ min: 0, max: 5000 }),
            tbtMs: fc.integer({ min: 0, max: 2000 }),
            cls: fc.float({ min: 0, max: 1 })
          }),
          issues: fc.constant([]), // Empty issues array
          opportunities: fc.constant([]) // Empty opportunities array
        }), { minLength: 1, maxLength: 3 }),
        globalIssues: fc.constant([]), // Empty global issues
        performanceMetrics: fc.record({
          averagePerformanceScore: fc.integer({ min: 0, max: 100 }),
          totalPages: fc.integer({ min: 1, max: 3 }),
          criticalIssuesCount: fc.constant(0), // No critical issues
          estimatedTotalSavings: fc.constant(0) // No savings
        }),
        auditMetadata: fc.record({
          configPath: fc.string(),
          startedAt: fc.integer({ min: 1577836800000, max: Date.now() }).map(ts => new Date(ts).toISOString()),
          completedAt: fc.integer({ min: 1577836800000, max: Date.now() }).map(ts => new Date(ts).toISOString()),
          elapsedMs: fc.integer({ min: 1000, max: 300000 }),
          totalPages: fc.integer({ min: 1, max: 3 }),
          totalRunners: fc.integer({ min: 1, max: 10 })
        })
      }),
      async (minimalData) => {
        const config: ReportGeneratorConfig = {
          outputFormats: ['json', 'markdown'],
          includeScreenshots: false,
          maxIssuesPerReport: 50,
          tokenOptimization: true,
          streamingThreshold: 20
        };

        const engine = new ReportGeneratorEngine(config);

        // Should not throw errors with minimal data
        const developerReports = await engine.generateDeveloperReports(minimalData);
        const aiReports = await engine.generateAIReports(minimalData);
        const executiveReports = await engine.generateExecutiveReports(minimalData);

        // All reports should still be generated
        expect(developerReports.quickFixes).toBeDefined();
        expect(developerReports.triage).toBeDefined();
        expect(developerReports.overview).toBeDefined();
        expect(aiReports.analysis).toBeDefined();
        expect(aiReports.structuredIssues).toBeDefined();
        expect(executiveReports.dashboard).toBeDefined();
        expect(executiveReports.performanceSummary).toBeDefined();

        // Reports should be valid even with no issues
        expect(() => JSON.parse(aiReports.analysis)).not.toThrow();
        expect(() => JSON.parse(aiReports.structuredIssues)).not.toThrow();
        expect(() => JSON.parse(executiveReports.performanceSummary)).not.toThrow();
      }
    ), { numRuns: 100 });
  });
});