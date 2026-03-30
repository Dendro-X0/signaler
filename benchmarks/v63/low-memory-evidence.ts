import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { runAuditCli } from "../../src/cli.js";

type CaseSummary = {
  readonly id: "baseline" | "forced-low-memory";
  readonly outputDir: string;
  readonly elapsedMs: number;
  readonly resolvedParallel: number;
  readonly stabilityStatus: string;
  readonly resourceProfile: {
    readonly cpuCount: number;
    readonly freeMemoryMB: number;
    readonly baseParallelCap: number;
    readonly appliedParallelCap: number;
    readonly reasons: readonly string[];
  } | undefined;
};

type EvidenceReport = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly status: "pass" | "fail";
  readonly workspaceDir: string;
  readonly baseUrl: string;
  readonly baseline: CaseSummary;
  readonly forcedLowMemory: CaseSummary;
  readonly assertions: {
    readonly lowMemoryReasonPresent: boolean;
    readonly forcedProfileReasonPresent: boolean;
    readonly parallelCappedToOne: boolean;
    readonly stableRunner: boolean;
    readonly predictabilityImproved: boolean;
  };
};

type RunJsonShape = {
  readonly meta?: {
    readonly elapsedMs?: number;
    readonly resolvedParallel?: number;
    readonly runnerStability?: {
      readonly status?: string;
    };
  };
  readonly runtime?: {
    readonly resourceProfile?: {
      readonly cpuCount?: number;
      readonly freeMemoryMB?: number;
      readonly baseParallelCap?: number;
      readonly appliedParallelCap?: number;
      readonly reasons?: readonly string[];
    };
  };
};

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(SCRIPT_PATH, "..", "..", "..");

function requestPath(req: IncomingMessage): string {
  const raw = req.url ?? "/";
  const [pathname] = raw.split("?");
  const normalized = pathname && pathname.length > 0 ? pathname : "/";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function renderPage(pathname: string): string {
  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Signaler Low Memory Evidence</title></head>",
    "<body>",
    `<h1>Low memory evidence ${pathname}</h1>`,
    "</body>",
    "</html>",
  ].join("");
}

async function startServer(): Promise<{ readonly baseUrl: string; close: () => Promise<void> }> {
  const routeSet = new Set<string>(["/"]);
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const pathname = requestPath(req);
    if (!routeSet.has(pathname)) {
      res.statusCode = 404;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(renderPage("/404"));
      return;
    }
    res.statusCode = 200;
    res.setHeader("cache-control", "no-store");
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(renderPage(pathname));
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
    throw new Error("Unable to bind benchmark server.");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    },
  };
}

async function readJson<T>(pathToFile: string): Promise<T> {
  const raw = await readFile(pathToFile, "utf8");
  return JSON.parse(raw) as T;
}

