import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

type Environment = "ci-linux" | "local-6c12t";
type CommandId = "health" | "headers" | "links" | "console";
type EngineId = "node" | "rust";
type EntryStatus = "ok" | "warn" | "error";

type Phase4Entry = {
  readonly environment: Environment;
  readonly command: CommandId;
  readonly engine: EngineId;
  readonly elapsedMs: number;
  readonly taskCount: number;
  readonly errorRate: number;
  readonly retryRate: number;
  readonly status: EntryStatus;
  readonly artifactBytes: number;
  readonly notes?: readonly string[];
};

type Phase4Report = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly entries: readonly Phase4Entry[];
  readonly summary: {
    readonly total: number;
    readonly ok: number;
    readonly warn: number;
    readonly error: number;
  };
};

type CliArgs = {
  readonly environment: Environment;
  readonly outDir: string;
};

const ROOT_DIR = resolve(fileURLToPath(import.meta.url), "..", "..", "..");

function parseArgs(argv: readonly string[]): CliArgs {
  let environment: Environment = "local-6c12t";
  let outDir = resolve(ROOT_DIR, "benchmarks", "out");
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--ci") {
      environment = "ci-linux";
      continue;
    }
    if (arg === "--environment" && i + 1 < argv.length) {
      const value = argv[i + 1];
      if (value === "ci-linux" || value === "local-6c12t") {
        environment = value;
      }
      i += 1;
      continue;
    }
    if (arg.startsWith("--environment=")) {
      const value = arg.slice("--environment=".length);
      if (value === "ci-linux" || value === "local-6c12t") {
        environment = value;
      }
      continue;
    }
    if (arg === "--out-dir" && i + 1 < argv.length) {
      outDir = resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith("--out-dir=")) {
      outDir = resolve(arg.slice("--out-dir=".length));
    }
  }
  return { environment, outDir };
}

function nodeBin(): string {
  return process.execPath;
}

function commandFlag(command: CommandId): string {
  if (command === "health") return "SIGNALER_RUST_HEALTH";
  if (command === "headers") return "SIGNALER_RUST_HEADERS";
  if (command === "links") return "SIGNALER_RUST_LINKS";
  return "SIGNALER_RUST_CONSOLE";
}

function pathFromReq(req: IncomingMessage): string {
  const raw = req.url ?? "/";
  const [path] = raw.split("?");
  return path || "/";
}

async function startServer(): Promise<{ readonly baseUrl: string; close: () => Promise<void> }> {
  const routes = new Set(["/", "/pricing", "/docs", "/blog", "/contact", "/sitemap.xml"]);
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const pathname = pathFromReq(req);
    if (!routes.has(pathname)) {
      res.statusCode = 404;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end("<h1>404</h1>");
      return;
    }
    if (pathname === "/sitemap.xml") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/xml; charset=utf-8");
      const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
      const body = [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
        ...["/", "/pricing", "/docs", "/blog", "/contact"].map((path) => `<url><loc>${origin}${path}</loc></url>`),
        "</urlset>",
      ].join("");
      res.end(body);
      return;
    }
    res.statusCode = 200;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
    res.setHeader("permissions-policy", "geolocation=()");
    res.setHeader("cross-origin-opener-policy", "same-origin");
    res.setHeader("cross-origin-resource-policy", "same-origin");
    res.setHeader("cross-origin-embedder-policy", "require-corp");
    res.setHeader("content-security-policy", "default-src 'self'");
    const nav = ["/", "/pricing", "/docs", "/blog", "/contact", "/missing"].map((path) => `<a href="${path}">${path}</a>`).join(" ");
    res.end(`<!doctype html><html><body><h1>${pathname}</h1>${nav}</body></html>`);
  });
  await new Promise<void>((resolveReady) => {
    server.listen(0, "127.0.0.1", () => resolveReady());
  });
  const address = server.address();
  if (!address || typeof address !== "object") {
    throw new Error("Benchmark server failed to start.");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    },
  };
}

async function runProcess(params: {
  readonly cwd: string;
  readonly args: readonly string[];
  readonly env: Record<string, string | undefined>;
}): Promise<{ readonly exitCode: number; readonly elapsedMs: number }> {
  const started = performance.now();
  const exitCode = await new Promise<number>((resolveExit) => {
    const child = spawn(nodeBin(), params.args, {
      cwd: params.cwd,
      env: { ...process.env, ...params.env },
      stdio: ["ignore", "ignore", "pipe"],
      shell: false,
    });
    child.stderr.on("data", () => undefined);
    child.on("error", () => resolveExit(1));
    child.on("close", (code) => resolveExit(code ?? 1));
  });
  return {
    exitCode,
    elapsedMs: performance.now() - started,
  };
}

async function readArtifactBytes(pathToFile: string): Promise<number> {
  try {
    return (await stat(pathToFile)).size;
  } catch {
    return 0;
  }
}

