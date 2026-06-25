import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { markAgentIndexPartialSuccess } from "../../agent-artifacts.js";
import type { EngineJobResultV1, EngineJobV1 } from "../../engine-contracts/jobs/index.js";
import { isEngineJobV1 } from "../../engine-contracts/jobs/index.js";
import { loadConfig } from "../../core/config.js";
import { resolveServeEnvWithConsent } from "../explore/resolve-serve-env.js";
import {
  resolveAttachBaseUrl,
} from "../explore/attach-first.js";
import { reportServerNotReady, type ServerNotReadyReason } from "../explore/server-not-ready-guidance.js";
import type { RepoExploreManifest } from "../explore/repo-explore.js";
import {
  loadOrRunRepoExplore,
  pickBaseUrlFromExplore,
  readExploreManifestIfFresh,
  writeExploreManifest,
} from "../explore/repo-explore.js";
import { writeAutoConfigIfMissing } from "../explore/ensure-project-config.js";
import { parseBaseUrlPort, resolveNextAppRoot } from "../serve/resolve-serve-plan.js";
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
  readonly serveEnvOverrides?: Readonly<Record<string, string>>;
  readonly labAuth?: boolean;
  readonly yes?: boolean;
  readonly nonInteractive?: boolean;
  readonly noAuditBypass?: boolean;
  readonly skipExplore?: boolean;
};

export type RunPresetJobOutcome = {
  readonly exitCode: number;
  readonly result: EngineJobResultV1;
  readonly job: EngineJobV1;
  readonly managedBaseUrl?: string;
  /** Audit did not run — app server not reachable; user should start dev server and rerun. */
  readonly serverNotReady?: boolean;
};

function buildBlockedJobResult(job: EngineJobV1): EngineJobResultV1 {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    jobId: job.jobId,
    status: "success",
    startedAt: now,
    completedAt: now,
    elapsedMs: 0,
    steps: [],
    primaryArtifacts: [],
    exitCode: 0,
  };
}

async function finishServerNotReady(params: {
  readonly job: EngineJobV1;
  readonly projectRoot: string;
  readonly baseUrl: string;
  readonly outputDir: string;
  readonly explore?: RepoExploreManifest;
  readonly reason: ServerNotReadyReason;
}): Promise<RunPresetJobOutcome> {
  await reportServerNotReady({
    projectRoot: params.projectRoot,
    baseUrl: params.baseUrl,
    outputDir: params.outputDir,
    explore: params.explore,
    reason: params.reason,
  });
  return {
    exitCode: 0,
    serverNotReady: true,
    result: buildBlockedJobResult(params.job),
    job: params.job,
  };
}

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

