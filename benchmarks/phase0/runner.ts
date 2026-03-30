import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildPhase0Report, collectPhase0Entry } from "./collect.js";
import { runRustDiscoveryProbe } from "./rust-probe.js";
import type {
  BaselineEnvironment,
  BenchmarkProfile,
  BenchmarkRoute,
  BenchmarkRunMode,
  Phase0BaselineReport,
  Phase0ReportEntry,
  Phase0Toolchain,
  RustProbeResult,
} from "./types.js";
import { validatePhase0ReportFile } from "./validate.js";

type RunnerArgs = {
  readonly environment: BaselineEnvironment;
  readonly ciMode: boolean;
  readonly selectedProfiles?: readonly string[];
  readonly forcedModes?: readonly BenchmarkRunMode[];
  readonly outDir: string;
};

type SyntheticServer = {
  readonly baseUrl: string;
  close: () => Promise<void>;
};

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT_DIR = resolve(SCRIPT_PATH, "..", "..", "..");
const DEFAULT_OUTPUT_DIR = resolve(ROOT_DIR, "benchmarks", "out");
const DEFAULT_CI_PROFILES: readonly string[] = ["synthetic-small", "synthetic-medium", "real-next-blogkit-pro"];

function parseArgList(raw: string | undefined): readonly string[] | undefined {
  if (raw === undefined || raw.trim().length === 0) {
    return undefined;
  }
  return raw.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
}

function parseArgs(argv: readonly string[]): RunnerArgs {
  let environment: BaselineEnvironment = "local-6c12t";
  let ciMode = false;
  let selectedProfiles: readonly string[] | undefined;
  let forcedModes: readonly BenchmarkRunMode[] | undefined;
  let outDir = DEFAULT_OUTPUT_DIR;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--ci") {
      ciMode = true;
      environment = "ci-linux";
      selectedProfiles = DEFAULT_CI_PROFILES;
      continue;
    }
    if (arg === "--environment" && index + 1 < argv.length) {
      const value = argv[index + 1];
      if (value === "ci-linux" || value === "local-6c12t") {
        environment = value;
      }
      index += 1;
      continue;
    }
    if (arg.startsWith("--environment=")) {
      const value = arg.slice("--environment=".length);
      if (value === "ci-linux" || value === "local-6c12t") {
        environment = value;
      }
      continue;
    }
    if (arg === "--profiles" && index + 1 < argv.length) {
      selectedProfiles = parseArgList(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith("--profiles=")) {
      selectedProfiles = parseArgList(arg.slice("--profiles=".length));
      continue;
    }
    if (arg === "--modes" && index + 1 < argv.length) {
      const parsed = parseArgList(argv[index + 1])?.filter((mode): mode is BenchmarkRunMode => mode === "throughput" || mode === "fidelity");
      forcedModes = parsed;
      index += 1;
      continue;
    }
    if (arg.startsWith("--modes=")) {
      forcedModes = parseArgList(arg.slice("--modes=".length))?.filter(
        (mode): mode is BenchmarkRunMode => mode === "throughput" || mode === "fidelity",
      );
      continue;
    }
    if (arg === "--out-dir" && index + 1 < argv.length) {
      outDir = resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith("--out-dir=")) {
      outDir = resolve(arg.slice("--out-dir=".length));
    }
  }

  return {
    environment,
    ciMode,
    selectedProfiles,
    forcedModes,
    outDir,
  };
}

function commandForBinary(binary: "pnpm" | "rustc"): string {
  if (process.platform === "win32") {
    return binary === "pnpm" ? "pnpm.cmd" : "rustc.exe";
  }
  return binary;
}

