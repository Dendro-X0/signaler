import { afterEach, describe, expect, it } from "vitest";
import { resolveAutoResourceProfile } from "../src/cli.js";

const ENV_KEYS = ["SIGNALER_FORCE_CPU_COUNT", "SIGNALER_FORCE_FREE_MEMORY_MB"] as const;

function withForcedResources(
  cpuCount: number,
  freeMemoryMB: number,
  run: () => void,
): void {
  process.env.SIGNALER_FORCE_CPU_COUNT = String(cpuCount);
  process.env.SIGNALER_FORCE_FREE_MEMORY_MB = String(freeMemoryMB);
  try {
    run();
  } finally {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  }
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

describe("resolveAutoResourceProfile", () => {
  it("caps at 6 parallel for upper-mid CPU with a large suite (90 combos)", () => {
    withForcedResources(12, 3848, () => {
      const profile = resolveAutoResourceProfile({ plannedCombos: 90 });
      expect(profile.appliedParallelCap).toBe(6);
      expect(profile.reasons).toContain("upper-mid-cpu");
      expect(profile.reasons).toContain("large-suite-cap");
    });
  });

  it("uses 6 parallel for mid-tier CPU on medium suites", () => {
    withForcedResources(8, 8192, () => {
      const profile = resolveAutoResourceProfile({ plannedCombos: 50 });
      expect(profile.appliedParallelCap).toBe(6);
      expect(profile.reasons).toContain("mid-cpu");
    });
  });

  it("uses 6 parallel on high-CPU machines for small suites", () => {
    withForcedResources(24, 16384, () => {
      const profile = resolveAutoResourceProfile({ plannedCombos: 12 });
      expect(profile.appliedParallelCap).toBe(6);
      expect(profile.reasons).toContain("high-cpu");
    });
  });

  it("falls back to 1 parallel on low memory", () => {
    withForcedResources(12, 1390, () => {
      const profile = resolveAutoResourceProfile({ plannedCombos: 90 });
      expect(profile.appliedParallelCap).toBe(1);
      expect(profile.reasons).toContain("low-memory");
    });
  });
});
