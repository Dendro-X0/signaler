import { describe, expect, it } from "vitest";
import { EnhancedTriageGenerator } from "../src/reporting/generators/enhanced-triage-generator.ts";
import type { ProcessedAuditData } from "../src/reporting/processors/raw-results-processor.ts";

describe("EnhancedTriageGenerator", () => {
    it("should correctly categorize and report non-performance issues", async () => {
        const generator = new EnhancedTriageGenerator();
        const mockData: ProcessedAuditData = {
            pages: [
                {
                    label: "Test Page",
                    path: "/test",
                    device: "desktop",
                    scores: { performance: 50, accessibility: 50, bestPractices: 50, seo: 50 },
                    metrics: { lcpMs: 3000, fcpMs: 2000, tbtMs: 500, cls: 0.2 },
                    issues: [
                        {
                            id: "aria-allowed-attr",
                            title: "ARIA attributes must be allowed for an element's role",
                            description: "Elements must have allowed ARIA attributes",
                            severity: "critical",
                            category: "accessibility",
                            affectedResources: [],
                            estimatedSavings: { timeMs: 0, bytes: 0 },
                            fixRecommendations: [
                                {
                                    action: "Fix ARIA attributes",
                                    implementation: {
                                        difficulty: "easy",
                                        estimatedTime: "10m",
                                        codeExample: "...",
                                        documentation: []
                                    }
                                }
                            ]
                        },
                        {
                            id: "meta-description",
                            title: "Document does not have a meta description",
                            description: "Meta descriptions are important for SEO",
                            severity: "high",
                            category: "seo",
                            affectedResources: [],
                            estimatedSavings: { timeMs: 0, bytes: 0 },
                            fixRecommendations: []
                        },
                        {
                            id: "doctype",
                            title: "Page lacks the HTML doctype",
                            description: "Best practices require a doctype",
                            severity: "medium",
                            category: "best-practices",
                            affectedResources: [],
                            estimatedSavings: { timeMs: 0, bytes: 0 },
                            fixRecommendations: []
                        }
                    ],
                    opportunities: []
                }
            ],
            globalIssues: [],
            performanceMetrics: {
                averagePerformanceScore: 50,
                totalPages: 1,
                criticalIssuesCount: 1,
                estimatedTotalSavings: 0,
                averageScores: { performance: 50, accessibility: 50, bestPractices: 50, seo: 50 },
                auditDuration: 5000,
                disclaimer: "Test disclaimer"
            },
            auditMetadata: {
                configPath: "test.json",
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                elapsedMs: 5000,
                totalPages: 1,
                totalRunners: 1,
                throttlingMethod: "simulate",
                cpuSlowdownMultiplier: 4
            }
        };

        const report = await generator.generate(mockData);

        // Check for category mentions in detailed analysis
        expect(report).toContain("**Category:** accessibility");
        expect(report).toContain("**Category:** seo");
        expect(report).toContain("**Category:** best-practices");

        // Check for category emojis
        expect(report).toContain("♿");
        expect(report).toContain("🔍");
        expect(report).toContain("⭐");

        // Check for specific issues
        expect(report).toContain("ARIA attributes must be allowed for an element's role");
        expect(report).toContain("Document does not have a meta description");
        expect(report).toContain("Page lacks the HTML doctype");
    });
});