async function writeJson(pathToFile: string, value: unknown): Promise<void> {
  await mkdir(dirname(pathToFile), { recursive: true });
  await writeFile(pathToFile, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fileExists(pathToFile: string): Promise<boolean> {
  try {
    await stat(pathToFile);
    return true;
  } catch {
    return false;
  }
}

function toMarkdown(report: EvidenceReport): string {
  const lines: string[] = [];
  lines.push("# V6.3 Low-Memory Evidence");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Status: ${report.status.toUpperCase()}`);
  lines.push(`Workspace: ${report.workspaceDir}`);
  lines.push(`Base URL: ${report.baseUrl}`);
  lines.push("");
  lines.push("## Baseline");
  lines.push("");
  lines.push(`- elapsedMs: ${report.baseline.elapsedMs}`);
  lines.push(`- resolvedParallel: ${report.baseline.resolvedParallel}`);
  lines.push(`- stabilityStatus: ${report.baseline.stabilityStatus}`);
  lines.push(`- reasons: ${(report.baseline.resourceProfile?.reasons ?? []).join(", ") || "(none)"}`);
  lines.push("");
  lines.push("## Forced Low Memory");
  lines.push("");
  lines.push(`- elapsedMs: ${report.forcedLowMemory.elapsedMs}`);
  lines.push(`- resolvedParallel: ${report.forcedLowMemory.resolvedParallel}`);
  lines.push(`- stabilityStatus: ${report.forcedLowMemory.stabilityStatus}`);
  lines.push(`- reasons: ${(report.forcedLowMemory.resourceProfile?.reasons ?? []).join(", ") || "(none)"}`);
  lines.push("");
  lines.push("## Assertions");
  lines.push("");
  for (const [key, value] of Object.entries(report.assertions)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function runCase(params: {
  readonly id: CaseSummary["id"];
  readonly configPath: string;
  readonly outputDir: string;
  readonly forceCpuCount?: number;
  readonly forceFreeMemoryMB?: number;
}): Promise<CaseSummary> {
  await rm(params.outputDir, { recursive: true, force: true });
  const previousCpu = process.env.SIGNALER_FORCE_CPU_COUNT;
  const previousMem = process.env.SIGNALER_FORCE_FREE_MEMORY_MB;
  if (params.forceCpuCount !== undefined) {
    process.env.SIGNALER_FORCE_CPU_COUNT = String(params.forceCpuCount);
  } else {
    delete process.env.SIGNALER_FORCE_CPU_COUNT;
  }
  if (params.forceFreeMemoryMB !== undefined) {
    process.env.SIGNALER_FORCE_FREE_MEMORY_MB = String(params.forceFreeMemoryMB);
  } else {
    delete process.env.SIGNALER_FORCE_FREE_MEMORY_MB;
  }

  const startedAtMs = performance.now();
  process.exitCode = 0;
  try {
    await runAuditCli([
      "node",
      "signaler",
      "run",
      "--config",
      params.configPath,
      "--output-dir",
      params.outputDir,
      "--contract",
      "v3",
      "--mode",
      "throughput",
      "--yes",
      "--no-color",
    ]);
  } finally {
    if (previousCpu === undefined) {
      delete process.env.SIGNALER_FORCE_CPU_COUNT;
    } else {
      process.env.SIGNALER_FORCE_CPU_COUNT = previousCpu;
    }
    if (previousMem === undefined) {
      delete process.env.SIGNALER_FORCE_FREE_MEMORY_MB;
    } else {
      process.env.SIGNALER_FORCE_FREE_MEMORY_MB = previousMem;
    }
  }
  const exitCode = process.exitCode ?? 0;
  if (exitCode !== 0) {
    throw new Error(`runAuditCli failed for case=${params.id} with exitCode=${exitCode}`);
  }

  const elapsedMs = Math.round(performance.now() - startedAtMs);
  const runJsonPath = resolve(params.outputDir, "run.json");
  const runJson = await readJson<RunJsonShape>(runJsonPath);
  const resourceProfile = runJson.runtime?.resourceProfile;
  return {
    id: params.id,
    outputDir: params.outputDir,
    elapsedMs: runJson.meta?.elapsedMs ?? elapsedMs,
    resolvedParallel: runJson.meta?.resolvedParallel ?? -1,
    stabilityStatus: runJson.meta?.runnerStability?.status ?? "unknown",
    resourceProfile: resourceProfile === undefined
      ? undefined
      : {
        cpuCount: resourceProfile.cpuCount ?? -1,
        freeMemoryMB: resourceProfile.freeMemoryMB ?? -1,
        baseParallelCap: resourceProfile.baseParallelCap ?? -1,
        appliedParallelCap: resourceProfile.appliedParallelCap ?? -1,
        reasons: resourceProfile.reasons ?? [],
      },
  };
}

async function main(): Promise<void> {
  const workspaceDir = resolve(ROOT, "benchmarks", "workspaces", "v63-low-memory-evidence");
  const configPath = resolve(workspaceDir, "signaler.config.json");
  const baselineOutputDir = resolve(workspaceDir, ".signaler-baseline");
  const forcedOutputDir = resolve(workspaceDir, ".signaler-low-memory");
  const outJsonPath = resolve(ROOT, "benchmarks", "out", "v63-low-memory-evidence.json");
  const outMarkdownPath = resolve(ROOT, "benchmarks", "out", "v63-low-memory-evidence.md");

  await rm(workspaceDir, { recursive: true, force: true });
  await mkdir(workspaceDir, { recursive: true });
  const server = await startServer();
  try {
    await writeFile(
      configPath,
      `${JSON.stringify(
        {
          baseUrl: server.baseUrl,
          runs: 1,
          pages: [
            { path: "/", label: "home", devices: ["mobile", "desktop"] },
          ],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const baseline = await runCase({
      id: "baseline",
      configPath,
      outputDir: baselineOutputDir,
    });
    const forcedLowMemory = await runCase({
      id: "forced-low-memory",
      configPath,
      outputDir: forcedOutputDir,
      forceCpuCount: 4,
      forceFreeMemoryMB: 2048,
    });

    const lowReasons = forcedLowMemory.resourceProfile?.reasons ?? [];
    const assertions = {
      lowMemoryReasonPresent: lowReasons.includes("low-memory"),
      forcedProfileReasonPresent: lowReasons.includes("forced-resource-profile"),
      parallelCappedToOne: forcedLowMemory.resolvedParallel === 1,
      stableRunner: forcedLowMemory.stabilityStatus === "stable",
      predictabilityImproved: forcedLowMemory.resolvedParallel <= baseline.resolvedParallel,
    } as const;
    const status: EvidenceReport["status"] = Object.values(assertions).every(Boolean) ? "pass" : "fail";

    const report: EvidenceReport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      status,
      workspaceDir,
      baseUrl: server.baseUrl,
      baseline,
      forcedLowMemory,
      assertions,
    };

    await writeJson(outJsonPath, report);
    await writeFile(outMarkdownPath, toMarkdown(report), "utf8");

    if (!(await fileExists(outJsonPath)) || !(await fileExists(outMarkdownPath))) {
      throw new Error("Low-memory evidence outputs were not written.");
    }
    if (status !== "pass") {
      throw new Error("Low-memory evidence assertions failed.");
    }
    console.log(`V6.3 low-memory evidence generated: ${outJsonPath}`);
  } finally {
    await server.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
