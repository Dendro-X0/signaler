import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import type { ApexConfig } from "../../src/core/types.js";
import { runWizardCli } from "../../src/wizard-cli.js";
import { runAuditCli } from "../../src/cli.js";
import { runAnalyzeCli } from "../../src/analyze-cli.js";
import { runVerifyCli } from "../../src/verify-cli.js";
import { runReportCli } from "../../src/report-cli.js";
import type { SuggestionsV3 } from "../../src/contracts/v3/suggestions-v3.js";

type StepStatus = "ok" | "error";

type LoopStep = {
  readonly id: "discover" | "run" | "analyze" | "verify" | "report";
  readonly status: StepStatus;
  readonly elapsedMs: number;
  readonly exitCode: number;
  readonly details: string;
};

type LoopSmokeReport = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly status: "pass" | "fail";
  readonly elapsedMs: number;
  readonly maxAllowedMs: number;
  readonly outputDir: string;
  readonly baseUrl: string;
  readonly steps: readonly LoopStep[];
  readonly artifacts: {
    readonly runJson: boolean;
    readonly analyzeJson: boolean;
    readonly verifyJson: boolean;
    readonly reportHtml: boolean;
  };
};

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
  const raw: string = req.url ?? "/";
  const [pathname] = raw.split("?");
  return normalizePath(pathname ?? "/");
}

function renderPage(pathname: string): string {
  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Signaler V6.3 Loop Smoke</title></head>",
    "<body>",
    `<h1>V6.3 Loop Smoke ${pathname}</h1>`,
    `<p data-path=\"${pathname}\">ok</p>`,
    "</body>",
    "</html>",
  ].join("");
}

