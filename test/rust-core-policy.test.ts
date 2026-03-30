import { describe, expect, it } from "vitest";
import { runRustCorePipeline, runRustSignalReducer } from "../src/rust/core-adapter.js";
import type { RunCoreInput } from "../src/rust/core-contracts.js";

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
    try {
      delete process.env.SIGNALER_RUST_CORE;
      process.env.PATH = "";
      const attempt = await runRustCorePipeline({ input: buildMinimalCoreInput(), timeoutMs: 5000 });
      expect(attempt.enabled).toBe(true);
      expect(attempt.used).toBe(false);
      expect(typeof attempt.fallbackReason).toBe("string");
      expect((attempt.fallbackReason ?? "").length).toBeGreaterThan(0);
    } finally {
      process.env.SIGNALER_RUST_CORE = prevFlag;
      process.env.PATH = prevPath;
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