function patchJobStepBaseUrl(job: EngineJobV1, baseUrl: string, commands: readonly string[]): EngineJobV1 {
  return {
    ...job,
    steps: job.steps.map((step) => {
      if (!commands.includes(step.command)) {
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

function patchDiscoverBaseUrl(job: EngineJobV1, baseUrl: string): EngineJobV1 {
  return patchJobStepBaseUrl(job, baseUrl, ["discover"]);
}

function patchRunBaseUrl(job: EngineJobV1, baseUrl: string): EngineJobV1 {
  return patchJobStepBaseUrl(job, baseUrl, ["run"]);
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

/**
 * The preset job orchestrator owns managed-serve lifecycle (`runPresetJob`).
 * The inner `run` step must not start a second server (including when the user passed `--no-managed-serve`).
 */
export function patchJobRunStepArgs(
  job: EngineJobV1,
  params: { readonly noManagedServe?: boolean },
): EngineJobV1 {
  if (!params.noManagedServe) {
    return job;
  }
  return {
    ...job,
    steps: job.steps.map((step) => {
      if (step.command !== "run") {
        return step;
      }
      const args = (step.args ?? []).filter(
        (arg) => arg !== "--managed-serve" && arg !== "--auto-serve" && arg !== "--no-managed-serve",
      );
      return { ...step, args: [...args, "--no-managed-serve"] };
    }),
  };
}

export function patchJobConfigPath(job: EngineJobV1, configPath: string): EngineJobV1 {
  const commands = ["discover", "run", "analyze", "verify"] as const;
  return {
    ...job,
    steps: job.steps.map((step) => {
      if (!commands.includes(step.command as (typeof commands)[number])) {
        return step;
      }
      const nextArgs = [...(step.args ?? [])];
      const configIndex = nextArgs.findIndex((value) => value === "--config" || value === "-c");
      if (configIndex >= 0 && configIndex + 1 < nextArgs.length) {
        nextArgs[configIndex + 1] = configPath;
      } else {
        nextArgs.push("--config", configPath);
      }
      return { ...step, args: nextArgs };
    }),
  };
}

async function resolveEffectiveLabAuth(params: RunPresetJobParams, cwd: string): Promise<boolean> {
  if (params.labAuth) {
    return true;
  }
  const resolvedConfigPath = resolve(cwd, params.configPath ?? "signaler.config.json");
  if (!existsSync(resolvedConfigPath)) {
    return false;
  }
  const loaded = await loadConfig({ configPath: resolvedConfigPath });
  return loaded.config.auth?.lab === true;
}

export async function runPresetJob(params: RunPresetJobParams): Promise<RunPresetJobOutcome> {
  const labAuth = await resolveEffectiveLabAuth(params, params.cwd);
  let job: EngineJobV1;
  if (params.jobFile) {
    const raw = await readFile(params.jobFile, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isEngineJobV1(parsed)) {
      throw new Error(`Invalid job file: ${params.jobFile}`);
    }
    job = parsed;
  } else if (params.qualityProfile) {
    job = buildQualityProfileJob({ ...params, qualityProfile: params.qualityProfile, labAuth });
  } else if (params.runProfile) {
    job = buildRunProfileJob({ ...params, runProfile: params.runProfile, labAuth });
  } else if (params.preset) {
    job = buildPresetJob({ ...params, preset: params.preset, labAuth });
  } else {
    job = buildAgentPresetJob({ ...params, labAuth });
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
  job = patchJobRunStepArgs(job, { noManagedServe: true });

  let managedBaseUrl: string | undefined;
  const resolvedConfigPath = resolve(job.cwd, params.configPath ?? "signaler.config.json");
  let fromConfigServeEnv: Readonly<Record<string, string>> | undefined;
  let configPortHints: readonly number[] | undefined;
  if (existsSync(resolvedConfigPath)) {
    const loaded = await loadConfig({ configPath: resolvedConfigPath });
    fromConfigServeEnv = loaded.config.serveEnv;
    configPortHints = loaded.config.serve?.portHints;
  }

  let requestedBaseUrl = params.baseUrl ?? "http://127.0.0.1:3000";
  let effectiveBaseUrl = requestedBaseUrl;
  let managedServer: Awaited<ReturnType<typeof ensureManagedServer>> | undefined;

  const runJob = async (): Promise<RunPresetJobOutcome> => {
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
      configPath: params.configPath ?? resolvedConfigPath,
    });
    await finalizeJobArtifacts({ job, artifactLayout: params.artifactLayout });
    return {
      exitCode,
      result: outcome.result,
      job,
      managedBaseUrl,
    };
  };

  try {
    const configMissing = !existsSync(resolvedConfigPath);
    const shouldExplore = !params.skipExplore || configMissing;
    let exploreManifest: RepoExploreManifest | undefined;

    if (shouldExplore) {
      const outputDir = resolve(job.cwd, job.outputDir);
      const { manifest: explore, fromCache } = await loadOrRunRepoExplore({
        projectRoot: job.cwd,
        outputDir,
        preferredPort: parseBaseUrlPort(requestedBaseUrl),
        extraPortHints: configPortHints,
      });
      exploreManifest = explore;
      if (!fromCache) {
        const explorePath = await writeExploreManifest({
          outputDir,
          manifest: explore,
        });
        // eslint-disable-next-line no-console
        console.log(
          `Explore: ${explore.routes.length} routes, ${explore.runningServers.length} loopback server(s), ${explore.elapsedMs}ms → ${explorePath}`,
        );
      } else {
        // eslint-disable-next-line no-console
        console.log(
          `Explore: reusing cached manifest (${explore.routes.length} routes, ${explore.runningServers.length} loopback server(s))`,
        );
      }

      const autoConfig = await writeAutoConfigIfMissing({
        configPath: resolvedConfigPath,
        manifest: explore,
        baseUrlOverride: params.baseUrl,
      });
      if (autoConfig.wrote) {
        job = patchJobConfigPath(job, resolvedConfigPath);
        job = withoutDiscoverStep(job);
        const loaded = await loadConfig({ configPath: resolvedConfigPath });
        fromConfigServeEnv = loaded.config.serveEnv;
        configPortHints = loaded.config.serve?.portHints;
        effectiveBaseUrl = loaded.config.baseUrl;
        requestedBaseUrl = loaded.config.baseUrl;
      }

      if (params.managedServe) {
        const picked = pickBaseUrlFromExplore(explore, params.baseUrl);
        if (picked) {
          effectiveBaseUrl = picked;
          if (picked !== requestedBaseUrl) {
            // eslint-disable-next-line no-console
            console.log(`Explore: using detected base URL ${picked}`);
          }
        }
      } else {
        const attach = await resolveAttachBaseUrl({
          explore,
          requestedBaseUrl,
          allowUnhealthy: params.managedServeReuse,
        });
        if (!attach) {
          return finishServerNotReady({
            job,
            projectRoot: job.cwd,
            baseUrl: requestedBaseUrl,
            outputDir: resolve(job.cwd, job.outputDir),
            explore: exploreManifest,
            reason: "no-server",
          });
        }
        effectiveBaseUrl = attach.baseUrl;
        // eslint-disable-next-line no-console
        console.log(`Attach: using ${attach.source} server at ${attach.baseUrl}`);
        job = patchDiscoverBaseUrl(job, effectiveBaseUrl);
        job = patchRunBaseUrl(job, effectiveBaseUrl);
      }
    } else if (!params.managedServe) {
      const outputDir = resolve(job.cwd, job.outputDir);
      const cachedExplore = await readExploreManifestIfFresh({
        outputDir,
        projectRoot: job.cwd,
      });
      const exploreForAttach: RepoExploreManifest = cachedExplore ?? {
        schemaVersion: 1,
        status: "ok",
        projectRoot: job.cwd,
        routes: [],
        portHints: [...(configPortHints ?? [])],
        runningServers: [],
        recommendAuditBypass: false,
        elapsedMs: 0,
      };
      if (cachedExplore) {
        exploreManifest = cachedExplore;
        // eslint-disable-next-line no-console
        console.log("Explore: reusing cached manifest for attach probe");
      }
      const attach = await resolveAttachBaseUrl({
        explore: exploreForAttach,
        requestedBaseUrl,
        allowUnhealthy: params.managedServeReuse,
      });
      if (!attach) {
        return finishServerNotReady({
          job,
          projectRoot: job.cwd,
          baseUrl: requestedBaseUrl,
          outputDir,
          explore: exploreManifest,
          reason: "no-server",
        });
      }
      effectiveBaseUrl = attach.baseUrl;
      job = patchDiscoverBaseUrl(job, effectiveBaseUrl);
      job = patchRunBaseUrl(job, effectiveBaseUrl);
    }

    if (params.managedServe) {
      const { serveEnv } = await resolveServeEnvWithConsent({
        projectRoot: job.cwd,
        fromConfig: fromConfigServeEnv,
        fromCli: params.serveEnvOverrides,
        auditBypass: params.noAuditBypass ? false : undefined,
        yes: params.yes,
        nonInteractive: params.nonInteractive,
      });

      try {
        managedServer = await ensureManagedServer({
          projectRoot: job.cwd,
          baseUrl: effectiveBaseUrl,
          mode: params.managedServeMode ?? "production",
          skipBuild: params.managedServeSkipBuild ?? false,
          reuseUnhealthy: params.managedServeReuse ?? false,
          serveEnv,
        });
      } catch {
        return finishServerNotReady({
          job,
          projectRoot: job.cwd,
          baseUrl: effectiveBaseUrl,
          outputDir: resolve(job.cwd, job.outputDir),
          explore: exploreManifest,
          reason: "managed-serve-failed",
        });
      }
      managedBaseUrl = managedServer.baseUrl;
      if (managedServer.startedBySignaler) {
        job = patchDiscoverBaseUrl(job, managedServer.baseUrl);
      }
      job = patchRunBaseUrl(job, managedServer.baseUrl);
    }

    return await runJob();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeJobLatestFailure({
      job,
      failureReason: params.managedServe ? "managed-serve" : "attach",
      failureMessage: message,
    });
    throw error;
  } finally {
    if (managedServer?.startedBySignaler) {
      console.log(
        `Managed serve: stopping ${managedServer.mode} server (lab env cleanup if injected)...`,
      );
      await managedServer.stop();
    }
  }
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
