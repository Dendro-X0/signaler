import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { runRustSignalReducer } from "../src/rust/core-adapter.js";

function cargoCommand(): string {
  return process.platform === "win32" ? "cargo.exe" : "cargo";
}

function hasCargo(): boolean {
  const result = spawnSync(cargoCommand(), ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

const describeRust = hasCargo() ? describe : describe.skip;

describeRust("Rust signal reducer parity", () => {
  it("produces deterministic top issues and suggestions", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "signaler-rust-reducer-"));
    try {
      const summaryPath = resolve(tempRoot, "summary.json");
      const summary = {
        meta: { elapsedMs: 1000 },
        results: [
          {
            opportunities: [
              { id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 200.6, estimatedSavingsBytes: 10240 },
              { id: "render-blocking-resources", title: "Eliminate render-blocking resources", estimatedSavingsMs: 120.1, estimatedSavingsBytes: 1024 },
            ],
          },
          {
            opportunities: [
              { id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 99.6, estimatedSavingsBytes: 5120 },
              { id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 15.1, estimatedSavingsBytes: 2560 },
            ],
          },
        ],
      };
      await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

      const prev = process.env.SIGNALER_RUST_CORE;
      try {
        process.env.SIGNALER_RUST_CORE = "1";
        const result = await runRustSignalReducer({
          summaryPath,
          protocol: {
            mode: "throughput",
            profile: "throughput-balanced",
            comparabilityHash: "abc123",
          },
        });

        expect(result.enabled).toBe(true);
        expect(result.used).toBe(true);
        expect(result.topIssues?.[0]).toMatchObject({
          id: "unused-javascript",
          title: "Reduce unused JavaScript",
          count: 3,
          totalMs: 315,
        });
        expect(result.suggestions?.length).toBeGreaterThan(0);
        expect(result.suggestions?.[0]?.id).toContain("unused-javascript");
      } finally {
        process.env.SIGNALER_RUST_CORE = prev;
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
