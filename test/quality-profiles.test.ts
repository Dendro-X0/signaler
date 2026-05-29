import { describe, expect, it } from "vitest";
import { buildQualityProfileJob, QUALITY_PROFILE_NAMES } from "../src/engine/jobs/quality-profiles.js";

const baseParams = {
  cwd: "/tmp/project",
  outputDir: ".signaler",
} as const;

const sideRunnerCommands = [
  "headers",
  "links",
  "health",
  "console",
  "measure",
  "accessibility",
  "bundle",
] as const;

describe("quality profiles", () => {
  it("exports quality profile names", () => {
    expect(QUALITY_PROFILE_NAMES).toEqual(["web-quality", "pr-quality"]);
  });

  it("web-quality extends ci-strict with all side runners", () => {
    const job = buildQualityProfileJob({ ...baseParams, qualityProfile: "web-quality" });
    expect(job.qualityProfile).toBe("web-quality");
    expect(job.runProfile).toBe("ci-strict");
    expect(job.steps.map((step) => step.command)).toEqual(["discover", "run", "analyze", ...sideRunnerCommands]);
    const runArgs = job.steps.find((step) => step.command === "run")?.args ?? [];
    expect(runArgs).toContain("--fail-on-quality-gate");
    expect(runArgs).toContain("--fail-on-baseline-compare");
    const bundleArgs = job.steps.find((step) => step.command === "bundle")?.args ?? [];
    expect(bundleArgs).toContain("--project-root");
    expect(bundleArgs).toContain("/tmp/project");
    for (const command of ["headers", "links", "health", "console", "measure", "accessibility"] as const) {
      const args = job.steps.find((step) => step.command === command)?.args ?? [];
      expect(args).toEqual([]);
    }
  });

  it("web-quality passes config to HTTP/browser side runners when configPath is set", () => {
    const job = buildQualityProfileJob({
      ...baseParams,
      qualityProfile: "web-quality",
      configPath: "/tmp/project/signaler.config.json",
    });
    for (const command of ["headers", "links", "health", "console", "measure", "accessibility"] as const) {
      const args = job.steps.find((step) => step.command === command)?.args ?? [];
      expect(args).toEqual(["--config", "/tmp/project/signaler.config.json"]);
    }
  });

  it("pr-quality uses changed-only run and side runners", () => {
    const job = buildQualityProfileJob({ ...baseParams, qualityProfile: "pr-quality" });
    expect(job.qualityProfile).toBe("pr-quality");
    expect(job.steps.map((step) => step.command)).toEqual(["run", "analyze", ...sideRunnerCommands]);
    const runArgs = job.steps.find((step) => step.command === "run")?.args ?? [];
    expect(runArgs).toContain("--changed-only");
  });
});
