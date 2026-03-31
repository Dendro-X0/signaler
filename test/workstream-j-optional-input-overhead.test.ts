import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseArgs,
  type EvidenceReport,
  writeOptionalInputOverheadEvidence,
} from "../benchmarks/workstream-j/optional-input-overhead.js";

describe("workstream-j optional-input overhead evidence", () => {
  it("parses cli args for workspace and outputs", () => {
    const parsed = parseArgs([
      "--workspace",
      "benchmarks/workspaces/ws-j-overhead",
      "--out-json",
      "benchmarks/out/ws-j-overhead.json",
      "--out-md",
      "benchmarks/out/ws-j-overhead.md",
      "--iterations",
      "3",
      "--max-median-overhead-ms",
      "42",
      "--max-p95-overhead-ms",
      "84",
    ]);
    expect(parsed.workspaceDir.toLowerCase()).toContain("ws-j-overhead");
    expect(parsed.outJsonPath.toLowerCase()).toContain("ws-j-overhead.json");
    expect(parsed.outMarkdownPath.toLowerCase()).toContain("ws-j-overhead.md");
    expect(parsed.iterations).toBe(3);
    expect(parsed.maxMedianOverheadMs).toBe(42);
    expect(parsed.maxP95OverheadMs).toBe(84);
  });

  it("writes overhead evidence with benchmark metadata and timing stats", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-workstream-j-overhead-"));
    const workspaceDir = resolve(root, "workspace");
    const outJsonPath = resolve(root, "workstream-j-optional-input-overhead.json");
    const outMarkdownPath = resolve(root, "workstream-j-optional-input-overhead.md");
    try {
      const report = await writeOptionalInputOverheadEvidence({
        workspaceDir,
        outJsonPath,
        outMarkdownPath,
        iterations: 2,
        maxMedianOverheadMs: 150,
        maxP95OverheadMs: 250,
      });

      expect(report.schemaVersion).toBe(1);
      expect(report.iterations).toBe(2);
      expect(report.cases.baseline.elapsedMs.samples.length).toBe(2);
      expect(report.cases.benchmark.elapsedMs.samples.length).toBe(2);
      expect(report.cases.baseline.multiBenchmark.enabled).toBe(false);
      expect(report.cases.benchmark.multiBenchmark.enabled).toBe(true);
      expect(report.cases.benchmark.multiBenchmark.accepted).toBeGreaterThan(0);

      const raw = await readFile(outJsonPath, "utf8");
      const parsed = JSON.parse(raw) as EvidenceReport;
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.cases.benchmark.multiBenchmark.accepted).toBeGreaterThan(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 180_000);
});
