import { describe, expect, it } from "vitest";
import { buildRunProfileJob, RUN_PROFILE_NAMES } from "../src/engine/jobs/run-profiles.js";

const baseParams = {
  cwd: "/tmp/project",
  outputDir: ".signaler",
} as const;

function runArgs(job: ReturnType<typeof buildRunProfileJob>): readonly string[] {
  const runStep = job.steps.find((step) => step.command === "run");
  return runStep?.args ?? [];
}

describe("run profiles", () => {
  it("exports the v4.3 profile names", () => {
    expect(RUN_PROFILE_NAMES).toEqual(["ci-strict", "pr-quick", "release-full"]);
  });

  it("ci-strict enables fail-on-budget and full discover scope", () => {
    const job = buildRunProfileJob({ ...baseParams, runProfile: "ci-strict" });
    expect(job.runProfile).toBe("ci-strict");
    expect(job.steps.map((step) => step.command)).toEqual(["discover", "run", "analyze"]);
    const discoverArgs = job.steps[0]?.args ?? [];
    expect(discoverArgs).toContain("full");
    expect(runArgs(job)).toContain("--fail-on-budget");
    expect(runArgs(job)).toContain("--fail-on-quality-gate");
    expect(runArgs(job)).toContain("--fail-on-baseline-compare");
    expect(runArgs(job)).toContain("--mode");
    expect(runArgs(job)).toContain("throughput");
  });

  it("pr-quick skips discover and uses changed-only", () => {
    const job = buildRunProfileJob({ ...baseParams, runProfile: "pr-quick" });
    expect(job.runProfile).toBe("pr-quick");
    expect(job.steps.map((step) => step.command)).toEqual(["run", "analyze"]);
    expect(runArgs(job)).toContain("--changed-only");
    expect(runArgs(job)).toContain("--fail-on-baseline-compare");
  });

  it("release-full uses fidelity mode and lower default parallel", () => {
    const job = buildRunProfileJob({ ...baseParams, runProfile: "release-full" });
    expect(job.runProfile).toBe("release-full");
    expect(runArgs(job)).toContain("--mode");
    expect(runArgs(job)).toContain("fidelity");
    const parallelIndex = runArgs(job).indexOf("--parallel");
    expect(parallelIndex).toBeGreaterThanOrEqual(0);
    expect(runArgs(job)[parallelIndex + 1]).toBe("2");
  });
});
