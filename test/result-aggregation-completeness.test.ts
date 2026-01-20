import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { ResultCollector } from "../src/core/result-collector.js";
import type { AuditPlugin, AuditResult, AuditType, Issue, IssueSeverity, PluginConfig } from "../src/core/plugin-interface.js";

type PluginSpec = {
  readonly name: string;
  readonly version: string;
  readonly type: AuditType;
  readonly phase: 1 | 2 | 3;
};

describe("Result Aggregation Completeness", () => {
  it("should preserve all plugin outputs and metadata in unified page results", () => {
    const collector = new ResultCollector();
    const pluginSpecArb: fc.Arbitrary<PluginSpec> = fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }).filter((s: string) => /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(s)),
      version: fc.string({ minLength: 1, maxLength: 10 }),
      type: fc.constantFrom("performance", "security", "accessibility", "code-quality", "ux") as fc.Arbitrary<AuditType>,
      phase: fc.constantFrom(1, 2, 3) as fc.Arbitrary<1 | 2 | 3>,
    });
    const issueSeverityArb: fc.Arbitrary<IssueSeverity> = fc.constantFrom("critical", "high", "medium", "low");

    fc.assert(
      fc.property(
        fc.record({
          plugins: fc.array(pluginSpecArb, { minLength: 1, maxLength: 5 }),
          issuesPerPlugin: fc.integer({ min: 0, max: 4 }),
          impact: fc.integer({ min: 1, max: 100 }),
          severity: issueSeverityArb,
        }),
        ({ plugins, issuesPerPlugin, impact, severity }) => {
          const normalizedPlugins: readonly PluginSpec[] = plugins.map((spec: PluginSpec, index: number) => ({
            ...spec,
            name: `${spec.name}-${index}`,
          }));
          const auditPlugins: readonly AuditPlugin[] = normalizedPlugins.map((spec: PluginSpec) => {
            const plugin: AuditPlugin = {
              name: spec.name,
              version: spec.version,
              type: spec.type,
              phase: spec.phase,
              dependencies: [],
              async configure(_config: PluginConfig): Promise<void> {
                return;
              },
              async audit(): Promise<AuditResult> {
                return {
                  pluginName: spec.name,
                  type: spec.type,
                  issues: [],
                  metrics: {},
                  metadata: {},
                  executionTimeMs: 0,
                  success: true,
                };
              },
              async cleanup(): Promise<void> {
                return;
              },
              validate(_config: PluginConfig): boolean {
                return true;
              },
            };
            return plugin;
          });
          const pluginResults: Record<string, AuditResult> = {};
          for (const plugin of auditPlugins) {
            const issues: Issue[] = Array.from({ length: issuesPerPlugin }, (_: unknown, idx: number) => {
              const issue: Issue = {
                id: `${plugin.name}-issue-${idx}`,
                type: plugin.type,
                severity,
                impact,
                title: `Issue ${idx}`,
                description: `Issue ${idx} description`,
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
            const result: AuditResult = {
              pluginName: plugin.name,
              type: plugin.type,
              issues,
              metrics: { [`metric_${plugin.name}`]: impact },
              metadata: { plugin: plugin.name, version: plugin.version },
              executionTimeMs: 123,
              success: true,
            };
            pluginResults[plugin.name] = result;
          }
          const collected = collector.collectPageResult({
            page: { path: "/", label: "Home", devices: ["desktop"], scope: "public" },
            device: "desktop",
            url: "https://example.com/",
            plugins: auditPlugins,
            pluginResults,
            executionMeta: { startTime: 1, endTime: 2, totalExecutionMs: 1 },
          });
          expect(collected.validation.isValid).toBe(true);
          expect(collected.validation.errors.length).toBe(0);
          const expectedIssueCount: number = auditPlugins.length * issuesPerPlugin;
          expect(collected.allIssues.length).toBe(expectedIssueCount);
          for (const plugin of auditPlugins) {
            const original: AuditResult = pluginResults[plugin.name];
            const roundTrip: AuditResult | undefined = collected.pluginResults[plugin.name];
            expect(roundTrip).toBeDefined();
            expect(roundTrip?.metadata).toEqual(original.metadata);
          }
          const expectedMetricCount: number = auditPlugins.length;
          expect(Object.keys(collected.combinedMetrics).length).toBe(expectedMetricCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should report validation errors when plugin results are missing", () => {
    const collector = new ResultCollector();
    const plugin: AuditPlugin = {
      name: "plugin-a",
      version: "1.0.0",
      type: "performance",
      phase: 1,
      dependencies: [],
      async configure(_config: PluginConfig): Promise<void> {
        return;
      },
      async audit(): Promise<AuditResult> {
        return {
          pluginName: "plugin-a",
          type: "performance",
          issues: [],
          metrics: {},
          metadata: {},
          executionTimeMs: 0,
          success: true,
        };
      },
      async cleanup(): Promise<void> {
        return;
      },
      validate(_config: PluginConfig): boolean {
        return true;
      },
    };

    const collected = collector.collectPageResult({
      page: { path: "/", label: "Home", devices: ["desktop"], scope: "public" },
      device: "desktop",
      url: "https://example.com/",
      plugins: [plugin],
      pluginResults: {},
      executionMeta: { startTime: 1, endTime: 2, totalExecutionMs: 1 },
    });
    expect(collected.validation.isValid).toBe(false);
    expect(collected.validation.errors.length).toBeGreaterThan(0);
  });
});
