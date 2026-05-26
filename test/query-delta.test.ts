import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDeltaProjection } from "../src/query-delta.js";

describe("query-delta", () => {
  it("compares performance triage between baseline and compare dirs", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-delta-"));
    try {
      const baselineDir = resolve(root, "baseline");
      const compareDir = resolve(root, "compare");
      await mkdir(baselineDir, { recursive: true });
      await mkdir(compareDir, { recursive: true });
      const triageBase = {
        generatedAt: new Date().toISOString(),
        contractVersion: "v3",
        reportingModel: "issue-count",
        comparabilityHash: "cmp-1",
        mode: "throughput",
        options: { includeYellow: false },
        disclaimer: "test",
        categoryScores: { note: "test" },
      };
      await writeFile(
        resolve(baselineDir, "run.json"),
        JSON.stringify({
          schemaVersion: 1,
          protocol: { comparabilityHash: "cmp-1", mode: "throughput" },
        }),
        "utf8",
      );
      await writeFile(
        resolve(compareDir, "run.json"),
        JSON.stringify({
          schemaVersion: 1,
          protocol: { comparabilityHash: "cmp-1", mode: "throughput" },
        }),
        "utf8",
      );
      await writeFile(
        resolve(baselineDir, "performance-triage.json"),
        JSON.stringify({
          ...triageBase,
          totals: { red: 4, yellow: 1, green: 0, actionable: 5 },
          uniqueIssues: [],
        }),
        "utf8",
      );
      await writeFile(
        resolve(compareDir, "performance-triage.json"),
        JSON.stringify({
          ...triageBase,
          totals: { red: 2, yellow: 0, green: 0, actionable: 2 },
          uniqueIssues: [],
        }),
        "utf8",
      );

      const projection = await buildDeltaProjection({
        dir: baselineDir,
        baselineDir,
        compareDir,
      });
      expect(projection.view).toBe("delta");
      expect(projection.performance?.delta.actionable).toBe(-3);
      expect(projection.comparability?.matched).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
