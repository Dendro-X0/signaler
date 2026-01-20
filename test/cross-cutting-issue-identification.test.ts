import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { ReportAggregator } from "../src/core/report-aggregator.js";
import type { AuditType, Issue, IssueSeverity } from "../src/core/plugin-interface.js";

type SharedIssueSeed = {
  readonly id: string;
  readonly types: readonly AuditType[];
  readonly severity: IssueSeverity;
  readonly impact: number;
};

describe("Cross-Cutting Issue Identification", () => {
  it("should identify issues that appear across multiple audit types", () => {
    const aggregator = new ReportAggregator();
    const auditTypeArb: fc.Arbitrary<AuditType> = fc.constantFrom("performance", "security", "accessibility", "code-quality", "ux");
    const severityArb: fc.Arbitrary<IssueSeverity> = fc.constantFrom("critical", "high", "medium", "low");
    fc.assert(
      fc.property(
        fc.record({
          shared: fc.array(
            fc.record({
              id: fc.string({ minLength: 2, maxLength: 10 }).filter((s: string) => /^[a-zA-Z0-9-_]+$/.test(s)),
              types: fc.set(auditTypeArb, { minLength: 2, maxLength: 3 }),
              severity: severityArb,
              impact: fc.integer({ min: 1, max: 100 }),
            }) as fc.Arbitrary<SharedIssueSeed>,
            { minLength: 1, maxLength: 5 },
          ),
          singletons: fc.array(
            fc.record({
              id: fc.string({ minLength: 2, maxLength: 10 }).filter((s: string) => /^[a-zA-Z0-9-_]+$/.test(s)),
              type: auditTypeArb,
              severity: severityArb,
              impact: fc.integer({ min: 1, max: 100 }),
            }),
            { minLength: 0, maxLength: 5 },
          ),
        }),
        ({ shared, singletons }) => {
          const issues: Issue[] = [];
          for (const s of shared) {
            for (const t of s.types) {
              issues.push({
                id: s.id,
                type: t,
                severity: s.severity,
                impact: s.impact,
                title: `Title ${s.id}`,
                description: `Desc ${s.id}`,
                affectedPages: ["/"],
                fixGuidance: {
                  difficulty: "easy",
                  estimatedTime: "1h",
                  implementation: "Do a thing",
                  resources: [],
                },
              });
            }
          }
          for (const s of singletons) {
            issues.push({
              id: `${s.id}-singleton-${issues.length}`,
              type: s.type,
              severity: s.severity,
              impact: s.impact,
              title: `Title ${s.id}`,
              description: `Desc ${s.id}`,
              affectedPages: ["/"],
              fixGuidance: {
                difficulty: "easy",
                estimatedTime: "1h",
                implementation: "Do a thing",
                resources: [],
              },
            });
          }
          const crossCutting = aggregator.identifyCrossCuttingIssues({ issues });
          for (const s of shared) {
            const entry = crossCutting.find((c) => c.id === s.id);
            expect(entry).toBeDefined();
            const presentTypes = new Set(entry?.types ?? []);
            for (const t of s.types) {
              expect(presentTypes.has(t)).toBe(true);
            }
          }
          for (const s of singletons) {
            const matches = crossCutting.filter((c) => c.id.startsWith(`${s.id}-singleton-`));
            expect(matches.length).toBe(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
