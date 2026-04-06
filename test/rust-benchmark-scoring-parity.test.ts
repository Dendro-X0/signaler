import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import type { MultiBenchmarkAcceptedRecord, MultiBenchmarkMatchResult } from "../src/multi-benchmark-signals.js";
import { matchAcceptedMultiBenchmarkSignals } from "../src/multi-benchmark-signals.js";
import { scoreMultiBenchmarkWithRust } from "../src/rust/multi-benchmark-scoring-adapter.js";

function cargoCommand(): string {
  return process.platform === "win32" ? "cargo.exe" : "cargo";
}

function hasCargo(): boolean {
  const result = spawnSync(cargoCommand(), ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

function rustBinaryName(): string {
  return process.platform === "win32" ? "signaler_hotpath.exe" : "signaler_hotpath";
}

function buildRustSidecarOrThrow(): string {
  const manifestPath = resolve(process.cwd(), "rust", "Cargo.toml");
  const buildResult = spawnSync(
    cargoCommand(),
    ["build", "--release", "--manifest-path", manifestPath, "-p", "signaler_hotpath"],
    {
      stdio: "ignore",
      env: {
        ...process.env,
        CARGO_PROFILE_DEV_DEBUG: "0",
      },
    },
  );
  if (buildResult.status !== 0) {
    throw new Error("Failed to build release Rust sidecar for benchmark scoring parity test.");
  }
  return resolve(process.cwd(), "rust", "target", "release", rustBinaryName());
}

function buildAccepted(): readonly MultiBenchmarkAcceptedRecord[] {
  return [
    {
      sourceId: "accessibility-extended",
      collectedAt: "2026-03-10T00:00:00.000Z",
      collectedAtMs: Date.parse("2026-03-10T00:00:00.000Z"),
      id: "acc-1",
      target: {
        issueId: "unused-javascript",
        path: "/",
      },
      confidence: "high",
      evidence: [
        {
          sourceRelPath: "bench/accessibility.json",
          pointer: "/sources/0/records/0",
        },
      ],
      metrics: {
        wcagViolationCount: 2,
      },
    },
    {
      sourceId: "seo-technical",
      collectedAt: "2026-03-10T00:00:00.000Z",
      collectedAtMs: Date.parse("2026-03-10T00:00:00.000Z"),
      id: "seo-1",
      target: {
        issueId: "unused-javascript",
        path: "/docs",
      },
      confidence: "high",
      evidence: [
        {
          sourceRelPath: "bench/seo.json",
          pointer: "/sources/0/records/0",
        },
      ],
      metrics: {
        crawlabilityIssueCount: 1,
      },
    },
  ];
}

function assertMatchEqual(actual: MultiBenchmarkMatchResult, expected: MultiBenchmarkMatchResult): void {
  expect(actual.totalBoost).toBeCloseTo(expected.totalBoost, 12);
  expect(actual.sourceBoosts["accessibility-extended"]).toBeCloseTo(expected.sourceBoosts["accessibility-extended"], 12);
  expect(actual.sourceBoosts["security-baseline"]).toBeCloseTo(expected.sourceBoosts["security-baseline"], 12);
  expect(actual.sourceBoosts["seo-technical"]).toBeCloseTo(expected.sourceBoosts["seo-technical"], 12);
  expect(actual.sourceBoosts["reliability-slo"]).toBeCloseTo(expected.sourceBoosts["reliability-slo"], 12);
  expect(actual.sourceBoosts["cross-browser-parity"]).toBeCloseTo(expected.sourceBoosts["cross-browser-parity"], 12);
  expect(actual.evidence).toEqual(expected.evidence);
}

const describeRust = hasCargo() ? describe : describe.skip;

describeRust("rust benchmark scoring parity", () => {
  it("matches node benchmark scoring semantics per candidate", async () => {
    const accepted = buildAccepted();
    const candidates = [
      { candidateId: "sugg-unused-javascript-1", issueId: "unused-javascript" },
      { candidateId: "sugg-unused-javascript-home", issueId: "unused-javascript", allowedPaths: ["/"] },
      { candidateId: "sugg-server-response-time-2", issueId: "server-response-time" },
    ] as const;

    const expected = new Map<string, MultiBenchmarkMatchResult>();
    for (const candidate of candidates) {
      expected.set(
        candidate.candidateId,
        matchAcceptedMultiBenchmarkSignals({
          accepted,
          issueId: candidate.issueId,
          ...(candidate.allowedPaths !== undefined ? { allowedPaths: candidate.allowedPaths } : {}),
        }),
      );
    }

    const previousFlag = process.env.SIGNALER_RUST_BENCHMARK;
    const previousBin = process.env.SIGNALER_RUST_SIDECAR_BIN;
    try {
      process.env.SIGNALER_RUST_BENCHMARK = "1";
      process.env.SIGNALER_RUST_SIDECAR_BIN = buildRustSidecarOrThrow();
      const result = await scoreMultiBenchmarkWithRust({ accepted, candidates });

      expect(result.requested).toBe(true);
      expect(result.enabled).toBe(true);
      expect(result.used).toBe(true);
      expect(result.sidecarCommand === "score-benchmark" || result.sidecarCommand === "score-benchmark-signals").toBe(true);
      expect((result.matchedRecordsCount ?? 0) >= 2).toBe(true);
      expect(result.fallbackReason).toBeUndefined();

      for (const candidate of candidates) {
        const rustMatch = result.scores.get(candidate.candidateId);
        const expectedMatch = expected.get(candidate.candidateId);
        expect(rustMatch).toBeDefined();
        expect(expectedMatch).toBeDefined();
        assertMatchEqual(rustMatch as MultiBenchmarkMatchResult, expectedMatch as MultiBenchmarkMatchResult);
      }
    } finally {
      process.env.SIGNALER_RUST_BENCHMARK = previousFlag;
      process.env.SIGNALER_RUST_SIDECAR_BIN = previousBin;
    }
  }, 180_000);
});
