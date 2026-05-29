import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { EngineJobResultV1, EngineJobV1 } from "../../engine-contracts/jobs/index.js";
import { shouldContinueQualityProfileJobAfterStepFailure } from "./quality-profiles.js";
import { createDefaultEngineJobStepRunner } from "./step-runner.js";
import type { EngineJobExitCode, EngineJobRunOptions, EngineJobRunOutcome } from "./types.js";

const PRIMARY_JOB_ARTIFACTS = [
  "agent-index.json",
  "performance-triage.json",
  "analyze.json",
  "run.json",
] as const;

export async function writeJobLatestFailure(params: {
  readonly job: EngineJobV1;
  readonly failureReason: string;
  readonly failureMessage: string;
  readonly exitCode?: 0 | 1 | 2;
}): Promise<void> {
  const startedAt = new Date().toISOString();
  const result: EngineJobResultV1 = {
    schemaVersion: 1,
    jobId: params.job.jobId,
    status: "failed",
    startedAt,
    completedAt: startedAt,
    elapsedMs: 0,
    steps: [],
    primaryArtifacts: [...PRIMARY_JOB_ARTIFACTS],
    exitCode: params.exitCode ?? 1,
    failureReason: params.failureReason,
    failureMessage: params.failureMessage,
  };
  await writeEngineJobArtifacts({ job: params.job, result });
}

export async function writeEngineJobArtifacts(params: {
  readonly job: EngineJobV1;
  readonly result: EngineJobResultV1;
}): Promise<void> {
  const outputRoot = resolve(params.job.cwd, params.job.outputDir);
  const jobsDir = resolve(outputRoot, "jobs", params.job.jobId);
  await mkdir(jobsDir, { recursive: true });
  await writeFile(resolve(jobsDir, "job.json"), `${JSON.stringify(params.job, null, 2)}\n`, "utf8");
  await writeFile(resolve(jobsDir, "job-result.json"), `${JSON.stringify(params.result, null, 2)}\n`, "utf8");
  await writeFile(resolve(outputRoot, "job-latest.json"), `${JSON.stringify(params.result, null, 2)}\n`, "utf8");
}

/**
 * Engine entry surface: execute a v1 job definition without CLI argument parsing.
 */
export async function executeEngineJob(options: EngineJobRunOptions): Promise<EngineJobRunOutcome> {
  const stepRunner = options.stepRunner ?? createDefaultEngineJobStepRunner();
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const stepResults: EngineJobResultV1["steps"][number][] = [];
  let failedStep: EngineJobV1["steps"][number]["command"] | undefined;
  let runStepSucceeded = false;

  for (let index = 0; index < options.job.steps.length; index += 1) {
    const step = options.job.steps[index]!;
    const outcome = await Promise.resolve(stepRunner({ cwd: options.job.cwd, step }));
    stepResults.push({
      command: step.command,
      exitCode: outcome.exitCode,
      elapsedMs: outcome.elapsedMs,
    });
    if (step.command === "run" && outcome.exitCode === 0) {
      runStepSucceeded = true;
    }
    if (outcome.exitCode !== 0) {
      failedStep = step.command;
      const remainingSteps = options.job.steps.slice(index + 1);
      if (
        !shouldContinueQualityProfileJobAfterStepFailure({
          qualityProfile: options.job.qualityProfile,
          command: step.command,
          runStepSucceeded,
          remainingSteps,
        })
      ) {
        break;
      }
    }
  }

  const exitCode: EngineJobExitCode =
    failedStep === undefined
      ? 0
      : failedStep === "analyze" && runStepSucceeded
        ? 2
        : 1;
  const failed = exitCode !== 0;

  const result: EngineJobResultV1 = {
    schemaVersion: 1,
    jobId: options.job.jobId,
    status: failed ? "failed" : "success",
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedMs,
    steps: stepResults,
    primaryArtifacts: [...PRIMARY_JOB_ARTIFACTS],
    exitCode,
    failedStep,
  };

  if (options.writeArtifacts !== false) {
    await writeEngineJobArtifacts({ job: options.job, result });
  }

  return {
    job: options.job,
    result,
    exitCode,
  };
}
