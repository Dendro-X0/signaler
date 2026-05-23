import { describe, expect, it } from "vitest";

describe("engine-contracts boundary", () => {
  it("exposes the canonical artifact validators through the new boundary", async () => {
    const artifacts = await import("../src/engine-contracts/artifacts/index.js");
    expect(typeof artifacts.isAgentIndexV3).toBe("function");
    expect(typeof artifacts.isResultsV3).toBe("function");
    expect(typeof artifacts.isSuggestionsV3).toBe("function");
    expect(typeof artifacts.isAnalyzeReportV6).toBe("function");
    expect(typeof artifacts.isVerifyReportV6).toBe("function");
    expect(typeof artifacts.isVerifyThresholdsV6).toBe("function");
  });

  it("resolves the event, signal, type, and top-level entry surfaces", async () => {
    await expect(import("../src/engine-contracts/events/index.js")).resolves.toBeDefined();
    await expect(import("../src/engine-contracts/signals/index.js")).resolves.toBeDefined();
    await expect(import("../src/engine-contracts/types/index.js")).resolves.toBeDefined();
    await expect(import("../src/engine-contracts/index.js")).resolves.toBeDefined();
  });
});
