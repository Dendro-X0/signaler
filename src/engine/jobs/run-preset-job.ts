import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { markAgentIndexPartialSuccess } from "../../agent-artifacts.js";
import type { EngineJobResultV1, EngineJobV1 } from "../../engine-contracts/jobs/index.js";
import { isEngineJobV1 } from "../../engine-contracts/jobs/index.js";
import {
  buildAgentPresetJob,
  buildPresetJob,
  type BuildPresetJobParams,
} from "./presets.js";
import { buildRunProfileJob, type RunProfileName } from "./run-profiles.js";
import { createDefaultEngineJobStepRunner } from "./step-runner.js";
import { createInProcessEngineJobStepRunner } from "./in-process-step-runner.js";
import { executeEngineJob } from "./run-job.js";
import { ensureManagedServer, type ManagedServeMode } from "../serve/index.js";
import type { EngineJobPreset } from "./types.js";

export type RunPresetJobParams = BuildPresetJobParams & {
  readonly preset?: EngineJobPreset;
  readonly runProfile?: RunProfileName;
  readonly jobFile?: string;
  readonly incremental?: boolean;
  readonly inProcess?: boolean;
  readonly managedServe?: boolean;
  readonly managedServeMode?: ManagedServeMode;
  readonly managedServeSkipBuild?: boolean;
  readonly managedServeReuse?: boolean;
  readonly skipDiscover?: boolean;
  readonly incrementalSkipPassing?: boolean;
  readonly routesFile?: string;
};

export type RunPresetJobOutcome = {
  readonly exitCode: number;
  readonly result: EngineJobResultV1;
  readonly job: EngineJobV1;
  readonly managedBaseUrl?: string;
};

function withoutDiscoverStep(job: EngineJobV1): EngineJobV1 {
  return {
    ...job,
    steps: job.steps.filter((step) => step.command !== "discover"),
  };
}

function patchDiscoverBaseUrl(job: EngineJobV1, baseUrl: string): EngineJobV1 {
  return {
    ...job,
    steps: job.steps.map((step) => {
      if (step.command !== "discover") {
        return step;
      }
      const nextArgs = [...(step.args ?? [])];
      const baseUrlIndex = nextArgs.findIndex((value) => value === "--base-url");
      if (baseUrlIndex >= 0 && baseUrlIndex + 1 < nextArgs.length) {
        nextArgs[baseUrlIndex + 1] = baseUrl;
      } else {
        nextArgs.push("--base-url", baseUrl);
      }
      return { ...step, args: nextArgs };
    }),
  };
}

export async function runPresetJob(params: RunPresetJobParams): Promise<RunPresetJobOutcome> {
  let job: EngineJobV1;
  if (params.jobFile) {
    const raw = await readFile(params.jobFile, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isEngineJobV1(parsed)) {
      throw new Error(`Invalid job file: ${params.jobFile}`);
    }
    job = parsed;
  } else if (params.runProfile) {
    job = buildRunProfileJob({ ...params, runProfile: params.runProfile });
  } else if (params.preset) {
    job = buildPresetJob({ ...params, preset: params.preset });
  } else {
    job = buildAgentPresetJob(params);
  }

  if (params.skipDiscover) {
    job = withoutDiscoverStep(job);
  }

  let managedBaseUrl: string | undefined;
  if (params.managedServe) {
    const managedServer = await ensureManagedServer({
      projectRoot: job.cwd,
      baseUrl: params.baseUrl ?? "http://127.0.0.1:3000",
      mode: params.managedServeMode ?? "auto",
      skipBuild: params.managedServeSkipBuild ?? false,
      reuseUnhealthy: params.managedServeReuse ?? false,
    });
    managedBaseUrl = managedServer.baseUrl;
    if (managedServer.startedBySignaler) {
      job = patchDiscoverBaseUrl(job, managedServer.baseUrl);
    }
    try {
      const stepRunner = params.inProcess
        ? createInProcessEngineJobStepRunner()
        : createDefaultEngineJobStepRunner();
      const outcome = await executeEngineJob({ job, stepRunner });
      if (outcome.exitCode === 2) {
        await markAgentIndexPartialSuccess(resolve(job.cwd, job.outputDir));
      }
      return {
        exitCode: outcome.exitCode,
        result: outcome.result,
        job,
        managedBaseUrl,
      };
    } finally {
      if (managedServer.startedBySignaler) {
        console.log(`Managed serve: stopping ${managedServer.mode} server...`);
        await managedServer.stop();
      }
    }
  }

  const stepRunner = params.inProcess ? createInProcessEngineJobStepRunner() : createDefaultEngineJobStepRunner();
  const outcome = await executeEngineJob({ job, stepRunner });
  if (outcome.exitCode === 2) {
    await markAgentIndexPartialSuccess(resolve(job.cwd, job.outputDir));
  }
  return {
    exitCode: outcome.exitCode,
    result: outcome.result,
    job,
    managedBaseUrl,
  };
}
