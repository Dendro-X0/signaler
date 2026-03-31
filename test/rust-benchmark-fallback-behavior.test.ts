import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadMultiBenchmarkSignalsWithRust } from "../src/rust/multi-benchmark-adapter.js";

async function writeBenchmarkFile(root: string): Promise<string> {
  const filePath = resolve(root, "bench-signals.json");
  await writeFile(
    filePath,
    JSON.stringify(
      {
        schemaVersion: 1,
        sources: [
          {
            sourceId: "accessibility-extended",
            collectedAt: "2026-03-10T00:00:00.000Z",
            records: [
              {
                id: "b-1",
                target: { issueId: "unused-javascript", path: "/" },
                confidence: "high",
                evidence: [{ sourceRelPath: "bench/a11y.json", pointer: "/records/0" }],
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
  return filePath;
}

describe("rust benchmark adapter fallback behavior", () => {
  it("returns disabled state when benchmark rust flag is off", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-rust-benchmark-off-"));
    const filePath = await writeBenchmarkFile(root);
    const previous = process.env.SIGNALER_RUST_BENCHMARK;
    try {
      process.env.SIGNALER_RUST_BENCHMARK = "";
      const result = await loadMultiBenchmarkSignalsWithRust([filePath]);
      expect(result.enabled).toBe(false);
      expect(result.used).toBe(false);
      expect(result.loaded?.records.length).toBe(1);
    } finally {
      process.env.SIGNALER_RUST_BENCHMARK = previous;
      await rm(root, { recursive: true, force: true });
    }
  });

  it("falls back to node loader when rust sidecar cannot execute", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-rust-benchmark-fallback-"));
    const filePath = await writeBenchmarkFile(root);
    const previousFlag = process.env.SIGNALER_RUST_BENCHMARK;
    const previousPath = process.env.PATH;
    try {
      process.env.SIGNALER_RUST_BENCHMARK = "1";
      process.env.PATH = "";
      const result = await loadMultiBenchmarkSignalsWithRust([filePath]);
      expect(result.enabled).toBe(true);
      expect(result.used).toBe(false);
      expect(typeof result.fallbackReason).toBe("string");
      expect((result.fallbackReason ?? "").length).toBeGreaterThan(0);
      expect(result.loaded?.records.length).toBe(1);
    } finally {
      process.env.SIGNALER_RUST_BENCHMARK = previousFlag;
      process.env.PATH = previousPath;
      await rm(root, { recursive: true, force: true });
    }
  });
});
