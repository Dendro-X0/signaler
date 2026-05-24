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

  it("resolves the event, signal, job, type, and top-level entry surfaces", async () => {
    await expect(import("../src/engine-contracts/events/index.js")).resolves.toBeDefined();
    await expect(import("../src/engine-contracts/signals/index.js")).resolves.toBeDefined();
    await expect(import("../src/engine-contracts/jobs/index.js")).resolves.toBeDefined();
    await expect(import("../src/engine-contracts/types/index.js")).resolves.toBeDefined();
    await expect(import("../src/engine-contracts/index.js")).resolves.toBeDefined();
  });

  it("keeps legacy job contract import paths working via compatibility re-exports", async () => {
    const legacy = await import("../src/contracts/jobs/engine-job-v1.js");
    const canonical = await import("../src/engine-contracts/jobs/engine-job-v1.js");
    expect(legacy.isEngineJobV1).toBe(canonical.isEngineJobV1);
    expect(legacy.isEngineJobResultV1).toBe(canonical.isEngineJobResultV1);
  });

  it("keeps legacy contract import paths working via compatibility re-exports", async () => {
    const legacy = await import("../src/contracts/v3/validators.js");
    const canonical = await import("../src/engine-contracts/artifacts/v3/validators.js");
    expect(legacy.isResultsV3).toBe(canonical.isResultsV3);
    expect(legacy.isAgentIndexV3).toBe(canonical.isAgentIndexV3);
  });

  it("keeps legacy engine schema import paths resolvable", async () => {
    await expect(import("../src/engine-events-schema.js")).resolves.toBeDefined();
    await expect(import("../src/engine-run-index.js")).resolves.toBeDefined();
    await expect(import("../src/engine-export-bundle-schema.js")).resolves.toBeDefined();
    await expect(import("../src/engine-contract.js")).resolves.toBeDefined();
  });
});
