import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { MultiBenchmarkSignalsLoaded } from "../src/multi-benchmark-signals.js";
import {
  parseArgs,
  type EvidenceReport,
  writeRustBenchmarkNormalizerPerfEvidence,
} from "../benchmarks/workstream-k/rust-benchmark-normalizer-perf.js";

function buildLoadedFixture(): MultiBenchmarkSignalsLoaded {
  return {
    inputFiles: ["/tmp/a.json", "/tmp/b.json"],
    sourceIds: ["accessibility-extended", "security-baseline"],
    records: [
      {
        sourceId: "accessibility-extended",
        collectedAt: "2026-03-25T00:00:00.000Z",
        collectedAtMs: Date.parse("2026-03-25T00:00:00.000Z"),
        id: "a11y-1",
        target: { issueId: "unused-javascript", path: "/", device: "mobile" },
        confidence: "high",
        evidence: [{ sourceRelPath: "fixtures/a11y.json", pointer: "/sources/0/records/0" }],
        metrics: { wcagViolationCount: 3, seriousViolationCount: 1 },
      },
      {
        sourceId: "security-baseline",
        collectedAt: "2026-03-26T00:00:00.000Z",
        collectedAtMs: Date.parse("2026-03-26T00:00:00.000Z"),
        id: "sec-1",
        target: { issueId: "server-response-time", path: "/docs", device: "desktop" },
        confidence: "high",
        evidence: [{ sourceRelPath: "fixtures/security.json", pointer: "/sources/0/records/0" }],
        metrics: { missingHeaderCount: 2, mixedContentCount: 1 },
      },
    ],
  };
}

describe("workstream-k rust benchmark normalizer perf evidence", () => {
  it("parses cli args for records and output paths", () => {
    const parsed = parseArgs([
      "--workspace",
      "benchmarks/workspaces/ws-k-benchmark",
      "--out-json",
      "benchmarks/out/ws-k-benchmark.json",
      "--out-md",
      "benchmarks/out/ws-k-benchmark.md",
      "--iterations",
      "3",
      "--records-per-source",
      "48",
    ]);
    expect(parsed.workspaceDir.toLowerCase()).toContain("ws-k-benchmark");
    expect(parsed.outJsonPath.toLowerCase()).toContain("ws-k-benchmark.json");
    expect(parsed.outMarkdownPath.toLowerCase()).toContain("ws-k-benchmark.md");
    expect(parsed.iterations).toBe(3);
    expect(parsed.recordsPerSource).toBe(48);
  });

  it("writes deterministic evidence with parity assertions", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-workstream-k-benchmark-"));
    const workspaceDir = resolve(root, "workspace");
    const outJsonPath = resolve(root, "workstream-k-rust-benchmark-normalizer-perf.json");
    const outMarkdownPath = resolve(root, "workstream-k-rust-benchmark-normalizer-perf.md");
    const loaded = buildLoadedFixture();
    const nowSamples = [0, 8, 10, 22, 30, 37, 50, 59];
    let nowCursor = 0;
    try {
      const report = await writeRustBenchmarkNormalizerPerfEvidence(
        {
          workspaceDir,
          outJsonPath,
          outMarkdownPath,
          iterations: 2,
          recordsPerSource: 8,
        },
        {
          now: () => {
            const value = nowSamples[nowCursor] ?? nowSamples[nowSamples.length - 1] ?? 0;
            nowCursor += 1;
            return value;
          },
          loadNode: async () => loaded,
          loadRust: async () => ({
            requested: true,
            enabled: true,
            used: true,
            loaded,
            sidecarElapsedMs: 4,
            sidecarCommand: "normalize-benchmark",
            normalizeStats: { recordsCount: loaded.records.length },
          }),
        },
      );

      expect(report.schemaVersion).toBe(1);
      expect(report.status).toBe("pass");
      expect(report.iterations).toBe(2);
      expect(report.cases.node.elapsedMs.samples.length).toBe(2);
      expect(report.cases.rust.elapsedMs.samples.length).toBe(2);
      expect(report.assertions.nodeOutputStable).toBe(true);
      expect(report.assertions.rustOutputStable).toBe(true);
      expect(report.assertions.parityMatched).toBe(true);
      expect(report.assertions.rustUsedEveryIteration).toBe(true);
      expect(report.cases.rust.rust?.usedIterations).toBe(2);
      expect(report.cases.rust.rust?.fallbackIterations).toBe(0);

      const rawJson = await readFile(outJsonPath, "utf8");
      const parsed = JSON.parse(rawJson) as EvidenceReport;
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.assertions.parityMatched).toBe(true);
      expect(parsed.cases.rust.rust?.usedIterations).toBe(2);

      const markdown = await readFile(outMarkdownPath, "utf8");
      expect(markdown).toContain("Workstream K Rust Benchmark Normalizer Perf Evidence");
      expect(markdown).toContain("node-normalizer");
      expect(markdown).toContain("rust-normalizer");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
