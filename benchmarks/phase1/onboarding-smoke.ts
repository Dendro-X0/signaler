import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { runWizardCli } from "../../src/wizard-cli.js";
import { runAuditCli } from "../../src/cli.js";
import { runReportCli } from "../../src/report-cli.js";

type BenchmarkRoute = { readonly path: string; readonly label: string };
type BenchmarkProfile = { readonly routes: readonly BenchmarkRoute[] };

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(SCRIPT_PATH, "..", "..", "..");
const MAX_ELAPSED_MS = 10 * 60 * 1000;

function normalizePath(pathname: string): string {
  if (pathname.length === 0) {
    return "/";
  }
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function requestPath(req: IncomingMessage): string {
  const raw = req.url ?? "/";
  const [pathname] = raw.split("?");
  return normalizePath(pathname ?? "/");
}

function renderPage(pathname: string): string {
  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Signaler Onboarding</title></head>",
    "<body>",
    `<h1>Onboarding Smoke ${pathname}</h1>`,
    `<p data-path=\"${pathname}\">ok</p>`,
    "</body>",
    "</html>",
  ].join("");
}

async function startServer(routes: readonly BenchmarkRoute[]): Promise<{ readonly baseUrl: string; close: () => Promise<void> }> {
  const routeSet = new Set(routes.map((route) => normalizePath(route.path)));
  routeSet.add("/");
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
    throw new Error("Failed to bind onboarding smoke server.");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    },
  };
}

async function fileExists(pathToFile: string): Promise<boolean> {
  try {
    await readFile(pathToFile, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(pathToFile: string): Promise<T> {
  const raw = await readFile(pathToFile, "utf8");
  return JSON.parse(raw) as T;
}

async function run(): Promise<void> {
  const profilePath = resolve(ROOT, "benchmarks", "profiles", "synthetic", "synthetic-small.json");
  const profile = await readJson<BenchmarkProfile>(profilePath);
  const workspaceRoot = resolve(ROOT, "benchmarks", "workspaces", "phase1-onboarding-smoke");
  await rm(workspaceRoot, { recursive: true, force: true });
  await mkdir(workspaceRoot, { recursive: true });
  await writeFile(resolve(workspaceRoot, "package.json"), `${JSON.stringify({ name: "phase1-onboarding-smoke", private: true }, null, 2)}\n`, "utf8");
  const routesFilePath = resolve(workspaceRoot, "routes.txt");
  await writeFile(routesFilePath, `${profile.routes.map((route) => route.path).join("\n")}\n`, "utf8");
  const configPath = resolve(workspaceRoot, "signaler.config.json");
  const outputDir = resolve(workspaceRoot, ".signaler");

  const server = await startServer(profile.routes);
  const started = performance.now();
  try {
    await runWizardCli([
      "node",
      "signaler",
      "discover",
      "--config",
      configPath,
      "--scope",
      "file",
      "--routes-file",
      routesFilePath,
      "--base-url",
      server.baseUrl,
      "--project-root",
      workspaceRoot,
      "--profile",
      "custom",
      "--non-interactive",
      "--yes",
    ]);
    await runAuditCli([
      "node",
      "signaler",
      "run",
      "--config",
      configPath,
      "--output-dir",
      outputDir,
      "--contract",
      "v3",
      "--legacy-artifacts",
      "--mode",
      "throughput",
      "--yes",
      "--no-color",
    ]);
    await runReportCli(["node", "signaler", "report", "--output-dir", outputDir]);
  } finally {
    await server.close();
  }

  const elapsedMs = Math.round(performance.now() - started);
  if (elapsedMs > MAX_ELAPSED_MS) {
    throw new Error(`Onboarding smoke exceeded SLA: ${elapsedMs}ms > ${MAX_ELAPSED_MS}ms`);
  }

  type DiscoveryLike = { readonly status?: string };
  const discoveryPath = resolve(outputDir, "discovery.json");
  const runPath = resolve(outputDir, "run.json");
  const summaryPath = resolve(outputDir, "summary.json");
  const reportPath = resolve(outputDir, "report.html");
  const discovery = await readJson<DiscoveryLike>(discoveryPath);
  if (discovery.status === "error") {
    throw new Error("Discovery status is error.");
  }
  const requiredFiles: readonly string[] = [discoveryPath, runPath, summaryPath, reportPath];
  for (const filePath of requiredFiles) {
    const exists = await fileExists(filePath);
    if (!exists) {
      throw new Error(`Missing required onboarding artifact: ${filePath}`);
    }
  }
  console.log(`Phase 1 onboarding smoke passed in ${elapsedMs}ms`);
}

void run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
