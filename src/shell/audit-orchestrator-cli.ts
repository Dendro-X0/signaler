import { resolve } from "node:path";
import { parseQualityProfileName, type QualityProfileName } from "../engine/jobs/quality-profiles.js";
import { parseRunProfileName, type RunProfileName } from "../engine/jobs/run-profiles.js";
import { runPresetJob } from "../engine/jobs/run-preset-job.js";
import { parseArtifactLayoutMode, resolveArtifactLayoutFromEnv, type ArtifactLayoutMode } from "../artifact-layout/index.js";
import { type ManagedServeMode } from "../engine/serve/index.js";
import { printAuditSummary } from "../report-summary.js";
import {
  applyOrchestratorServeFlag,
  createOrchestratorServeDefaults,
  type OrchestratorServeOptions,
} from "./orchestrator-serve-options.js";

export type AuditOrchestratorCliArgs = {
  readonly cwd: string;
  readonly outputDir: string;
  readonly baseUrl?: string;
  readonly configPath?: string;
  readonly routesFile?: string;
  readonly discoverScope: string;
  readonly skipDiscover: boolean;
  readonly inProcess: boolean;
  readonly managedServe: boolean;
  readonly managedServeMode: ManagedServeMode;
  readonly managedServeSkipBuild: boolean;
  readonly managedServeReuse: boolean;
  readonly incremental: boolean;
  readonly incrementalSkipPassing: boolean;
  readonly parallel?: number;
  readonly runProfile?: RunProfileName;
  readonly qualityProfile?: QualityProfileName;
  readonly json: boolean;
  readonly summary: boolean;
  readonly artifactLayout: ArtifactLayoutMode;
  readonly serveEnvOverrides: Readonly<Record<string, string>>;
  readonly labAuth: boolean;
};

export function parseAuditOrchestratorArgs(argv: readonly string[]): AuditOrchestratorCliArgs {
  let cwd = process.cwd();
  let outputDir = resolve(cwd, ".signaler");
  let outputDirFromFlag = false;
  let baseUrl: string | undefined;
  let configPath: string | undefined;
  let discoverScope = process.env.SIGNALER_DISCOVER_SCOPE?.trim() || "full";
  let routesFile: string | undefined;
  let skipDiscover = false;
  let incremental = false;
  let incrementalSkipPassing = false;
  const serveOptions: OrchestratorServeOptions = createOrchestratorServeDefaults();
  let parallel: number | undefined;
  let runProfile: RunProfileName | undefined;
  let qualityProfile: QualityProfileName | undefined;
  let json = false;
  let summary = false;
  let artifactLayout: ArtifactLayoutMode = resolveArtifactLayoutFromEnv();
  let labAuth = false;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--cwd" && i + 1 < argv.length) {
      cwd = resolve(argv[i + 1] ?? cwd);
      i += 1;
      continue;
    }
    if ((arg === "--dir" || arg === "--output-dir") && i + 1 < argv.length) {
      outputDir = resolve(argv[i + 1] ?? outputDir);
      outputDirFromFlag = true;
      i += 1;
      continue;
    }
    if (arg === "--base-url" && i + 1 < argv.length) {
      baseUrl = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--config" && i + 1 < argv.length) {
      configPath = resolve(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--routes-file" && i + 1 < argv.length) {
      routesFile = resolve(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--scope" && i + 1 < argv.length) {
      discoverScope = argv[i + 1] ?? discoverScope;
      i += 1;
      continue;
    }
    if (arg === "--skip-discover" || arg === "--no-discover") {
      skipDiscover = true;
      continue;
    }
    {
      const skip = applyOrchestratorServeFlag(arg, argv, i, serveOptions);
      if (skip >= 0) {
        i += skip;
        continue;
      }
    }
    if (arg === "--parallel" && i + 1 < argv.length) {
      const value = Number.parseInt(argv[i + 1] ?? "", 10);
      if (!Number.isFinite(value) || value < 1 || value > 10) {
        throw new Error(`Invalid --parallel value: ${argv[i + 1]}. Expected integer between 1 and 10.`);
      }
      parallel = value;
      i += 1;
      continue;
    }
    if (arg === "--run-profile" && i + 1 < argv.length) {
      runProfile = parseRunProfileName(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--quality-profile" && i + 1 < argv.length) {
      qualityProfile = parseQualityProfileName(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--incremental") {
      incremental = true;
      continue;
    }
    if (arg === "--incremental-skip") {
      incrementalSkipPassing = true;
      continue;
    }
    if (arg === "--lab-auth") {
      labAuth = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--summary") {
      summary = true;
      continue;
    }
    if (arg === "--artifact-layout" && i + 1 < argv.length) {
      artifactLayout = parseArtifactLayoutMode(argv[i + 1]);
      i += 1;
    }
  }

  if (!outputDirFromFlag) {
    outputDir = resolve(cwd, ".signaler");
  }

  if (qualityProfile && runProfile) {
    throw new Error("Use either --quality-profile or --run-profile, not both.");
  }

  return {
    cwd,
    outputDir,
    baseUrl,
    configPath,
    routesFile,
    discoverScope,
    skipDiscover,
    inProcess: serveOptions.inProcess,
    managedServe: serveOptions.managedServe,
    managedServeMode: serveOptions.managedServeMode,
    managedServeSkipBuild: serveOptions.managedServeSkipBuild,
    managedServeReuse: serveOptions.managedServeReuse,
    incremental,
    incrementalSkipPassing,
    parallel,
    runProfile,
    qualityProfile,
    json,
    summary,
    artifactLayout,
    serveEnvOverrides: serveOptions.serveEnvOverrides,
    labAuth,
  };
}

export async function runAuditOrchestratorCli(argv: readonly string[]): Promise<void> {
  const args = parseAuditOrchestratorArgs(argv);
  const outcome = await runPresetJob({
    cwd: args.cwd,
    outputDir: args.outputDir,
    baseUrl: args.baseUrl,
    configPath: args.configPath,
    discoverScope: args.discoverScope,
    routesFile: args.routesFile,
    skipDiscover: args.skipDiscover,
    incremental: args.incremental,
    incrementalSkipPassing: args.incrementalSkipPassing,
    inProcess: args.inProcess,
    managedServe: args.managedServe,
    managedServeMode: args.managedServeMode,
    managedServeSkipBuild: args.managedServeSkipBuild,
    managedServeReuse: args.managedServeReuse,
    parallel: args.parallel,
    preset: args.runProfile || args.qualityProfile ? undefined : "agent",
    runProfile: args.runProfile,
    qualityProfile: args.qualityProfile,
    artifactLayout: args.artifactLayout,
    serveEnvOverrides: args.serveEnvOverrides,
    labAuth: args.labAuth,
  });

  if (args.json) {
    console.log(JSON.stringify(outcome.result, null, 2));
  } else {
    console.log(`Audit ${outcome.result.jobId}: ${outcome.result.status} (${outcome.result.elapsedMs}ms)`);
    console.log(`Artifacts: ${resolve(args.cwd, args.outputDir)}`);
    if (outcome.managedBaseUrl) {
      console.log(`Managed serve: ${outcome.managedBaseUrl}`);
    }
    console.log("Read: signaler query --view agent|perf --dir .signaler");
  }

  if (args.summary) {
    await printAuditSummary({ outputDir: resolve(args.cwd, args.outputDir) });
  }

  process.exitCode = outcome.exitCode;
  if (!args.json && outcome.exitCode === 2) {
    console.log(
      "Audit partial success: run completed; analyze failed. Use performance-triage.json and signaler query --view perf.",
    );
  }
}
