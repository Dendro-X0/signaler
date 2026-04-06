import { describe, expect, it } from "vitest";
import { runRustCorePipeline, runRustSignalReducer } from "../src/rust/core-adapter.js";
import type { RunCoreInput } from "../src/rust/core-contracts.js";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

function buildMinimalCoreInput(): RunCoreInput {
  return {
    schemaVersion: 1,
    mode: "throughput",
    baseUrl: "http://localhost:3000",
    parallel: 1,
    runsPerCombo: 1,
    throttlingMethod: "simulate",
    cpuSlowdownMultiplier: 4,
    sessionIsolation: "shared",
    throughputBackoff: "auto",
    warmUp: { enabled: false },
    auditTimeoutMs: 1000,
    captureLevel: "none",
    outputDir: ".signaler",
    tasks: [],
    worker: {
      command: process.execPath,
      args: ["-e", "process.exit(0)"],
    },
  };
}

describe("Rust core policy", () => {
  it("disables rust core when SIGNALER_RUST_CORE=0", async () => {
    const prev = process.env.SIGNALER_RUST_CORE;
    try {
      process.env.SIGNALER_RUST_CORE = "0";
      const attempt = await runRustCorePipeline({ input: buildMinimalCoreInput() });
      expect(attempt.enabled).toBe(false);
      expect(attempt.used).toBe(false);
    } finally {
      process.env.SIGNALER_RUST_CORE = prev;
    }
  });

  it("defaults to rust-first and falls back when sidecar cannot execute", async () => {
    const prevFlag = process.env.SIGNALER_RUST_CORE;
    const prevPath = process.env.PATH;
    const prevSidecarBin = process.env.SIGNALER_RUST_SIDECAR_BIN;
    const invalidSidecarDir = await mkdtemp(join(tmpdir(), "signaler-rust-core-invalid-bin-"));
    try {
      delete process.env.SIGNALER_RUST_CORE;
      process.env.SIGNALER_RUST_SIDECAR_BIN = invalidSidecarDir;
      process.env.PATH = "";
      const attempt = await runRustCorePipeline({ input: buildMinimalCoreInput(), timeoutMs: 5000 });
      expect(attempt.enabled).toBe(true);
      expect(attempt.used).toBe(false);
      expect(typeof attempt.fallbackReason).toBe("string");
      expect((attempt.fallbackReason ?? "").length).toBeGreaterThan(0);
    } finally {
      process.env.SIGNALER_RUST_CORE = prevFlag;
      process.env.PATH = prevPath;
      process.env.SIGNALER_RUST_SIDECAR_BIN = prevSidecarBin;
      await rm(invalidSidecarDir, { recursive: true, force: true });
    }
  });

  it("disables rust reducer when SIGNALER_RUST_CORE=0", async () => {
    const prev = process.env.SIGNALER_RUST_CORE;
    try {
      process.env.SIGNALER_RUST_CORE = "0";
      const attempt = await runRustSignalReducer({
        summaryPath: "missing-summary.json",
        protocol: {
          mode: "throughput",
          profile: "throughput-balanced",
          comparabilityHash: "test-hash",
        },
      });
      expect(attempt.enabled).toBe(false);
      expect(attempt.used).toBe(false);
    } finally {
      process.env.SIGNALER_RUST_CORE = prev;
    }
  });
});