async function startServer(): Promise<{ readonly baseUrl: string; close: () => Promise<void> }> {
  const routeSet = new Set<string>(["/"]);
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const pathname: string = requestPath(req);
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
    throw new Error("Failed to bind v6.3 loop smoke server.");
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
    await stat(pathToFile);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(pathToFile: string): Promise<T> {
  const raw: string = await readFile(pathToFile, "utf8");
  return JSON.parse(raw) as T;
}

async function writeJson(pathToFile: string, value: unknown): Promise<void> {
  await mkdir(dirname(pathToFile), { recursive: true });
  await writeFile(pathToFile, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function ensureSmokeSuggestion(outputDir: string): Promise<void> {
  const suggestionsPath = resolve(outputDir, "suggestions.json");
  const rawSuggestions = await readJson<SuggestionsV3>(suggestionsPath);
  if (Array.isArray(rawSuggestions.suggestions) && rawSuggestions.suggestions.length > 0) {
    return;
  }
  const seeded: SuggestionsV3 = {
    ...rawSuggestions,
    suggestions: [
      {
        id: "sugg-loop-smoke-1",
        title: "Validate loop smoke suggestion seeding",
        category: "performance",
        priorityScore: 900,
        confidence: "high",
        estimatedImpact: {
          timeMs: 100,
          bytes: 1024,
          affectedCombos: 1,
        },
        evidence: [
          {
            sourceRelPath: "results.json",
            pointer: "/results/0",
          },
        ],
        action: {
          summary: "Synthetic smoke suggestion for deterministic v6.3 analyze/verify loop coverage.",
          steps: ["Run analyze", "Run verify --dry-run", "Confirm emitted artifacts"],
          effort: "low",
        },
        modeApplicability: ["fidelity", "throughput"],
      },
    ],
  };
  await writeJson(suggestionsPath, seeded);
}

function toMarkdown(report: LoopSmokeReport): string {
  const lines: string[] = [];
  lines.push("# V6.3 Loop Smoke");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Status: ${report.status.toUpperCase()}`);
  lines.push(`Elapsed: ${report.elapsedMs}ms (max ${report.maxAllowedMs}ms)`);
  lines.push(`Base URL: ${report.baseUrl}`);
  lines.push(`Output Dir: ${report.outputDir}`);
  lines.push("");
  lines.push("## Steps");
  lines.push("");
  lines.push("| Step | Status | Exit Code | Elapsed (ms) | Details |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const step of report.steps) {
    lines.push(`| ${step.id} | ${step.status} | ${step.exitCode} | ${step.elapsedMs} | ${step.details.replace(/\|/g, "\\|")} |`);
  }
  lines.push("");
  lines.push("## Artifacts");
  lines.push("");
  lines.push(`- run.json: ${report.artifacts.runJson}`);
  lines.push(`- analyze.json: ${report.artifacts.analyzeJson}`);
  lines.push(`- verify.json: ${report.artifacts.verifyJson}`);
  lines.push(`- report.html: ${report.artifacts.reportHtml}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function runStep(params: {
  readonly id: LoopStep["id"];
  readonly command: () => Promise<void>;
  readonly okExitCodes: readonly number[];
  readonly details: string;
}): Promise<LoopStep> {
  const startedAtMs: number = performance.now();
  process.exitCode = 0;
  try {
    await params.command();
  } catch (error: unknown) {
    const elapsedMs: number = Math.round(performance.now() - startedAtMs);
    return {
      id: params.id,
      status: "error",
      elapsedMs,
      exitCode: process.exitCode ?? 1,
      details: error instanceof Error ? error.message : String(error),
    };
  }
  const elapsedMs: number = Math.round(performance.now() - startedAtMs);
  const exitCode: number = process.exitCode ?? 0;
  if (!params.okExitCodes.includes(exitCode)) {
    return {
      id: params.id,
      status: "error",
      elapsedMs,
      exitCode,
      details: `Unexpected exit code ${exitCode}.`,
    };
  }
  return {
    id: params.id,
    status: "ok",
    elapsedMs,
    exitCode,
    details: params.details,
  };
}

async function main(): Promise<void> {
  const workspaceRoot = resolve(ROOT, "benchmarks", "workspaces", "v63-loop-smoke");
  const outputDir = resolve(workspaceRoot, ".signaler");
  const configPath = resolve(workspaceRoot, "signaler.config.json");
  const routesFilePath = resolve(workspaceRoot, "routes.txt");
  const outJsonPath = resolve(ROOT, "benchmarks", "out", "v63-loop-smoke.json");
  const outMarkdownPath = resolve(ROOT, "benchmarks", "out", "v63-loop-smoke.md");

  await rm(workspaceRoot, { recursive: true, force: true });
  await mkdir(workspaceRoot, { recursive: true });
  await writeFile(resolve(workspaceRoot, "package.json"), `${JSON.stringify({ name: "v63-loop-smoke", private: true }, null, 2)}\n`, "utf8");
  await writeFile(routesFilePath, "/\n", "utf8");

  const server = await startServer();
  const startedAtMs: number = performance.now();
  const steps: LoopStep[] = [];
  try {
    steps.push(
      await runStep({
        id: "discover",
        details: "discover --scope file completed.",
        okExitCodes: [0],
        command: async () => {
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
        },
      }),
    );
    const discoveredConfig = await readJson<ApexConfig>(configPath);
    const tunedConfig: ApexConfig = {
      ...discoveredConfig,
      pages: discoveredConfig.pages.map((page) => ({
        ...page,
        devices: ["mobile"] as const,
      })),
    };
    await writeFile(configPath, `${JSON.stringify(tunedConfig, null, 2)}\n`, "utf8");

    steps.push(
      await runStep({
        id: "run",
        details: "run --contract v3 --mode throughput completed.",
        okExitCodes: [0],
        command: async () => {
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
            "--mode",
            "throughput",
            "--yes",
            "--no-color",
          ]);
        },
      }),
    );

    await ensureSmokeSuggestion(outputDir);

    steps.push(
      await runStep({
        id: "analyze",
        details: "analyze --contract v6 completed.",
        okExitCodes: [0],
        command: async () => {
          await runAnalyzeCli([
            "node",
            "signaler",
            "analyze",
            "--contract",
            "v6",
            "--dir",
            outputDir,
            "--json",
          ]);
        },
      }),
    );

    steps.push(
      await runStep({
        id: "verify",
        details: "verify --dry-run completed.",
        okExitCodes: [3],
        command: async () => {
          await runVerifyCli([
            "node",
            "signaler",
            "verify",
            "--contract",
            "v6",
            "--dir",
            outputDir,
            "--from",
            resolve(outputDir, "analyze.json"),
            "--top-actions",
            "1",
            "--max-routes",
            "1",
            "--runtime-budget-ms",
            "45000",
            "--dry-run",
            "--json",
          ]);
        },
      }),
    );

    steps.push(
      await runStep({
        id: "report",
        details: "report regeneration completed.",
        okExitCodes: [0],
        command: async () => {
          await runReportCli(["node", "signaler", "report", "--output-dir", outputDir]);
        },
      }),
    );
  } finally {
    await server.close();
  }

  const elapsedMs: number = Math.round(performance.now() - startedAtMs);
  const allStepsOk: boolean = steps.every((step) => step.status === "ok");
  const artifacts = {
    runJson: await fileExists(resolve(outputDir, "run.json")),
    analyzeJson: await fileExists(resolve(outputDir, "analyze.json")),
    verifyJson: await fileExists(resolve(outputDir, "verify.json")),
    reportHtml: await fileExists(resolve(outputDir, "report.html")),
  };
  const artifactsOk: boolean = artifacts.runJson && artifacts.analyzeJson && artifacts.verifyJson && artifacts.reportHtml;
  const withinBudget: boolean = elapsedMs <= MAX_ELAPSED_MS;
  const status: "pass" | "fail" = allStepsOk && artifactsOk && withinBudget ? "pass" : "fail";

  const report: LoopSmokeReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status,
    elapsedMs,
    maxAllowedMs: MAX_ELAPSED_MS,
    outputDir,
    baseUrl: server.baseUrl,
    steps,
    artifacts,
  };
  await writeJson(outJsonPath, report);
  await writeFile(outMarkdownPath, toMarkdown(report), "utf8");

  if (!withinBudget) {
    throw new Error(`V6.3 loop smoke exceeded SLA: ${elapsedMs}ms > ${MAX_ELAPSED_MS}ms`);
  }
  if (!allStepsOk) {
    const failed: readonly LoopStep[] = steps.filter((step) => step.status === "error");
    throw new Error(`V6.3 loop smoke step failure(s): ${failed.map((step) => `${step.id}(exit=${step.exitCode})`).join(", ")}`);
  }
  if (!artifactsOk) {
    throw new Error("V6.3 loop smoke missing required artifacts (run/analyze/verify/report).");
  }
  console.log(`V6.3 loop smoke passed in ${elapsedMs}ms`);
  console.log(`Report: ${outJsonPath}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
