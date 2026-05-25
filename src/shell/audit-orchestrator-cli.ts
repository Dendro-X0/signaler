import { resolve } from "node:path";
import { runPresetJob } from "../engine/jobs/run-preset-job.js";
import { parseManagedServeMode, resolveManagedServeModeFromEnv, type ManagedServeMode } from "../engine/serve/index.js";
import { printAuditSummary } from "../report-summary.js";

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
  readonly json: boolean;
  readonly summary: boolean;
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
  let inProcess = process.env.SIGNALER_JOB_IN_PROCESS !== "0";
  let managedServe = process.env.SIGNALER_MANAGED_SERVE !== "0";
  let managedServeMode: ManagedServeMode = resolveManagedServeModeFromEnv() ?? "auto";
  let managedServeSkipBuild = false;
  let managedServeReuse = process.env.SIGNALER_MANAGED_SERVE_REUSE === "1";
  let parallel: number | undefined;
  let json = false;
  let summary = false;

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
    if (arg === "--no-in-process") {
      inProcess = false;
      continue;
    }
    if (arg === "--in-process") {
      inProcess = true;
      continue;
    }
    if (arg === "--no-managed-serve") {
      managedServe = false;
      continue;
    }
    if (arg === "--managed-serve" || arg === "--auto-serve") {
      managedServe = true;
      continue;
    }
    if (arg === "--managed-serve-mode" && i + 1 < argv.length) {
      managedServeMode = parseManagedServeMode(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--managed-serve-skip-build") {
      managedServeSkipBuild = true;
      continue;
    }
    if (arg === "--managed-serve-reuse") {
      managedServeReuse = true;
      continue;
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
    if (arg === "--incremental") {
      incremental = true;
      continue;
    }
    if (arg === "--incremental-skip") {
      incrementalSkipPassing = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--summary") {
      summary = true;
    }
  }

  if (!outputDirFromFlag) {
    outputDir = resolve(cwd, ".signaler");
  }

  return {
    cwd,
    outputDir,
    baseUrl,
    configPath,
    routesFile,
    discoverScope,
    skipDiscover,
    inProcess,
    managedServe,
    managedServeMode,
    managedServeSkipBuild,
    managedServeReuse,
    incremental,
    incrementalSkipPassing,
    parallel,
    json,
    summary,
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
    preset: "agent",
  });

  if (args.json) {
    console.log(JSON.stringify(outcome.result, null, 2));
  } else {
    console.log(`Audit ${outcome.result.jobId}: ${outcome.result.status} (${outcome.result.elapsedMs}ms)`);
    console.log(`Artifacts: ${resolve(args.cwd, args.outputDir)}`);
    if (outcome.managedBaseUrl) {
      console.log(`Managed serve: ${outcome.managedBaseUrl}`);
    }
    console.log("Read: .signaler/agent-index.json → performance-triage.json");
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
