import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { processSummaryWithRust } from "../src/rust/processor-adapter.js";

function cargoCommand(): string {
  return process.platform === "win32" ? "cargo.exe" : "cargo";
}

function hasCargo(): boolean {
  const result = spawnSync(cargoCommand(), ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

const describeRust = hasCargo() ? describe : describe.skip;

describeRust("Rust processor parity", () => {
  it("matches JS aggregation semantics for top issues", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "signaler-rust-processor-parity-"));
    try {
      const summaryPath = resolve(tempRoot, "summary.json");
      const summary = {
        meta: { elapsedMs: 1000 },
        results: [
          {
            opportunities: [
              { id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 200.6 },
              { id: "render-blocking-resources", title: "Eliminate render-blocking resources", estimatedSavingsMs: 120.1 },
            ],
          },
          {
            opportunities: [
              { id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 99.6 },
              { id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 15.1 },
            ],
          },
        ],
      };
      await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

      const prev = process.env.SIGNALER_RUST_PROCESSOR;
      try {
        process.env.SIGNALER_RUST_PROCESSOR = "1";
        const result = await processSummaryWithRust({ summaryPath });
        expect(result.enabled).toBe(true);
        expect(result.used).toBe(true);
        expect(result.topIssues).toBeDefined();
        expect(result.topIssues?.[0]).toEqual({
          id: "unused-javascript",
          title: "Reduce unused JavaScript",
          count: 3,
          totalMs: 315,
        });
      } finally {
        process.env.SIGNALER_RUST_PROCESSOR = prev;
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
