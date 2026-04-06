import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { MultiBenchmarkAcceptedRecord, MultiBenchmarkMatchResult } from "../src/multi-benchmark-signals.js";
import { matchAcceptedMultiBenchmarkSignals } from "../src/multi-benchmark-signals.js";
import { scoreMultiBenchmarkWithRust } from "../src/rust/multi-benchmark-scoring-adapter.js";

const acceptedRecords: readonly MultiBenchmarkAcceptedRecord[] = [
  {
    sourceId: "reliability-slo",
    collectedAt: "2026-03-12T00:00:00.000Z",
    collectedAtMs: Date.parse("2026-03-12T00:00:00.000Z"),
    id: "rel-1",
    target: {
      issueId: "server-response-time",
      path: "/",
    },
    confidence: "high",
    evidence: [
      {
        sourceRelPath: "bench/reliability.json",
        pointer: "/sources/0/records/0",
      },
    ],
    metrics: {
      latencyP95Ms: 1800,
    },
  },
];

const scoringCandidates = [
  {
    candidateId: "sugg-server-response-time-1",
    issueId: "server-response-time",
  },
] as const;

function expectedNodeMatchMap(): Map<string, MultiBenchmarkMatchResult> {
  const map = new Map<string, MultiBenchmarkMatchResult>();
  for (const candidate of scoringCandidates) {
    map.set(
      candidate.candidateId,
      matchAcceptedMultiBenchmarkSignals({
        accepted: acceptedRecords,
        issueId: candidate.issueId,
      }),
    );
  }
  return map;
}

describe("rust benchmark scoring fallback behavior", () => {
  it("returns unrequested state when no accepted records are passed", async () => {
    const previous = process.env.SIGNALER_RUST_BENCHMARK;
    try {
      process.env.SIGNALER_RUST_BENCHMARK = "1";
      const result = await scoreMultiBenchmarkWithRust({
        accepted: [],
        candidates: scoringCandidates,
      });
      expect(result.requested).toBe(false);
      expect(result.enabled).toBe(false);
      expect(result.used).toBe(false);
      expect(result.scores.size).toBe(0);
    } finally {
      process.env.SIGNALER_RUST_BENCHMARK = previous;
    }
  });

  it("uses node scoring when rust benchmark scoring flag is off", async () => {
    const previous = process.env.SIGNALER_RUST_BENCHMARK;
    try {
      process.env.SIGNALER_RUST_BENCHMARK = "";
      const result = await scoreMultiBenchmarkWithRust({
        accepted: acceptedRecords,
        candidates: scoringCandidates,
      });
      expect(result.requested).toBe(true);
      expect(result.enabled).toBe(false);
      expect(result.used).toBe(false);
      expect(result.fallbackReason).toBeUndefined();
      expect(result.scores).toEqual(expectedNodeMatchMap());
    } finally {
      process.env.SIGNALER_RUST_BENCHMARK = previous;
    }
  });

  it("falls back to node scoring when rust sidecar cannot execute", async () => {
    const fallbackBinDir = await mkdtemp(join(tmpdir(), "signaler-rust-benchmark-scoring-fallback-"));
    const previousFlag = process.env.SIGNALER_RUST_BENCHMARK;
    const previousSidecarBin = process.env.SIGNALER_RUST_SIDECAR_BIN;
    try {
      process.env.SIGNALER_RUST_BENCHMARK = "1";
      process.env.SIGNALER_RUST_SIDECAR_BIN = fallbackBinDir;
      const result = await scoreMultiBenchmarkWithRust({
        accepted: acceptedRecords,
        candidates: scoringCandidates,
      });
      expect(result.requested).toBe(true);
      expect(result.enabled).toBe(true);
      expect(result.used).toBe(false);
      expect(typeof result.fallbackReason).toBe("string");
      expect((result.fallbackReason ?? "").length).toBeGreaterThan(0);
      expect(result.scores).toEqual(expectedNodeMatchMap());
    } finally {
      process.env.SIGNALER_RUST_BENCHMARK = previousFlag;
      process.env.SIGNALER_RUST_SIDECAR_BIN = previousSidecarBin;
      await rm(fallbackBinDir, { recursive: true, force: true });
    }
  });
});
