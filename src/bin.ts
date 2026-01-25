#!/usr/bin/env node

// Check Node.js version before importing anything
const nodeVersion = process.versions.node;
const major = parseInt(nodeVersion.split('.')[0], 10);
if (major < 16) {
  console.error(`Error: Node.js 16 or higher is required. You have ${nodeVersion}`);
  console.error('Please upgrade Node.js: https://nodejs.org/');
  process.exit(1);
}

// Check available memory
import { freemem } from 'node:os';
const freeMemoryMB = Math.round(freemem() / 1024 / 1024);
if (freeMemoryMB < 512) {
  console.warn(`⚠️  Warning: Low memory detected (${freeMemoryMB}MB free)`);
  console.warn('   Signaler may run slowly or fail. Consider closing other applications.');
}

import { runAuditCli } from "./cli.js";
import { runUpgradeCli } from "./upgrade-cli.js";
import { runWizardCli } from "./wizard-cli.js";
import { runQuickstartCli } from "./quickstart-cli.js";
import { runShellCli } from "./shell-cli.js";
import { runMeasureCli } from "./measure-cli.js";
import { runBundleCli } from "./bundle-cli.js";
import { runHealthCli } from "./health-cli.js";
import { runLinksCli } from "./links-cli.js";
import { runHeadersCli } from "./headers-cli.js";
import { runConsoleCli } from "./console-cli.js";
import { runCleanCli } from "./clean-cli.js";
import { runUninstallCli } from "./uninstall-cli.js";
import { runClearScreenshotsCli } from "./clear-screenshots-cli.js";
import { runQuickCli } from "./quick-cli.js";
import { runReportCli } from "./report-cli.js";
import { runFolderCli } from "./folder-cli.js";
import { ConfigCli, parseConfigArgs } from "./cli/config-cli.js";
import { ExportCli, parseExportArgs } from "./cli/export-cli.js";
import { readEngineVersion } from "./engine-version.js";

type ApexCommandId =
  | "audit"
  | "quick"
  | "report"
  | "upgrade"
  | "measure"
  | "bundle"
  | "folder"
  | "health"
  | "links"
  | "headers"
  | "console"
  | "clean"
  | "uninstall"
  | "clear-screenshots"
  | "wizard"
  | "quickstart"
  | "guide"
  | "shell"
  | "help"
  | "init"
  | "config"
  | "export"
  | "version";

interface ParsedBinArgs {
  readonly command: ApexCommandId;
  readonly argv: readonly string[];
}

function parseBinArgs(argv: readonly string[]): ParsedBinArgs {
  const rawCommand: string | undefined = argv[2];
  if (rawCommand === undefined) {
    return { command: "shell", argv };
  }
  if (rawCommand === "help" || rawCommand === "--help" || rawCommand === "-h") {
    return { command: "help", argv };
  }
  if (rawCommand === "version" || rawCommand === "--version" || rawCommand === "-v") {
    return { command: "version", argv };
  }
  if (rawCommand === "shell") {
    const commandArgv: readonly string[] = ["node", "signaler", ...argv.slice(3)];
    return { command: "shell", argv: commandArgv };
  }
  if (
    rawCommand === "audit" ||
    rawCommand === "quick" ||
    rawCommand === "report" ||
    rawCommand === "upgrade" ||
    rawCommand === "measure" ||
    rawCommand === "bundle" ||
    rawCommand === "folder" ||
    rawCommand === "health" ||
    rawCommand === "links" ||
    rawCommand === "headers" ||
    rawCommand === "console" ||
    rawCommand === "clean" ||
    rawCommand === "uninstall" ||
    rawCommand === "clear-screenshots" ||
    rawCommand === "wizard" ||
    rawCommand === "quickstart" ||
    rawCommand === "guide" ||
    rawCommand === "init" ||
    rawCommand === "config" ||
    rawCommand === "export"
  ) {
    const commandArgv: readonly string[] = ["node", "signaler", ...argv.slice(3)];
    return { command: rawCommand as ApexCommandId, argv: commandArgv };
  }
  return { command: "help", argv };
}

async function printVersion(): Promise<void> {
  const version = await readEngineVersion();
  const nodeVersion = process.versions.node;
  const platform = `${process.platform} ${process.arch}`;
  
  console.log(`
┌─────────────────────────────────────────────────┐
│                 Signaler CLI                    │
├─────────────────────────────────────────────────┤
│ Version         │ ${version.padEnd(30)} │
│ Node.js         │ ${nodeVersion.padEnd(30)} │
│ Platform        │ ${platform.padEnd(30)} │
│ Package Manager │ JSR (@signaler/cli)${' '.repeat(9)} │
└─────────────────────────────────────────────────┘

Installation:
  npx jsr add @signaler/cli@${version}

Quick Start:
  signaler wizard      # Interactive setup
  signaler audit       # Run performance audit
  signaler help        # Show all commands

Documentation:
  https://jsr.io/@signaler/cli
`);
}