async function runOne(params: {
  readonly command: CommandId;
  readonly engine: EngineId;
  readonly workspaceDir: string;
  readonly configPath: string;
  readonly environment: Environment;
}): Promise<Phase4Entry> {
  const signalerDir = resolve(params.workspaceDir, ".signaler");
  const artifactPath = resolve(signalerDir, `${params.command}.json`);
  const args: string[] = [resolve(ROOT_DIR, "dist", "bin.js"), params.command, "--config", params.configPath];
  if (params.command === "links") {
    args.push("--max-urls", "120");
  }
  const env = params.engine === "rust"
    ? {
      SIGNALER_RUST_NETWORK: "1",
      [commandFlag(params.command)]: "1",
    }
    : {
      SIGNALER_RUST_NETWORK: undefined,
      SIGNALER_RUST_HEALTH: undefined,
      SIGNALER_RUST_HEADERS: undefined,
      SIGNALER_RUST_LINKS: undefined,
      SIGNALER_RUST_CONSOLE: undefined,
    };

  const proc = await runProcess({
    cwd: params.workspaceDir,
    args,
    env,
  });
  const artifactBytes = await readArtifactBytes(artifactPath);
  let taskCount = 0;
  let errorCount = 0;
  const notes: string[] = [];
  try {
    const raw = await readFile(artifactPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const meta = (parsed.meta ?? {}) as Record<string, unknown>;
    const results = Array.isArray(parsed.results) ? (parsed.results as Record<string, unknown>[]) : [];
    if (params.command === "links") {
      const discovered = (parsed.discovered ?? {}) as Record<string, unknown>;
      taskCount = typeof discovered.total === "number" ? discovered.total : results.length;
      const broken = Array.isArray(parsed.broken) ? parsed.broken.length : 0;
      errorCount = broken;
    } else if (params.command === "console") {
      taskCount = typeof meta.comboCount === "number" ? meta.comboCount : results.length;
      errorCount = results.filter((item) => item.status === "error" || typeof item.runtimeErrorMessage === "string").length;
    } else {
      taskCount = typeof meta.comboCount === "number" ? meta.comboCount : results.length;
      errorCount = results.filter((item) => typeof item.runtimeErrorMessage === "string").length;
    }
    const accelerator = (meta.accelerator ?? {}) as Record<string, unknown>;
    if (typeof accelerator.fallbackReason === "string" && accelerator.fallbackReason.length > 0) {
      notes.push(`fallback: ${accelerator.fallbackReason}`);
    }
  } catch {
    notes.push("artifact parse failed");
  }

  const errorRate = taskCount > 0 ? errorCount / taskCount : (proc.exitCode === 0 ? 0 : 1);
  const status: EntryStatus = proc.exitCode !== 0
    ? "error"
    : errorRate > 0
      ? "warn"
      : "ok";
  return {
    environment: params.environment,
    command: params.command,
    engine: params.engine,
    elapsedMs: proc.elapsedMs,
    taskCount,
    errorRate,
    retryRate: 0,
    status,
    artifactBytes,
    notes: notes.length > 0 ? notes : undefined,
  };
}

function reportToMarkdown(report: Phase4Report): string {
  const lines: string[] = [
    "# Phase 4 Benchmark Baseline",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "| Command | Engine | Elapsed(ms) | Tasks | Error Rate | Status | Artifact Bytes |",
    "|---|---:|---:|---:|---:|---|---:|",
  ];
  for (const entry of report.entries) {
    lines.push(
      `| ${entry.command} | ${entry.engine} | ${Math.round(entry.elapsedMs)} | ${entry.taskCount} | ${entry.errorRate.toFixed(3)} | ${entry.status} | ${entry.artifactBytes} |`,
    );
  }
  lines.push("", `Summary: total=${report.summary.total}, ok=${report.summary.ok}, warn=${report.summary.warn}, error=${report.summary.error}`);
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const workspaceDir = resolve(ROOT_DIR, "benchmarks", "workspaces", "phase4-network");
  const signalerDir = resolve(workspaceDir, ".signaler");
  await rm(signalerDir, { recursive: true, force: true });
  await mkdir(workspaceDir, { recursive: true });
  await mkdir(args.outDir, { recursive: true });

  const server = await startServer();
  try {
    const configPath = resolve(workspaceDir, "signaler.config.json");
    const config = {
      baseUrl: server.baseUrl,
      pages: [
        { path: "/", label: "home", devices: ["mobile", "desktop"] },
        { path: "/pricing", label: "pricing", devices: ["mobile", "desktop"] },
        { path: "/docs", label: "docs", devices: ["mobile", "desktop"] },
        { path: "/blog", label: "blog", devices: ["mobile", "desktop"] },
        { path: "/contact", label: "contact", devices: ["mobile", "desktop"] },
      ],
    };
    await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");

    const entries: Phase4Entry[] = [];
    for (const command of ["health", "headers", "links", "console"] as const) {
      entries.push(await runOne({ command, engine: "node", workspaceDir, configPath, environment: args.environment }));
      entries.push(await runOne({ command, engine: "rust", workspaceDir, configPath, environment: args.environment }));
    }

    const report: Phase4Report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      entries,
      summary: {
        total: entries.length,
        ok: entries.filter((entry) => entry.status === "ok").length,
        warn: entries.filter((entry) => entry.status === "warn").length,
        error: entries.filter((entry) => entry.status === "error").length,
      },
    };

    const jsonPath = resolve(args.outDir, "phase4-baseline.json");
    const mdPath = resolve(args.outDir, "phase4-baseline.md");
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeFile(mdPath, reportToMarkdown(report), "utf8");
    console.log(`[phase4] wrote ${jsonPath}`);
    console.log(`[phase4] wrote ${mdPath}`);
  } finally {
    await server.close();
  }
}

void main();
