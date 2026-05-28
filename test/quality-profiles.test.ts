import { describe, expect, it } from "vitest";
import { buildQualityProfileJob, QUALITY_PROFILE_NAMES } from "../src/engine/jobs/quality-profiles.js";

const baseParams = {
  cwd: "/tmp/project",
  outputDir: ".signaler",
} as const;

describe("quality profiles", () => {
  it("exports quality profile names", () => {
    expect(QUALITY_PROFILE_NAMES).toEqual(["web-quality", "pr-quality"]);
  });

  it("web-quality extends ci-strict with headers, links, and bundle steps", () => {
    const job = buildQualityProfileJob({ ...baseParams, qualityProfile: "web-quality" });
    expect(job.qualityProfile).toBe("web-quality");
    expect(job.runProfile).toBe("ci-strict");
    expect(job.steps.map((step) => step.command)).toEqual([
      "discover",
      "run",
      "analyze",
      "headers",
      "links",
      "bundle",
    ]);
    const runArgs = job.steps.find((step) => step.command === "run")?.args ?? [];
    expect(runArgs).toContain("--fail-on-quality-gate");
    expect(runArgs).toContain("--fail-on-baseline-compare");
    const bundleArgs = job.steps.find((step) => step.command === "bundle")?.args ?? [];
    expect(bundleArgs).toContain("--project-root");
    expect(bundleArgs).toContain("/tmp/project");
  });

  it("pr-quality uses changed-only run and side runners", () => {
    const job = buildQualityProfileJob({ ...baseParams, qualityProfile: "pr-quality" });
    expect(job.qualityProfile).toBe("pr-quality");
    expect(job.steps.map((step) => step.command)).toEqual(["run", "analyze", "headers", "links", "bundle"]);
    const runArgs = job.steps.find((step) => step.command === "run")?.args ?? [];
    expect(runArgs).toContain("--changed-only");
  });
});
