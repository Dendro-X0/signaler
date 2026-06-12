import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isEngineJobResultV1 } from "../src/engine-contracts/jobs/index.js";
import {
  buildAgentPresetJob,
  buildQualityProfileJob,
  createInProcessEngineJobStepRunner,
  executeEngineJob,
  runInProcessJobStep,
} from "../src/engine/index.js";

describe("engine entry surface", () => {
  it("builds agent preset jobs without shell argv parsing", () => {
    const job = buildAgentPresetJob({
      cwd: "/tmp/project",
      outputDir: ".signaler",
      discoverScope: "quick",
    });
    expect(job.preset).toBe("agent");
    expect(job.steps.map((step) => step.command)).toEqual(["discover", "run", "analyze"]);
    expect(job.steps[0]?.args).toContain("quick");
    const runArgs = job.steps[1]?.args ?? [];
    expect(runArgs).toContain("--parallel");
    expect(runArgs).toContain("6");
  });

  it("executes jobs via injectable step runner and writes artifacts", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "signaler-engine-entry-"));
    const job = buildAgentPresetJob({ cwd, outputDir: ".signaler" });
    const calls: string[] = [];

    const outcome = await executeEngineJob({
      job,
      stepRunner: ({ step }) => {
        calls.push(step.command);
        return { exitCode: 0, elapsedMs: 1 };
      },
    });

    expect(calls).toEqual(["discover", "run", "analyze"]);
    expect(outcome.exitCode).toBe(0);
    expect(outcome.result.status).toBe("success");
    expect(isEngineJobResultV1(outcome.result)).toBe(true);

    const latestRaw = await readFile(join(cwd, ".signaler", "job-latest.json"), "utf8");
    const latest = JSON.parse(latestRaw) as unknown;
    expect(isEngineJobResultV1(latest)).toBe(true);
    expect((latest as { jobId: string }).jobId).toBe(job.jobId);
  });

  it("runs in-process steps via injectable handlers", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "signaler-engine-inprocess-"));
    const argvSeen: string[][] = [];
    const runner = createInProcessEngineJobStepRunner({
      discover: async (argv) => {
        argvSeen.push([...argv]);
      },
      run: async () => {},
      analyze: async () => {},
    });

    const job = buildAgentPresetJob({ cwd, outputDir: ".signaler" });
    const outcome = await executeEngineJob({
      job,
      stepRunner: runner,
      writeArtifacts: false,
    });

    expect(outcome.exitCode).toBe(0);
    expect(argvSeen).toHaveLength(1);
    expect(argvSeen[0]?.[2]).toBe("discover");
  });

  it("invokes an explicit in-process handler without loading default CLI modules", async () => {
    let invoked = false;
    await runInProcessJobStep({
      cwd: process.cwd(),
      step: { command: "analyze", args: ["--help"] },
      handlers: {
        analyze: async () => {
          invoked = true;
        },
      },
    });
    expect(invoked).toBe(true);
  });

  it("stops on first failing step", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "signaler-engine-entry-fail-"));
    const job = buildAgentPresetJob({ cwd, outputDir: ".signaler" });
    const calls: string[] = [];

    const outcome = await executeEngineJob({
      job,
      writeArtifacts: false,
      stepRunner: ({ step }) => {
        calls.push(step.command);
        return { exitCode: step.command === "run" ? 2 : 0, elapsedMs: 1 };
      },
    });

    expect(calls).toEqual(["discover", "run"]);
    expect(outcome.exitCode).toBe(1);
    expect(outcome.result.status).toBe("failed");
    expect(outcome.result.steps).toHaveLength(2);
  });

  it("returns exit code 2 when run succeeds and analyze fails", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "signaler-engine-entry-partial-"));
    const job = buildAgentPresetJob({ cwd, outputDir: ".signaler" });

    const outcome = await executeEngineJob({
      job,
      writeArtifacts: false,
      stepRunner: ({ step }) => ({
        exitCode: step.command === "analyze" ? 1 : 0,
        elapsedMs: 1,
      }),
    });

    expect(outcome.exitCode).toBe(2);
    expect(outcome.result.steps.map((row) => row.command)).toEqual(["discover", "run", "analyze"]);
  });

  it("continues quality-profile side runners when a side runner fails after a successful run", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "signaler-engine-quality-profile-"));
    const job = buildQualityProfileJob({ cwd, outputDir: ".signaler", qualityProfile: "web-quality" });
    const calls: string[] = [];

    const outcome = await executeEngineJob({
      job,
      writeArtifacts: false,
      stepRunner: ({ step }) => {
        calls.push(step.command);
        return {
          exitCode: step.command === "headers" ? 1 : 0,
          elapsedMs: 1,
        };
      },
    });

    expect(calls).toEqual([
      "discover",
      "run",
      "headers",
      "links",
      "health",
      "console",
      "measure",
      "accessibility",
      "bundle",
      "analyze",
    ]);
    expect(outcome.exitCode).toBe(1);
    expect(outcome.result.failedStep).toBe("headers");
  });

  it("stops quality-profile job when analyze fails after side runners", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "signaler-engine-quality-profile-analyze-"));
    const job = buildQualityProfileJob({ cwd, outputDir: ".signaler", qualityProfile: "web-quality" });
    const calls: string[] = [];

    const outcome = await executeEngineJob({
      job,
      writeArtifacts: false,
      stepRunner: ({ step }) => {
        calls.push(step.command);
        return {
          exitCode: step.command === "analyze" ? 1 : 0,
          elapsedMs: 1,
        };
      },
    });

    expect(calls).toEqual([
      "discover",
      "run",
      "headers",
      "links",
      "health",
      "console",
      "measure",
      "accessibility",
      "bundle",
      "analyze",
    ]);
    expect(outcome.exitCode).toBe(2);
    expect(outcome.result.failedStep).toBe("analyze");
  });
});
