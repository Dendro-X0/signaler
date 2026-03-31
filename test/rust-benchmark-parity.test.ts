import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { loadMultiBenchmarkSignalsFromFiles } from "../src/multi-benchmark-signals.js";
import { loadMultiBenchmarkSignalsWithRust } from "../src/rust/multi-benchmark-adapter.js";

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

function buildDebugRustSidecarOrThrow(): string {
  const manifestPath = resolve(process.cwd(), "rust", "Cargo.toml");
  const buildResult = spawnSync(
    cargoCommand(),
    ["build", "--manifest-path", manifestPath, "-p", "signaler_hotpath"],
    { stdio: "ignore" },
  );
  if (buildResult.status !== 0) {
    throw new Error("Failed to build debug Rust sidecar for benchmark parity test.");
  }
  return resolve(process.cwd(), "rust", "target", "debug", rustBinaryName());
}

const describeRust = hasCargo() ? describe : describe.skip;

describeRust("Rust benchmark normalizer parity", () => {
  it("matches node benchmark loader semantics for normalized records", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-rust-benchmark-parity-"));
    const fileA = resolve(root, "bench-a.json");
    const fileB = resolve(root, "bench-b.json");
    await writeFile(
      fileA,
      JSON.stringify(
        {
          schemaVersion: 1,
          sources: [
            {
              sourceId: "accessibility-extended",
              collectedAt: "2026-03-10T00:00:00.000Z",
              records: [
                {
                  id: "a11y-1",
                  target: { issueId: "uses-long-cache-ttl", path: "/" },
                  confidence: "high",
                  evidence: [
                    {
                      sourceRelPath: "bench/a11y.json",
                      pointer: "/sources/0/records/0",
                      artifactRelPath: 42,
                    },
                  ],
                  metrics: {
                    wcagViolationCount: 3,
                    seriousViolationCount: 1,
                    focusAppearanceIssueCount: 1,
                    apgPatternMismatchCount: 2,
                    ignoredMetric: 999,
                  },
                },
              ],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );
    await writeFile(
      fileB,
      JSON.stringify(
        {
          schemaVersion: 1,
          sources: [
            {
              sourceId: "security-baseline",
              collectedAt: "2026-03-11T00:00:00.000Z",
              records: [
                {
                  id: "sec-1",
                  target: { issueId: "uses-http2", path: "/blog" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "bench/security.json", pointer: "/sources/0/records/0" }],
                  metrics: {},
                },
              ],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const previousFlag = process.env.SIGNALER_RUST_BENCHMARK;
    const previousBin = process.env.SIGNALER_RUST_SIDECAR_BIN;
    try {
      const expected = await loadMultiBenchmarkSignalsFromFiles([fileA, fileB, fileA]);
      const debugSidecarPath = buildDebugRustSidecarOrThrow();
      process.env.SIGNALER_RUST_SIDECAR_BIN = debugSidecarPath;
      process.env.SIGNALER_RUST_BENCHMARK = "1";
      const viaRust = await loadMultiBenchmarkSignalsWithRust([fileA, fileB, fileA]);

      expect(expected).toBeDefined();
      expect(viaRust.enabled).toBe(true);
      expect(viaRust.used).toBe(true);
      expect(viaRust.fallbackReason).toBeUndefined();
      expect(viaRust.loaded).toEqual(expected);
    } finally {
      process.env.SIGNALER_RUST_BENCHMARK = previousFlag;
      process.env.SIGNALER_RUST_SIDECAR_BIN = previousBin;
      await rm(root, { recursive: true, force: true });
    }
  }, 180_000);
});
