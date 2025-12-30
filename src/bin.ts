#!/usr/bin/env node

import { runAuditCli } from "./cli.js";
import { runWizardCli } from "./wizard-cli.js";
import { runQuickstartCli } from "./quickstart-cli.js";

type ApexCommandId = "audit" | "wizard" | "quickstart" | "guide" | "help";

interface ParsedBinArgs {
  readonly command: ApexCommandId;
  readonly argv: readonly string[];
}

function parseBinArgs(argv: readonly string[]): ParsedBinArgs {
  const rawCommand: string | undefined = argv[2];
  if (rawCommand === undefined || rawCommand === "help" || rawCommand === "--help" || rawCommand === "-h") {
    return { command: "help", argv };
  }
  if (rawCommand === "audit" || rawCommand === "wizard" || rawCommand === "quickstart" || rawCommand === "guide") {
    const commandArgv: readonly string[] = ["node", "apex-auditor", ...argv.slice(3)];
    return { command: rawCommand as ApexCommandId, argv: commandArgv };
  }
  return { command: "help", argv };
}

function printHelp(topic?: string): void {
  if (topic === "topics") {
    console.log(
      [
        "Help topics:",
        "  budgets   Budget schema and CI behaviour",
        "  configs   apex.config.json fields and defaults",
        "  ci        CI mode, exit codes, budgets",
        "  topics    This list",
        "Examples:",
        "  apex-auditor help budgets",
        "  apex-auditor help configs",
        "  apex-auditor help ci",
      ].join("\n"),
    );
    return;
  }
  if (topic === "budgets") {
    console.log(
      [
        "Budgets:",
        "  - categories: performance, accessibility, bestPractices, seo (0-100 scores)",
        "  - metrics: lcpMs, fcpMs, tbtMs, cls, inpMs (numeric thresholds)",
        "Example apex.config.json budget:",
        '  "budgets": {',
        '    "categories": { "performance": 80, "accessibility": 90 },',
        '    "metrics": { "lcpMs": 2500, "inpMs": 200 }',
        "  }",
        "",
        "CI behaviour:",
        "  - --ci exits non-zero if any budget is under/over its limit",
        "  - Summary prints violations; JSON includes full results",
      ].join("\n"),
    );
    return;
  }
  if (topic === "configs") {
    console.log(
      [
        "Config (apex.config.json):",
        "  baseUrl (required)     Base URL of your running site",
        "  query                  Query string appended to every path (e.g., ?lhci=1)",
        "  buildId                Build identifier used for incremental cache keys",
        "  runs                   Runs per page/device (default 1)",
        "  throttlingMethod       simulate | devtools (default simulate)",
        "  cpuSlowdownMultiplier  CPU slowdown (default 4)",
        "  parallel               Workers (default auto up to 4, respects CPU/memory)",
        "  warmUp                 true/false to warm cache before auditing (bounded concurrency)",
        "  incremental            true/false to reuse cached results for unchanged combos (requires buildId)",
        "  pages                  Array of { path, label, devices: [mobile|desktop] }",
        "  budgets                Optional { categories, metrics } thresholds",
        "",
        "Tip:",
        "  For best accuracy and stable throughput, run audits against a production server (e.g., Next.js: next build && next start)",
      ].join("\n"),
    );
    return;
  }
  if (topic === "ci") {
    console.log(
      [
        "CI mode:",
        "  - Use --ci to enable budgets and non-zero exit codes on failures",
        "  - Exit code 1 if any budget fails or a runtime error occurs",
        "  - Use --json to pipe results to other tools",
        "  - Combine with --parallel and --throttling for speed/accuracy trade-offs",
      ].join("\n"),
    );
    return;
  }
  console.log(
    [
      "ApexAuditor CLI",
      "",
      "Usage:",
      "  apex-auditor quickstart --base-url <url> [--project-root <path>]",
      "  apex-auditor wizard [--config <path>]",
      "  apex-auditor audit [--config <path>] [--ci] [--no-color|--color] [--log-level <level>]",
      "  apex-auditor guide  (alias of wizard) interactive flow with tips",
      "",
      "Commands:",
      "  quickstart  Detect routes and run a one-off audit with sensible defaults",
      "  wizard     Run interactive config wizard",
      "  guide      Same as wizard, with inline tips for non-technical users",
      "  audit      Run Lighthouse audits using apex.config.json",
      "  help       Show this help message",
      "",
      "Options (audit):",
      "  --ci               Enable CI mode with budgets and non-zero exit code on failure",
      "  --no-color         Disable ANSI colours in console output (default in CI mode)",
      "  --color            Force ANSI colours in console output",
      "  --log-level <lvl>  Override Lighthouse log level: silent|error|info|verbose",
      "  --stable           Flake-resistant mode: forces parallel=1, good for big suites or flaky runners",
      "  --mobile-only      Run audits only for 'mobile' devices defined in the config",
      "  --desktop-only     Run audits only for 'desktop' devices defined in the config",
      "  --parallel <n>     Override parallel workers (1-10). Default auto-tunes from CPU/memory.",
      "  --show-parallel    Print the resolved parallel workers before running.",
      "  --incremental      Reuse cached results for unchanged combos (requires --build-id)",
      "  --build-id <id>    Build identifier used as the cache key boundary for --incremental",
      "  --quick            Preset: fast feedback (runs=1) without changing throttling defaults",
      "  --accurate         Preset: devtools throttling + warm-up + runs=3 (recommended for baselines)",
      "  --open             Open the HTML report after the run.",
      "",
      "Outputs:",
      "  - Writes .apex-auditor/summary.json, summary.md, report.html",
      "  - Prints a file:// link to the HTML report after completion",
      "",
      "Quick start:",
      "  pnpm dlx apex-auditor@latest wizard      # guided setup",
      "  pnpm dlx apex-auditor@latest audit       # run with apex.config.json",
      "",
      "Defaults:",
      "  - Parallel auto-tunes from CPU/memory (up to 4 by default)",
      "  - Throttling: simulate, CPU slowdown: 4, Runs: 1",
      "  - Stable: use --stable to force serial runs when parallel flakes (e.g., TargetClose/Lantern errors)",
      "  - Accuracy tip: run against a production server (e.g., Next.js: next build && next start)",
      "  - Incremental: use --incremental --build-id <id> to skip unchanged audits between runs",
      "  - Presets: choose only one of --fast, --quick, --accurate",
      "",
      "More help:",
      "  apex-auditor help topics",
      "  apex-auditor help budgets",
    ].join("\n"),
  );
}

export async function runBin(argv: readonly string[]): Promise<void> {
  const parsed: ParsedBinArgs = parseBinArgs(argv);
  if (parsed.command === "help") {
    const topic: string | undefined = argv[3];
    printHelp(topic);
    return;
  }
  if (parsed.command === "quickstart") {
    await runQuickstartCli(parsed.argv);
    return;
  }
  if (parsed.command === "audit") {
    await runAuditCli(parsed.argv);
    return;
  }
  if (parsed.command === "wizard" || parsed.command === "guide") {
    await runWizardCli(parsed.argv);
  }
}

void runBin(process.argv).catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("ApexAuditor CLI failed:", error);
  process.exitCode = 1;
});
