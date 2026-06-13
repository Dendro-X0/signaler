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
import { buildQualityProfileJob, type QualityProfileName } from "./quality-profiles.js";
import { buildRunProfileJob, type RunProfileName } from "./run-profiles.js";
import {
  evaluateAndWriteQualityPack,
  formatQualityPackFailures,
  mergeQualityPackExitCode,
} from "../../quality-pack.js";
import { createDefaultEngineJobStepRunner } from "./step-runner.js";
import { createInProcessEngineJobStepRunner } from "./in-process-step-runner.js";
import { executeEngineJob, writeJobLatestFailure } from "./run-job.js";
import { finalizeArtifactLayout } from "../../artifact-layout/index.js";
import type { ArtifactLayoutMode } from "../../artifact-layout/index.js";
import { ensureManagedServer, type ManagedServeMode } from "../serve/index.js";
import { resolveNextAppRoot } from "../serve/resolve-serve-plan.js";
import type { EngineJobPreset } from "./types.js";

export type RunPresetJobParams = BuildPresetJobParams & {
  readonly preset?: EngineJobPreset;
  readonly runProfile?: RunProfileName;
  readonly qualityProfile?: QualityProfileName;
  readonly jobFile?: string;
  readonly incremental?: boolean;
  readonly inProcess?: boolean;
  readonly managedServe?: boolean;
  readonly managedServeMode?: ManagedServeMode;
  readonly managedServeSkipBuild?: boolean;
  readonly managedServeReuse?: boolean;
  readonly artifactLayout?: ArtifactLayoutMode;
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

async function applyQualityPackExitCode(params: {
  readonly job: EngineJobV1;
  readonly priorExitCode: number;
  readonly configPath?: string;
}): Promise<number> {
  if (!params.job.qualityProfile) {
    return params.priorExitCode;
  }
  const pack = await evaluateAndWriteQualityPack({
    outputDir: resolve(params.job.cwd, params.job.outputDir),
    profile: params.job.qualityProfile,
    cwd: params.job.cwd,
    configPath: params.configPath,
  });
  const exitCode = mergeQualityPackExitCode(params.priorExitCode, pack);
  if (exitCode !== 0 && pack.violations.length > 0) {
    console.error("Quality pack failed:\n" + formatQualityPackFailures(pack));
    console.error(`See ${resolve(params.job.cwd, params.job.outputDir, "quality-pack.json")}`);
  }
  return exitCode;
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

export function patchBundleStepArgs(job: EngineJobV1, params: {
  readonly bundleProjectRoot: string;
  readonly outputDir: string;
}): EngineJobV1 {
  return {
    ...job,
    steps: job.steps.map((step) => {
      if (step.command !== "bundle") {
        return step;
      }
      const nextArgs = [...(step.args ?? [])];
      const rootIndex = nextArgs.findIndex((value) => value === "--project-root" || value === "--root");
      if (rootIndex >= 0 && rootIndex + 1 < nextArgs.length) {
        nextArgs[rootIndex + 1] = params.bundleProjectRoot;
      } else {
        nextArgs.push("--project-root", params.bundleProjectRoot);
      }
      const outputIndex = nextArgs.findIndex((value) => value === "--output-dir" || value === "--dir");
      if (outputIndex >= 0 && outputIndex + 1 < nextArgs.length) {
        nextArgs[outputIndex + 1] = params.outputDir;
      } else {
        nextArgs.push("--output-dir", params.outputDir);
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
  } else if (params.qualityProfile) {
    job = buildQualityProfileJob({ ...params, qualityProfile: params.qualityProfile });
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
  if (job.steps.some((step) => step.command === "bundle")) {
    const bundleProjectRoot = await resolveNextAppRoot(job.cwd);
    if (bundleProjectRoot !== job.cwd) {
      // eslint-disable-next-line no-console
      console.log(`Bundle scan root resolved to ${bundleProjectRoot} (from ${job.cwd}).`);
    }
    job = patchBundleStepArgs(job, {
      bundleProjectRoot,
      outputDir: resolve(job.cwd, job.outputDir),
    });
  }

  let managedBaseUrl: string | undefined;
  if (params.managedServe) {
    try {
      const managedServer = await ensureManagedServer({
        projectRoot: job.cwd,
        baseUrl: params.baseUrl ?? "http://127.0.0.1:3000",
        mode: params.managedServeMode ?? "production",
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
        const exitCode = await applyQualityPackExitCode({
          job,
          priorExitCode: outcome.exitCode,
          configPath: params.configPath,
        });
        await finalizeJobArtifacts({ job, artifactLayout: params.artifactLayout });
        return {
          exitCode,
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await writeJobLatestFailure({
        job,
        failureReason: "managed-serve",
        failureMessage: message,
      });
      throw error;
    }
  }

  const stepRunner = params.inProcess ? createInProcessEngineJobStepRunner() : createDefaultEngineJobStepRunner();
  const outcome = await executeEngineJob({ job, stepRunner });
  if (outcome.exitCode === 2) {
    await markAgentIndexPartialSuccess(resolve(job.cwd, job.outputDir));
  }
  const exitCode = await applyQualityPackExitCode({
    job,
    priorExitCode: outcome.exitCode,
    configPath: params.configPath,
  });
  await finalizeJobArtifacts({ job, artifactLayout: params.artifactLayout });
  return {
    exitCode,
    result: outcome.result,
    job,
    managedBaseUrl,
  };
}

async function finalizeJobArtifacts(params: {
  readonly job: EngineJobV1;
  readonly artifactLayout?: ArtifactLayoutMode;
}): Promise<void> {
  await finalizeArtifactLayout({
    outputDir: resolve(params.job.cwd, params.job.outputDir),
    layout: params.artifactLayout,
  });
}
