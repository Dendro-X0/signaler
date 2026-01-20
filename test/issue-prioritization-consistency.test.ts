import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { ReportAggregator } from "../src/core/report-aggregator.js";
import type { AuditType, Issue, IssueSeverity } from "../src/core/plugin-interface.js";

type ScoredIssue = {
  readonly issue: Issue;
  readonly score: number;
};

const severityWeights: Readonly<Record<IssueSeverity, number>> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

function calculateScore(params: { readonly severity: IssueSeverity; readonly impact: number }): number {
  const { severity, impact } = params;
  return severityWeights[severity] * 1000 + impact;
}

describe("Issue Prioritization Consistency", () => {
  it("should sort by severity/impact deterministically", () => {
    const aggregator = new ReportAggregator();
    const auditTypeArb: fc.Arbitrary<AuditType> = fc.constantFrom("performance", "security", "accessibility", "code-quality", "ux");
    const severityArb: fc.Arbitrary<IssueSeverity> = fc.constantFrom("critical", "high", "medium", "low");
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }).filter((s: string) => /^[a-zA-Z0-9-_]+$/.test(s)),
            type: auditTypeArb,
            severity: severityArb,
            impact: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1, maxLength: 30 },
        ),
        (raw) => {
          const issues: readonly Issue[] = raw.map((r, index: number) => {
            const issue: Issue = {
              id: `${r.id}-${index}`,
              type: r.type,
              severity: r.severity,
              impact: r.impact,
              title: "T",
              description: "D",
              affectedPages: ["/"],
              fixGuidance: {
                difficulty: "easy",
                estimatedTime: "1h",
                implementation: "Do a thing",
                resources: [],
              },
            };
            return issue;
          });
          const prioritized = aggregator.prioritizeIssues({ issues });
          const expected: readonly ScoredIssue[] = issues
            .map((issue: Issue): ScoredIssue => ({ issue, score: calculateScore({ severity: issue.severity, impact: issue.impact }) }))
            .sort((a: ScoredIssue, b: ScoredIssue) => {
              if (b.score !== a.score) {
                return b.score - a.score;
              }
              return a.issue.id.localeCompare(b.issue.id);
            });
          expect(prioritized.length).toBe(expected.length);
          for (let i = 0; i < expected.length; i++) {
            expect(prioritized[i]?.issue.id).toBe(expected[i]?.issue.id);
          }
          for (let i = 1; i < prioritized.length; i++) {
            const prev = prioritized[i - 1] as { readonly issue: Issue; readonly priorityScore: number };
            const curr = prioritized[i] as { readonly issue: Issue; readonly priorityScore: number };
            expect(prev.priorityScore).toBeGreaterThanOrEqual(curr.priorityScore);
            if (prev.priorityScore === curr.priorityScore) {
              expect(prev.issue.id.localeCompare(curr.issue.id)).toBeLessThanOrEqual(0);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
