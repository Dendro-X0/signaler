import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { MultiAuditAiOptimizer } from "../src/multi-audit-ai-optimizer.js";
import type { AuditType, Issue, IssueSeverity } from "../src/core/plugin-interface.js";

describe("AI Report Completeness", () => {
  it("should cover all enabled audit types and preserve per-type issue counts", () => {
    const optimizer = new MultiAuditAiOptimizer();
    const auditTypeArb: fc.Arbitrary<AuditType> = fc.constantFrom("performance", "security", "accessibility", "code-quality", "ux");
    const severityArb: fc.Arbitrary<IssueSeverity> = fc.constantFrom("critical", "high", "medium", "low");
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 12 }).filter((s: string) => /^[a-zA-Z0-9-_]+$/.test(s)),
            type: auditTypeArb,
            severity: severityArb,
            impact: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1, maxLength: 80 },
        ),
        (raw) => {
          const issues: readonly Issue[] = raw.map((r, index: number) => {
            const issue: Issue = {
              id: `${r.id}-${index}`,
              type: r.type,
              severity: r.severity,
              impact: r.impact,
              title: `Title ${r.id}`,
              description: `Desc ${r.id}`,
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
          const report = optimizer.buildReport({ issues });
          const expectedTypes: readonly AuditType[] = [...new Set(issues.map((i: Issue) => i.type))].sort(
            (a: AuditType, b: AuditType) => a.localeCompare(b),
          );
          expect(report.meta.enabledAuditTypes).toEqual(expectedTypes);
          for (const type of expectedTypes) {
            const section = report.sections.find((s) => s.type === type);
            expect(section).toBeDefined();
            const count: number = issues.filter((i: Issue) => i.type === type).length;
            expect(section?.totals.issueCount).toBe(count);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