function printHelp(topic?: string): void {
  if (topic === "topics") {
    console.log(
      [
        "Help topics:",
        "  budgets   Budget schema and CI behaviour",
        "  configs   signaler.config.json fields and defaults",
        "  ci        CI mode, exit codes, budgets",
        "  topics    This list",
        "Examples:",
        "  signaler help budgets",
        "  signaler help configs",
        "  signaler help ci",
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
        "Example signaler.config.json budget:",
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
        "Config (signaler.config.json):",
        "  baseUrl (required)     Base URL of your running site",
        "  query                  Query string appended to every path (e.g., ?lhci=1)",
        "  buildId                Build identifier used for incremental cache keys",
        "  runs                   Runs per page/device (must be 1; rerun command to compare)",
        "  auditTimeoutMs         Per-audit timeout in milliseconds (prevents hung runs from stalling)",
        "  throttlingMethod       simulate | devtools (default simulate)",
        "  cpuSlowdownMultiplier  CPU slowdown (default 4)",
        "  parallel               Workers (default auto up to 4, respects CPU/memory)",
        "  warmUp                 true/false to warm cache before auditing (bounded concurrency)",
        "  incremental            (deprecated default) Set in config but only active when --incremental is passed",
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
      "Signaler CLI",
      "",
      "Usage:",
      "  signaler                 # interactive shell (default)",
      "  signaler quickstart --base-url <url> [--project-root <path>]",
      "  signaler wizard [--config <path>]",
      "  signaler quick [--config <path>] [--project-root <path>]",
      "  signaler report [--dir <path>]",
      "  signaler folder --root <dir> [--route-cap <n>]",
      "  signaler audit [--config <path>] [--ci] [--no-color|--color] [--log-level <level>]",
      "  signaler audit --flags    # print audit flags/options and exit",
      "  signaler guide  (alias of wizard) interactive flow with tips for non-technical users",
      "  signaler upgrade --repo <owner/name>  # self-update from GitHub Releases",
      "  signaler shell           # same as default entrypoint",
      "",
      "Commands:",
      "  Interactive:",
      "    shell      Start interactive shell (default)",
      "    wizard     Run interactive config wizard",
      "    guide      Same as wizard, with inline tips for non-technical users",
      "    quickstart Detect routes and run a one-off audit with sensible defaults",
      "",
      "  Audits and checks:",
      "    measure    Fast batch metrics (CDP-based, non-Lighthouse)",
      "    quick      Fast runner pack (measure + headers + links + bundle + accessibility pass)",
      "    report     Generate global reports from existing .signaler/ artifacts (no Lighthouse run)",
      "    audit      Run Lighthouse audits using signaler.config.json",
      "    folder     Audit a local folder by serving it with a static server",
      "    upgrade    Self-update the CLI from GitHub Releases",
      "    bundle     Bundle size audit (Next.js .next/ or dist/ build output)",
      "    health     HTTP status + latency checks for configured routes",
      "    links      Broken links audit (sitemap + HTML link extraction)",
      "    headers    Security headers audit",
      "    console    Console errors + runtime exceptions audit (headless Chrome)",
      "",
      "  Maintenance:",
      "    clean      Remove Signaler artifacts (reports/cache and optionally config)",
      "    uninstall  One-click uninstall (removes .signaler/ and signaler.config.json)",
      "    clear-screenshots  Remove .signaler/screenshots/",
      "",
      "  Configuration and Export:",
      "    config     Manage configuration files (create, validate, show)",
      "    export     Export audit data in various formats (CSV, JSON, Excel)",
      "",
      "  Help:",
      "    help       Show this help message",
      "",
      "Options (audit):",
      "  --flags            Print audit flags/options and exit",
      "  --ci               Enable CI mode with budgets and non-zero exit code on failure",
      "  --fail-on-budget   Exit non-zero if budgets fail even outside CI",
      "  --no-color         Disable ANSI colours in console output (default in CI mode)",
      "  --color            Force ANSI colours in console output",
      "  --log-level <lvl>  Override Lighthouse log level: silent|error|info|verbose",
      "  --stable           Fallback mode: forces parallel=1 when parallel mode flakes (Chrome disconnects / Lighthouse target errors)",
      "  --mobile-only      Run audits only for 'mobile' devices defined in the config",
      "  --desktop-only     Run audits only for 'desktop' devices defined in the config",
      "  --parallel <n>     Override parallel workers (1-10). Default auto-tunes from CPU/memory.",
      "  --audit-timeout-ms <ms>  Per-audit timeout in milliseconds (prevents hung runs from stalling)",
      "  --diagnostics      Capture DevTools-like Lighthouse tables + screenshots (writes .signaler/...)",
      "  --lhr              Also capture full Lighthouse result JSON per combo (implies --diagnostics)",
      "  --plan             Print resolved settings + run size estimate and exit without auditing",
      "  --max-steps <n>    Safety limit: refuse/prompt if planned Lighthouse runs exceed this (default 120)",
      "  --max-combos <n>   Safety limit: refuse/prompt if planned page/device combos exceed this (default 60)",
      "  --yes, -y          Auto-confirm large runs (bypass safety prompt)",
      "  --changed-only     Run only pages whose paths match files in git diff --name-only (working tree diff)",
      "  --rerun-failing    Re-run only combos that failed in the previous summary (runtime errors or perf<90)",
      "  --accessibility-pass  Opt-in: run a fast axe-core accessibility sweep after audits (lightweight, CDP-based)",
      "  --webhook-url <url> Send a JSON webhook with regressions/budgets/accessibility (regressions-only summary)",
      "  --show-parallel    Print the resolved parallel workers before running.",
      "  --incremental      Reuse cached results for unchanged combos (requires --build-id). Opt-in; off by default.",
      "  --build-id <id>    Build identifier used as the cache key boundary for --incremental",
      "  --overview         Preset: quick overview (runs=1) and samples a small set of combos unless --yes.",
      "  --overview-combos <n>  Overview sampling size (default 10).",
      "  --quick            Preset: fast feedback (runs=1) without changing throttling defaults",
      "  --accurate         Preset: devtools throttling + warm-up + stability-first (parallel=1 unless overridden)",
      "  --devtools-accurate Preset: devtools throttling + warm-up + higher parallelism by default",
      "  --open             Open the HTML report after the run.",
      "",
      "Options (measure):",
      "  --mobile-only      Run measure only for 'mobile' devices defined in the config",
      "  --desktop-only     Run measure only for 'desktop' devices defined in the config",
      "  --parallel <n>     Override parallel workers (1-10).",
      "  --timeout-ms <ms>  Per-navigation timeout in milliseconds (default 60000)",
      "  --screenshots      Opt-in: save a screenshot per combo (slower; writes .signaler/measure/*.png)",
      "  --json             Print JSON summary to stdout",
      "",
      "Options (bundle):",
      "  --project-root <path>  Project root to scan (default cwd)",
      "  --top <n>              Show top N largest files (default 15)",
      "  --json                 Print JSON report to stdout",
      "",
      "Options (health):",
      "  --config <path>        Config path (default signaler.config.json)",
      "  --parallel <n>         Parallel requests (default auto)",
      "  --timeout-ms <ms>      Per-request timeout (default 20000)",
      "  --json                 Print JSON report to stdout",
      "",
      "Options (links):",
      "  --config <path>        Config path (default signaler.config.json)",
      "  --sitemap <url>        Override sitemap URL (default <baseUrl>/sitemap.xml)",
      "  --parallel <n>         Parallel requests (default auto)",
      "  --timeout-ms <ms>      Per-request timeout (default 20000)",
      "  --max-urls <n>         Limit total URLs checked (default 200)",
      "  --json                 Print JSON report to stdout",
      "",
      "Options (headers):",
      "  --config <path>        Config path (default signaler.config.json)",
      "  --parallel <n>         Parallel requests (default auto)",
      "  --timeout-ms <ms>      Per-request timeout (default 20000)",
      "  --json                 Print JSON report to stdout",
      "",
      "Options (quick):",
      "  --config <path>        Config path (default signaler.config.json)",
      "  --project-root <path>  Project root for bundle scan (default cwd)",
      "  --mobile-only          Restrict measure + accessibility to mobile combos",
      "  --desktop-only         Restrict measure + accessibility to desktop combos",
      "  --measure-parallel <n> Parallel workers for measure (1-10)",
      "  --measure-timeout-ms <ms>  Measure per-navigation timeout",
      "  --headers-parallel <n> Parallel requests for headers",
      "  --headers-timeout-ms <ms>  Headers per-request timeout",
      "  --links-parallel <n>   Parallel requests for links",
      "  --links-timeout-ms <ms> Links per-request timeout",
      "  --links-max-urls <n>   Limit links URLs checked",
      "  --bundle-top <n>       Show top N largest files",
      "  --accessibility-parallel <n> Parallel workers for accessibility pass",
      "  --accessibility-timeout-ms <ms> Accessibility per-navigation timeout",
      "  --json                 Print consolidated AI JSON to stdout",
      "",
      "Options (report):",
      "  --dir <path>           Artifacts directory (default .signaler)",
      "",
      "Options (console):",
      "  --config <path>        Config path (default signaler.config.json)",
      "  --parallel <n>         Parallel workers (default auto)",
      "  --timeout-ms <ms>      Per-navigation timeout (default 60000)",
      "  --max-events <n>       Cap captured events per combo (default 50)",
      "  --json                 Print JSON report to stdout",
      "",
      "Options (clean):",
      "  --project-root <path>  Project root (default cwd)",
      "  --config-path <path>   Config file path relative to project root (default signaler.config.json)",
      "  --reports              Remove .signaler/ (default)",
      "  --no-reports           Keep .signaler/",
      "  --remove-config        Remove config file",
      "  --all                  Remove reports and config",
      "  --dry-run              Print planned removals without deleting",
      "  --yes, -y              Skip confirmation prompt",
      "  --json                 Print JSON report to stdout",
      "",
      "Options (uninstall):",
      "  --project-root <path>  Project root (default cwd)",
      "  --config-path <path>   Config file path relative to project root (default signaler.config.json)",
      "  --dry-run              Print planned removals without deleting",
      "  --yes, -y              Skip confirmation prompt",
      "  --json                 Print JSON report to stdout",
      "",
      "Options (clear-screenshots):",
      "  --project-root <path>  Project root (default cwd)",
      "  --dry-run              Print planned removals without deleting",
      "  --yes, -y              Skip confirmation prompt",
      "  --json                 Print JSON report to stdout",
      "",
      "Outputs:",
      "  - Writes .signaler/summary.json, summary.md, report.html",
      "  - Prints a file:// link to the HTML report after completion",
      "",
      "Quick start:",
      "  pnpm dlx signaler@latest wizard      # guided setup",
      "  pnpm dlx signaler@latest audit       # run with signaler.config.json",
      "",
      "Defaults:",
      "  - Parallel auto-tunes from CPU/memory (up to 4 by default)",
      "  - Throttling: simulate, CPU slowdown: 4, Runs: 1",
      "  - Stability: use --stable only when parallel mode flakes (e.g., TargetClose/Lantern errors)",
      "  - Accuracy tip: run against a production server (e.g., Next.js: next build && next start)",
      "  - Incremental: use --incremental --build-id <id> to skip unchanged audits between runs",
      "  - Presets: choose only one of --fast, --quick, --accurate, --devtools-accurate",
      "",
      "More help:",
      "  signaler help topics",
      "  signaler help budgets",
    ].join("\n"),
  );
}

function isInteractiveTty(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

// Graceful shutdown handler
let isShuttingDown = false;

async function cleanupChromeProcesses(): Promise<void> {
  try {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);
    
    if (process.platform === 'win32') {
      await execAsync('taskkill /F /IM chrome.exe /T').catch(() => {});
    } else {
      await execAsync('pkill -9 -f "chrome.*--headless"').catch(() => {});
    }
  } catch {
    // Ignore cleanup errors
  }
}

function setupGracefulShutdown(): void {
  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    
    console.error(`\n\n⚠️  Received ${signal}, shutting down gracefully...`);
    console.error("Cleaning up Chrome processes...");
    
    await cleanupChromeProcesses();
    
    console.error("Shutdown complete");
    process.exit(0);
  };
  
  process.on("SIGINT", () => void shutdown("SIGINT (Ctrl+C)"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  
  // Cleanup on uncaught errors
  process.on("uncaughtException", async (error) => {
    console.error("\n❌ Uncaught exception:", error.message);
    await cleanupChromeProcesses();
    process.exit(1);
  });
  
  process.on("unhandledRejection", async (reason) => {
    console.error("\n❌ Unhandled rejection:", reason);
    await cleanupChromeProcesses();
    process.exit(1);
  });
}

/**
 * Main CLI entrypoint for the `@signaler/cli` binary.
 */
export async function runBin(argv: readonly string[]): Promise<void> {
  setupGracefulShutdown();
  const parsed: ParsedBinArgs = parseBinArgs(argv);
  if (parsed.command === "help") {
    const topic: string | undefined = argv[3];
    printHelp(topic);
    return;
  }

  if (parsed.command === "version") {
    await printVersion();
    return;
  }

  if (parsed.command === "shell") {
    await runShellCli(parsed.argv);
    return;
  }

  if (parsed.command === "quickstart") {
    await runQuickstartCli(parsed.argv);
    if (isInteractiveTty()) {
      await runShellCli(["node", "signaler"]);
    }
    return;
  }

  const runOnce = async (): Promise<void> => {
    if (parsed.command === "audit") {
      await runAuditCli(parsed.argv);
      return;
    }
    if (parsed.command === "quick") {
      await runQuickCli(parsed.argv);
      return;
    }
    if (parsed.command === "report") {
      await runReportCli(parsed.argv);
      return;
    }
    if (parsed.command === "upgrade") {
      await runUpgradeCli(parsed.argv);
      return;
    }
    if (parsed.command === "measure") {
      await runMeasureCli(parsed.argv);
      return;
    }
    if (parsed.command === "bundle") {
      await runBundleCli(parsed.argv);
      return;
    }
    if (parsed.command === "folder") {
      await runFolderCli(parsed.argv);
      return;
    }
    if (parsed.command === "health") {
      await runHealthCli(parsed.argv);
      return;
    }
    if (parsed.command === "links") {
      await runLinksCli(parsed.argv);
      return;
    }
    if (parsed.command === "headers") {
      await runHeadersCli(parsed.argv);
      return;
    }
    if (parsed.command === "console") {
      await runConsoleCli(parsed.argv);
      return;
    }
    if (parsed.command === "clean") {
      await runCleanCli(parsed.argv);
      return;
    }
    if (parsed.command === "uninstall") {
      await runUninstallCli(parsed.argv);
      return;
    }
    if (parsed.command === "clear-screenshots") {
      await runClearScreenshotsCli(parsed.argv);
      return;
    }
    if (parsed.command === "init" || parsed.command === "wizard" || parsed.command === "guide") {
      await runWizardCli(parsed.argv);
      return;
    }
    if (parsed.command === "config") {
      const configOptions = parseConfigArgs(parsed.argv.slice(2));
      await ConfigCli.handle(configOptions);
      return;
    }
    if (parsed.command === "export") {
      const exportOptions = parseExportArgs(parsed.argv.slice(2));
      await ExportCli.handle(exportOptions);
      return;
    }
  };

  try {
    await runOnce();
  } catch (error: unknown) {
    const message: string = error instanceof Error ? error.message : String(error);
    
    // Handle common error scenarios with helpful messages
    if (message.includes("ENOENT") && message.includes("signaler.config.json")) {
      console.error("\n❌ Config file not found");
      console.error("\nTo create a config file, run:");
      console.error("  signaler wizard");
      console.error("\nOr specify a config path:");
      console.error("  signaler audit --config path/to/config.json");
      process.exitCode = 1;
      return;
    }
    
    if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
      console.error("\n❌ Cannot connect to baseUrl");
      console.error("\nMake sure:");
      console.error("  • Your development server is running");
      console.error("  • The baseUrl in signaler.config.json is correct");
      console.error("  • The server is accessible from this machine");
      process.exitCode = 1;
      return;
    }
    
    if (message.includes("EACCES") || message.includes("permission denied")) {
      console.error("\n❌ Permission denied");
      console.error("\nTry:");
      console.error("  • Running with appropriate permissions");
      console.error("  • Checking file/directory permissions");
      console.error("  • Closing other applications that might lock files");
      process.exitCode = 1;
      return;
    }
    
    // Re-throw unknown errors
    throw error;
  }

  if (isInteractiveTty()) {
    await runShellCli(["node", "signaler"]);
  }
}

void runBin(process.argv).catch((error: unknown) => {
  console.error("\n❌ Signaler CLI failed\n");
  
  if (error instanceof Error) {
    console.error("Error:", error.message);
    
    // Show stack trace in verbose mode
    if (process.env.DEBUG || process.env.VERBOSE) {
      console.error("\nStack trace:");
      console.error(error.stack);
    } else {
      console.error("\nFor more details, run with DEBUG=1 or VERBOSE=1");
    }
  } else {
    console.error("Error:", String(error));
  }
  
  console.error("\nNeed help? Check:");
  console.error("  • README.md for documentation");
  console.error("  • signaler help for command reference");
  console.error("  • GitHub issues for known problems");
  
  process.exitCode = 1;
});
