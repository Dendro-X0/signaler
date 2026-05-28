import { describe, expect, it } from "vitest";
import type { EngineJobV1 } from "../src/engine-contracts/jobs/index.js";
import { patchBundleStepArgs } from "../src/engine/jobs/run-preset-job.js";

describe("run-preset-job bundle root patching", () => {
  it("updates existing --project-root argument for bundle steps", () => {
    const job: EngineJobV1 = {
      schemaVersion: 1,
      preset: "custom",
      cwd: "/repo",
      outputDir: ".signaler",
      steps: [
        { command: "run", args: [] },
        { command: "bundle", args: ["--project-root", "/repo"] },
      ],
    };
    const patched = patchBundleStepArgs(job, {
      bundleProjectRoot: "/repo/apps/web",
      outputDir: "/repo/.signaler",
    });
    const bundleArgs = patched.steps.find((step) => step.command === "bundle")?.args ?? [];
    expect(bundleArgs).toEqual(["--project-root", "/repo/apps/web", "--output-dir", "/repo/.signaler"]);
  });

  it("adds --project-root and --output-dir arguments when missing", () => {
    const job: EngineJobV1 = {
      schemaVersion: 1,
      preset: "custom",
      cwd: "/repo",
      outputDir: ".signaler",
      steps: [{ command: "bundle", args: [] }],
    };
    const patched = patchBundleStepArgs(job, {
      bundleProjectRoot: "/repo/apps/web",
      outputDir: "/repo/.signaler",
    });
    const bundleArgs = patched.steps[0]?.args ?? [];
    expect(bundleArgs).toContain("--project-root");
    expect(bundleArgs).toContain("/repo/apps/web");
    expect(bundleArgs).toContain("--output-dir");
    expect(bundleArgs).toContain("/repo/.signaler");
  });
});
