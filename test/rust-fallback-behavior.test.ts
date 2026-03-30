import { describe, expect, it } from "vitest";
import { processSummaryWithRust } from "../src/rust/processor-adapter.js";

describe("Rust fallback behavior", () => {
  it("returns disabled state when processor flag is off", async () => {
    const previous = process.env.SIGNALER_RUST_PROCESSOR;
    try {
      process.env.SIGNALER_RUST_PROCESSOR = "";
      const result = await processSummaryWithRust({ summaryPath: "missing-summary.json" });
      expect(result.enabled).toBe(false);
      expect(result.used).toBe(false);
    } finally {
      process.env.SIGNALER_RUST_PROCESSOR = previous;
    }
  });

  it("falls back when sidecar cannot be executed", async () => {
    const previousFlag = process.env.SIGNALER_RUST_PROCESSOR;
    const previousPath = process.env.PATH;
    try {
      process.env.SIGNALER_RUST_PROCESSOR = "1";
      process.env.PATH = "";
      const result = await processSummaryWithRust({ summaryPath: "missing-summary.json" });
      expect(result.enabled).toBe(true);
      expect(result.used).toBe(false);
      expect(typeof result.fallbackReason).toBe("string");
      expect((result.fallbackReason ?? "").length).toBeGreaterThan(0);
    } finally {
      process.env.SIGNALER_RUST_PROCESSOR = previousFlag;
      process.env.PATH = previousPath;
    }
  });
});
