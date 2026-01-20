import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { MultiAuditAiOptimizer } from "../src/multi-audit-ai-optimizer.js";
import type { AuditType, Issue, IssueSeverity } from "../src/core/plugin-interface.js";

const MAX_JSON_LENGTH: number = 20000;

describe("Token Efficiency Maintenance", () => {
  it("should keep multi-audit AI report JSON size bounded as issue count scales", () => {
    const optimizer = new MultiAuditAiOptimizer();
    const auditTypeArb: fc.Arbitrary<AuditType> = fc.constantFrom("performance", "security", "accessibility", "code-quality", "ux");
    const severityArb: fc.Arbitrary<IssueSeverity> = fc.constantFrom("critical", "high", "medium", "low");
    fc.assert(
      fc.property(
        fc.record({
          issueCount: fc.integer({ min: 50, max: 500 }),
          type: auditTypeArb,
          severity: severityArb,
        }),
        ({ issueCount, type, severity }) => {
          const issues: readonly Issue[] = Array.from({ length: issueCount }, (_: unknown, index: number) => {
            const issue: Issue = {
              id: `shared-${index % 10}`,
              type,
              severity,
              impact: (index % 100) + 1,
              title: `Title ${index % 10}`,
              description: `Desc ${index % 10}`,
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
          const json: string = optimizer.buildReportJson({ issues });
          expect(json.length).toBeLessThanOrEqual(MAX_JSON_LENGTH);
        },
      ),
      { numRuns: 50 },
    );
  });
});