async function runProcess(params: {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly captureStdout?: boolean;
}): Promise<{ readonly code: number; readonly stdout: string; readonly stderr: string }> {
  return await new Promise((resolveProcess) => {
    const child = spawn(params.command, params.args, {
      cwd: params.cwd,
      shell: false,
      stdio: params.captureStdout ? ["ignore", "pipe", "pipe"] : ["ignore", "inherit", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    if (params.captureStdout) {
      child.stdout.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });
    }
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolveProcess({ code: 1, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      resolveProcess({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function fileExists(pathToFile: string): Promise<boolean> {
  try {
    await access(pathToFile);
    return true;
  } catch {
    return false;
  }
}

async function discoverProfileFiles(): Promise<readonly string[]> {
  const roots = [
    resolve(ROOT_DIR, "benchmarks", "profiles", "synthetic"),
    resolve(ROOT_DIR, "benchmarks", "profiles", "real"),
  ];
  const files: string[] = [];
  for (const root of roots) {
    if (!(await fileExists(root))) {
      continue;
    }
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(resolve(root, entry.name));
      }
    }
  }
  return files;
}

async function readProfile(pathToFile: string): Promise<BenchmarkProfile> {
  const raw = await readFile(pathToFile, "utf8");
  return JSON.parse(raw) as BenchmarkProfile;
}

function isEnvToken(value: string): string | undefined {
  const match = /^\$\{([A-Z0-9_]+)\}$/.exec(value.trim());
  return match?.[1];
}

function modeDefaults(mode: BenchmarkRunMode): {
  readonly parallel: number;
  readonly warmUp: boolean;
  readonly runs: number;
  readonly throttlingMethod: "simulate" | "devtools";
  readonly sessionIsolation: "shared" | "per-audit";
} {
  if (mode === "fidelity") {
    return {
      parallel: 1,
      warmUp: true,
      runs: 1,
      throttlingMethod: "devtools",
      sessionIsolation: "per-audit",
    };
  }
  return {
    parallel: 3,
    warmUp: false,
    runs: 1,
    throttlingMethod: "simulate",
    sessionIsolation: "shared",
  };
}

function renderBenchmarkPage(route: string): string {
  const payload = route.length * 80;
  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"utf-8\">",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `  <title>Signaler Benchmark ${route}</title>`,
    "  <style>body{font-family:system-ui,sans-serif;margin:0;background:#0b1220;color:#e6edf3;padding:2rem}main{max-width:960px;margin:0 auto}</style>",
    "</head>",
    "<body>",
    "  <main>",
    `    <h1>Benchmark Route ${route}</h1>`,
    `    <p data-route=\"${route}\">Synthetic benchmark payload ${payload}</p>`,
    "  </main>",
    "  <script>",
    "    window.__SIGNALER_BENCH__ = { ready: true, ts: Date.now() };",
    "  </script>",
    "</body>",
    "</html>",
  ].join("\n");
}

function normalizePath(pathname: string): string {
  if (pathname.length === 0) {
    return "/";
  }
  if (pathname.startsWith("/")) {
    return pathname;
  }
  return `/${pathname}`;
}

function getRequestPath(req: IncomingMessage): string {
  const raw = req.url ?? "/";
  const [pathname] = raw.split("?");
  return normalizePath(pathname ?? "/");
}

async function startSyntheticServer(routes: readonly BenchmarkRoute[]): Promise<SyntheticServer> {
  const routeSet = new Set(routes.map((route) => normalizePath(route.path)));
  routeSet.add("/");
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const requestPath = getRequestPath(req);
    if (!routeSet.has(requestPath)) {
      res.statusCode = 404;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(renderBenchmarkPage("/404"));
      return;
    }
    res.statusCode = 200;
    res.setHeader("cache-control", "no-store");
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(renderBenchmarkPage(requestPath));
  });
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Synthetic benchmark server failed to bind.");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    close: async () => {
      await new Promise<void>((resolveClose) => {
        server.close(() => resolveClose());
      });
    },
  };
}

async function clearSignalerArtifacts(projectRoot: string): Promise<void> {
  const signalerDir = resolve(projectRoot, ".signaler");
  await mkdir(signalerDir, { recursive: true });
  const targets = [
    "summary.json",
    "summary.md",
    "summary-lite.json",
    "run.json",
    "results.json",
    "suggestions.json",
    "agent-index.json",
    "issues.json",
    "ai-ledger.json",
    "discovery.json",
  ];
  for (const target of targets) {
    await rm(resolve(signalerDir, target), { force: true });
  }
}

function resolveBaseUrl(profile: BenchmarkProfile, syntheticBaseUrl?: string): string | undefined {
  if (profile.baseUrl === "__SYNTHETIC_BASE_URL__") {
    return syntheticBaseUrl;
  }
  const token = isEnvToken(profile.baseUrl);
  if (token === undefined) {
    return profile.baseUrl;
  }
  const envValue = process.env[token];
  if (envValue === undefined || envValue.trim().length === 0) {
    return undefined;
  }
  return envValue.trim();
}

async function writeDiscoveryContract(profile: BenchmarkProfile, projectRoot: string): Promise<void> {
  const signalerDir = resolve(projectRoot, ".signaler");
  await mkdir(signalerDir, { recursive: true });
  const totals = profile.expectedDetection ?? {
    detected: profile.routes.length,
    selected: profile.routes.length,
    excludedDynamic: 0,
    excludedByFilter: 0,
    excludedByScope: 0,
  };
  const discovery = {
    generatedAt: new Date().toISOString(),
    scope: "benchmark",
    repoRoot: projectRoot,
    baseUrl: profile.baseUrl,
    totals,
    routes: {
      selected: profile.routes.map((route) => route.path),
      excludedDynamic: [],
    },
    benchmarkContract: {
      profileId: profile.id,
      kind: profile.kind,
      exclusionRules: profile.exclusionRules ?? {},
      expectedCombos: profile.expectedCombos,
    },
  };
  await writeFile(resolve(signalerDir, "discovery.json"), `${JSON.stringify(discovery, null, 2)}\n`, "utf8");
}

function buildConfig(profile: BenchmarkProfile, mode: BenchmarkRunMode, baseUrl: string): Record<string, unknown> {
  const defaults = modeDefaults(mode);
  const modeOverrides = profile.modeConfig?.[mode] ?? {};
  return {
    baseUrl,
    runs: modeOverrides.runs ?? defaults.runs,
    parallel: modeOverrides.parallel ?? defaults.parallel,
    warmUp: modeOverrides.warmUp ?? defaults.warmUp,
    throttlingMethod: modeOverrides.throttlingMethod ?? defaults.throttlingMethod,
    sessionIsolation: defaults.sessionIsolation,
    throughputBackoff: mode === "throughput" ? "auto" : "off",
    pages: profile.routes.map((route) => ({
      path: route.path,
      label: route.label,
      devices: profile.devices,
    })),
  };
}

async function runBenchmarkCase(params: {
  readonly profile: BenchmarkProfile;
  readonly profilePath: string;
  readonly mode: BenchmarkRunMode;
  readonly environment: BaselineEnvironment;
  readonly outDir: string;
  readonly toolchain: Phase0Toolchain;
  readonly rustProbe?: RustProbeResult;
}): Promise<Phase0ReportEntry> {
  const projectRoot = resolve(ROOT_DIR, params.profile.projectRoot);
  await clearSignalerArtifacts(projectRoot);
  await writeDiscoveryContract(params.profile, projectRoot);

  let syntheticServer: SyntheticServer | undefined;
  try {
    if (params.profile.kind === "synthetic") {
      syntheticServer = await startSyntheticServer(params.profile.routes);
    }

    const baseUrl = resolveBaseUrl(params.profile, syntheticServer?.baseUrl);
    if (baseUrl === undefined) {
      return await collectPhase0Entry({
        environment: params.environment,
        profile: params.profile,
        runMode: params.mode,
        projectRoot,
        fallbackElapsedMs: 0,
        commandExitCode: 0,
        toolchain: params.toolchain,
        rustProbe: params.rustProbe,
        notes: [
          `Skipped run: unresolved base URL for profile ${params.profile.id}.`,
          "Provide env var from profile baseUrl token before running this benchmark.",
        ],
      });
    }

    const tmpDir = resolve(params.outDir, "tmp");
    await mkdir(tmpDir, { recursive: true });
    const configPath = resolve(tmpDir, `${params.profile.id}-${params.mode}.config.json`);
    const config = buildConfig(params.profile, params.mode, baseUrl);
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    const caseOutputDir = resolve(projectRoot, ".signaler");

    const runAuditModulePath = pathToFileURL(resolve(ROOT_DIR, "src", "cli.ts")).href;
    const runAuditModule = await import(runAuditModulePath) as { readonly runAuditCli: (argv: readonly string[]) => Promise<void> };
    const cliArgs: readonly string[] = [
      "node",
      "signaler",
      "run",
      "--config",
      configPath,
      "--output-dir",
      caseOutputDir,
      "--contract",
      "v3",
      "--mode",
      params.mode,
      "--yes",
      "--no-color",
    ];
    const started = performance.now();
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    let commandExitCode = 0;
    let commandError: string | undefined;
    try {
      await runAuditModule.runAuditCli(cliArgs);
      commandExitCode = process.exitCode ?? 0;
    } catch (error) {
      commandExitCode = 1;
      commandError = error instanceof Error ? error.message : String(error);
    } finally {
      process.exitCode = previousExitCode;
    }
    const elapsedMs = Math.round(performance.now() - started);

    return await collectPhase0Entry({
      environment: params.environment,
      profile: params.profile,
      runMode: params.mode,
      projectRoot,
      fallbackElapsedMs: elapsedMs,
      commandExitCode,
      commandError,
      toolchain: params.toolchain,
      rustProbe: params.rustProbe,
    });
  } finally {
    if (syntheticServer !== undefined) {
      await syntheticServer.close();
    }
  }
}

function buildMarkdown(report: Phase0BaselineReport): string {
  const lines: string[] = [];
  lines.push("# Signaler V5 Phase 0 Baseline");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push("| Env | Profile | Mode | Status | Elapsed (ms) | Avg Step (ms) | Combos | Parallel |");
  lines.push("| --- | --- | --- | --- | ---: | ---: | ---: | ---: |");
  for (const entry of report.entries) {
    lines.push(
      `| ${entry.environment} | ${entry.profileId} | ${entry.runMode} | ${entry.status} | ${entry.metrics.elapsedMs} | ${entry.metrics.avgStepMs} | ${entry.metrics.comboCount} | ${entry.metrics.resolvedParallel} |`,
    );
  }
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- total: ${report.summary.total}`);
  lines.push(`- ok: ${report.summary.ok}`);
  lines.push(`- warn: ${report.summary.warn}`);
  lines.push(`- error: ${report.summary.error}`);
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  const noteRows = report.entries.flatMap((entry) =>
    (entry.notes ?? []).map((note) => `- [${entry.profileId}/${entry.runMode}] ${note}`),
  );
  if (noteRows.length === 0) {
    lines.push("- none");
  } else {
    lines.push(...noteRows);
  }
  lines.push("");
  lines.push("## TODO");
  lines.push("");
  lines.push("- Phase 1: convert observe-only deltas into hard regression gates.");
  lines.push("");
  return lines.join("\n");
}

async function detectRustVersion(): Promise<string | undefined> {
  const result = await runProcess({
    command: commandForBinary("rustc"),
    args: ["--version"],
    cwd: ROOT_DIR,
    captureStdout: true,
  });
  if (result.code !== 0 || result.stdout.length === 0) {
    return undefined;
  }
  return result.stdout.trim();
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.outDir, { recursive: true });

  const profileFiles = await discoverProfileFiles();
  if (profileFiles.length === 0) {
    throw new Error("No benchmark profile files found under benchmarks/profiles.");
  }
  const allProfiles = await Promise.all(profileFiles.map((profileFile) => readProfile(profileFile)));
  const selected = args.selectedProfiles === undefined
    ? allProfiles
    : allProfiles.filter((profile) => args.selectedProfiles?.includes(profile.id));
  if (selected.length === 0) {
    throw new Error("No benchmark profiles matched the selection.");
  }

  const toolchain: Phase0Toolchain = {
    nodeVersion: process.version,
    rustVersion: await detectRustVersion(),
  };

  const entries: Phase0ReportEntry[] = [];
  for (const profile of selected) {
    const profilePath = profileFiles.find((filePath) => filePath.endsWith(`${profile.id}.json`));
    if (profilePath === undefined) {
      continue;
    }
    const rustProbe = await runRustDiscoveryProbe({
      profile,
      profilePath,
      outputDir: args.outDir,
      rootDir: ROOT_DIR,
    });
    const runModes = args.forcedModes !== undefined && args.forcedModes.length > 0
      ? profile.runModes.filter((mode) => args.forcedModes?.includes(mode))
      : profile.runModes;
    for (const mode of runModes) {
      console.log(`[phase0] profile=${profile.id} mode=${mode}`);
      const entry = await runBenchmarkCase({
        profile,
        profilePath,
        mode,
        environment: args.environment,
        outDir: args.outDir,
        toolchain,
        rustProbe,
      });
      entries.push(entry);
    }
  }

  if (entries.length === 0) {
    throw new Error("No benchmark entries were generated.");
  }

  const report = buildPhase0Report(entries);
  const jsonPath = resolve(args.outDir, "phase0-baseline.json");
  const mdPath = resolve(args.outDir, "phase0-baseline.md");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(mdPath, buildMarkdown(report), "utf8");

  const validation = await validatePhase0ReportFile(jsonPath);
  if (!validation.ok) {
    console.error("Phase 0 baseline validation failed:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  if (args.ciMode) {
    console.log("## Phase 0 Benchmark Summary (observe-only)");
    console.log(await readFile(mdPath, "utf8"));
    console.log("TODO(phase1): enforce regression gate once baseline confidence is stable.");
  }
  console.log(`Saved Phase 0 baseline report: ${jsonPath}`);
  console.log(`Saved Phase 0 baseline markdown: ${mdPath}`);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  void run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
