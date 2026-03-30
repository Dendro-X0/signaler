#!/usr/bin/env node

// Check Node.js version before importing anything
const nodeVersion = process.versions.node;
const major = parseInt(nodeVersion.split('.')[0], 10);
if (major < 18) {
  console.error(`Error: Node.js 18 or higher is required. You have ${nodeVersion}`);
  console.error('Please upgrade Node.js: https://nodejs.org/');
  process.exit(1);
}

// Check available memory
import { freemem } from 'node:os';
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const freeMemoryMB = Math.round(freemem() / 1024 / 1024);
if (freeMemoryMB < 512) {
  console.warn(`[WARN] Low memory detected (${freeMemoryMB}MB free)`);
  console.warn('   Signaler may run slowly or fail. Consider closing other applications.');
}

import { runAuditCli } from "./cli.js";
import { runUpgradeCli } from "./upgrade-cli.js";
import { runWizardCli } from "./wizard-cli.js";
import { runQuickstartCli } from "./quickstart-cli.js";
import { runAiCli } from "./ai-cli.js";
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
import { runAnalyzeCli } from "./analyze-cli.js";
import { runVerifyCli } from "./verify-cli.js";
import { runFolderCli } from "./folder-cli.js";
import { runCortexCli } from "./cortex-cli.js";
import { runTuiCli } from "./tui-cli.js";
import { ConfigCli, parseConfigArgs } from "./cli/config-cli.js";
import { ExportCli, parseExportArgs } from "./cli/export-cli.js";
import { readEngineVersion } from "./engine-version.js";
import { hasHelpFlag, resolveCommandHelpTopic } from "./help-routing.js";

type ApexCommandId =
  | "run"
  | "review"
  | "audit"
  | "quick"
  | "report"
  | "analyze"
  | "verify"
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
  | "tui"
  | "shell"
  | "help"
  | "init"
  | "discover"
  | "config"
  | "export"
  | "ai"
  | "cortex"
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
    rawCommand === "run" ||
    rawCommand === "review" ||
    rawCommand === "audit" ||
    rawCommand === "quick" ||
    rawCommand === "report" ||
    rawCommand === "analyze" ||
    rawCommand === "verify" ||
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
    rawCommand === "tui" ||
    rawCommand === "init" ||
    rawCommand === "discover" ||
    rawCommand === "config" ||
    rawCommand === "export" ||
    rawCommand === "ai" ||
    rawCommand === "cortex"
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

  console.log(
    [
      "Signaler CLI",
      `Version: ${version}`,
      `Node.js: ${nodeVersion}`,
      `Platform: ${platform}`,
      "Package Manager: JSR (@signaler/cli)",
      "",
      "Installation:",
      `  npx jsr add @signaler/cli@${version}`,
      "",
      "Quick Start:",
      "  signaler discover    # Primary setup/discovery",
      "  signaler run         # Primary runner",
      "  signaler analyze     # V6 action packet",
      "  signaler verify      # V6 focused verification loop",
      "  signaler report      # Primary report/review",
      "  signaler help        # Show all commands",
      "",
      "Documentation:",
      "  https://jsr.io/@signaler/cli",
    ].join("\n"),
  );
}

function printCommandHelp(topic: string): boolean {
  const normalizedTopic: string =
    topic === "audit" ? "run"
      : topic === "init" || topic === "wizard" || topic === "guide" ? "discover"
        : topic === "review" ? "report"
          : topic;

  const print = (lines: readonly string[]): void => {
    console.log(lines.join("\n"));
  };

  if (normalizedTopic === "run") {
    print([
      "Usage:",
      "  signaler run --config signaler.config.json --contract v3 --mode throughput [flags]",
      "",
      "Key flags:",
      "  --contract <legacy|v3>",
      "  --mode <fidelity|throughput>",
      "  --artifact-profile <lean|standard|diagnostics>",
      "  --machine-token-budget <n>",
      "  --external-signals <path> (repeatable)",
      "  --plan | --yes | --ci | --no-color",
      "",
      "Examples:",
      "  signaler run --contract v3 --mode throughput --yes --no-color",
      "  signaler run --contract v3 --mode fidelity --focus-worst 5",
    ]);
    return true;
  }

  if (normalizedTopic === "discover") {
    print([
      "Usage:",
      "  signaler discover --scope <quick|full|file> [flags]",
      "",
      "Key flags:",
      "  --scope <quick|full|file> (default full)",
      "  --routes-file <path> (required for --scope file in non-interactive mode)",
      "  --base-url <url>",
      "  --project-root <path>",
      "  --profile <next|nuxt|remix|sveltekit|spa|custom>",
      "  --non-interactive --yes",
      "",
      "Example:",
      "  signaler discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000",
    ]);
    return true;
  }

  if (normalizedTopic === "analyze") {
    print([
      "Usage:",
      "  signaler analyze --contract v6 --dir .signaler [flags]",
      "",
      "Key flags:",
      "  --artifact-profile <lean|standard|diagnostics>",
      "  --top-actions <n>",
      "  --min-confidence <high|medium|low>",
      "  --token-budget <n>",
      "  --external-signals <path> (repeatable)",
      "  --strict --json",
    ]);
    return true;
  }

  if (normalizedTopic === "verify") {
    print([
      "Usage:",
      "  signaler verify --contract v6 --dir .signaler --from .signaler/analyze.json [flags]",
      "",
      "Key flags:",
      "  --action-ids <csv> | --top-actions <n>",
      "  --verify-mode <fidelity|throughput>",
      "  --max-routes <n>",
      "  --runtime-budget-ms <n>",
      "  --strict-comparability | --allow-comparability-mismatch",
      "  --pass-thresholds <path>",
      "  --dry-run --json",
    ]);
    return true;
  }

  if (normalizedTopic === "report") {
    print([
      "Usage:",
      "  signaler report [--dir <path>]",
      "",
      "Description:",
      "  Rebuild report/review outputs from existing artifacts without running Lighthouse again.",
    ]);
    return true;
  }

  if (normalizedTopic === "quickstart") {
    print([
      "Usage:",
      "  signaler quickstart --base-url <url> [--project-root <path>] [--scope <quick|full|file>]",
    ]);
    return true;
  }

  if (normalizedTopic === "quick") {
    print([
      "Usage:",
      "  signaler quick [--config <path>] [--project-root <path>] [--json]",
      "",
      "Description:",
      "  Fast runner pack (measure + headers + links + bundle + accessibility pass).",
    ]);
    return true;
  }

  if (normalizedTopic === "measure" || normalizedTopic === "bundle" || normalizedTopic === "folder" || normalizedTopic === "health" || normalizedTopic === "links" || normalizedTopic === "headers" || normalizedTopic === "console" || normalizedTopic === "clean" || normalizedTopic === "uninstall" || normalizedTopic === "clear-screenshots" || normalizedTopic === "upgrade" || normalizedTopic === "config" || normalizedTopic === "export" || normalizedTopic === "ai" || normalizedTopic === "cortex" || normalizedTopic === "tui" || normalizedTopic === "shell") {
    print([
      "Usage:",
      `  signaler ${normalizedTopic} [flags]`,
      "",
      "Run `signaler --help` for full command and flag reference.",
    ]);
    return true;
  }

  return false;
}

type HelpRenderOptions = {
  readonly json: boolean;
};

type AgentHelpJson = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly goal: string;
  readonly workflows: {
    readonly installedCli: readonly string[];
    readonly localDist: readonly string[];
  };
  readonly artifactOrder: readonly string[];
  readonly highSignalFlags: readonly string[];
  readonly exitCodes: {
    readonly verify: {
      readonly pass: 0;
      readonly runtimeError: 1;
      readonly checksFailed: 2;
      readonly dryRun: 3;
    };
    readonly analyze: {
      readonly success: 0;
      readonly runtimeOrProcessingFailure: 1;
      readonly strictInputValidationFailure: 2;
    };
  };
};

function buildAgentHelpJson(): AgentHelpJson {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    goal: "deterministic detect -> prioritize -> verify loop with machine-readable artifacts",
    workflows: {
      installedCli: [
        "signaler discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000",
        "signaler run --contract v3 --mode throughput --yes --no-color",
        "signaler analyze --contract v6 --json",
        "signaler verify --contract v6 --runtime-budget-ms 90000 --dry-run --json",
        "signaler report",
      ],
      localDist: [
        "node ./dist/bin.js discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000",
        "node ./dist/bin.js run --contract v3 --mode throughput --yes --no-color",
        "node ./dist/bin.js analyze --contract v6 --json",
        "node ./dist/bin.js verify --contract v6 --runtime-budget-ms 90000 --dry-run --json",
        "node ./dist/bin.js report",
      ],
    },
    artifactOrder: [
      ".signaler/analyze.json",
      ".signaler/verify.json",
      ".signaler/agent-index.json",
      ".signaler/suggestions.json",
      ".signaler/results.json",
      ".signaler/run.json",
    ],
    highSignalFlags: [
      "--artifact-profile <lean|standard|diagnostics>",
      "--token-budget <n>",
      "--external-signals <path> (repeatable)",
      "--runtime-budget-ms <n>",
    ],
    exitCodes: {
      verify: {
        pass: 0,
        runtimeError: 1,
        checksFailed: 2,
        dryRun: 3,
      },
      analyze: {
        success: 0,
        runtimeOrProcessingFailure: 1,
        strictInputValidationFailure: 2,
      },
    },
  };
}

function printHelp(topic?: string, options: HelpRenderOptions = { json: false }): void {
  if (typeof topic === "string" && topic.length > 0 && printCommandHelp(topic)) {
    return;
  }
  if (options.json && topic === "agent") {
    console.log(JSON.stringify(buildAgentHelpJson()));
    return;
  }
  if (topic === "topics") {
    console.log(
      [
        "Help topics:",
        "  budgets   Budget schema and CI behaviour",
        "  configs   signaler.config.json fields and defaults",
        "  ci        CI mode, exit codes, budgets",
        "  agent     Agent-first usage guide and copy/paste loop",
        "  topics    This list",
        "Examples:",
        "  signaler help budgets",
        "  signaler help configs",
        "  signaler help ci",
        "  signaler help agent",
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
        "  parallel               Workers (default auto up to 3, respects CPU/memory)",
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
  if (topic === "agent") {
    console.log(
      [
        "Agent guide:",
        "  Goal: deterministic detect -> prioritize -> verify loop with machine-readable artifacts.",
        "",
        "Canonical workflow (installed CLI):",
        "  signaler discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000",
        "  signaler run --contract v3 --mode throughput --yes --no-color",
        "  signaler analyze --contract v6 --json",
        "  signaler verify --contract v6 --runtime-budget-ms 90000 --dry-run --json",
        "  signaler report",
        "",
        "Local unpublished build workflow:",
        "  node ./dist/bin.js discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000",
        "  node ./dist/bin.js run --contract v3 --mode throughput --yes --no-color",
        "  node ./dist/bin.js analyze --contract v6 --json",
        "  node ./dist/bin.js verify --contract v6 --runtime-budget-ms 90000 --dry-run --json",
        "  node ./dist/bin.js report",
        "",
        "Artifact ingestion order for agents:",
        "  1) .signaler/analyze.json",
        "  2) .signaler/verify.json",
        "  3) .signaler/agent-index.json",
        "  4) .signaler/suggestions.json",
        "  5) .signaler/results.json",
        "  6) .signaler/run.json",
        "",
        "High-signal flags:",
        "  --artifact-profile <lean|standard|diagnostics>",
        "  --token-budget <n>",
        "  --external-signals <path> (repeatable)",
        "  --runtime-budget-ms <n>",
        "",
        "Exit codes to automate:",
        "  verify: 0=pass, 1=runtime error, 2=checks failed, 3=dry-run",
        "  analyze: 0=success, 1=runtime/processing failure, 2=strict input validation failure",
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
      "  signaler discover        # primary route discovery/setup",
      "  signaler run --mode <fidelity|throughput> [flags]   # canonical runner",
      "  signaler analyze --contract v6 [flags]   # canonical machine action packet",
      "  signaler verify --contract v6 [flags]   # canonical focused rerun + delta validation",
      "  signaler report [--dir <path>]   # primary report/review from artifacts",
      "  signaler init            # compatibility alias of discover (planned removal in v4.0)",
      "  signaler review [--dir <path>]   # compatibility alias of report (planned removal in v4.0)",
      "  signaler tui [--config <path>]",
      "  signaler quickstart --base-url <url> [--project-root <path>]",
      "  signaler wizard [--config <path>]",
      "  signaler discover [--scope <quick|full|file>] [--routes-file <path>] [--config <path>]",
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
      "    tui        Fullscreen interactive dashboard with live command output",
      "    wizard     Run interactive config wizard",
      "    discover   Primary route discovery/setup command",
      "    guide      Same as wizard, with inline tips for non-technical users",
      "    quickstart Detect routes and run a one-off audit with sensible defaults",
      "",
      "  Audits and checks:",
      "    run        Primary Lighthouse runner command",
      "    analyze    V6 machine-facing action packet generator (requires --contract v6)",
      "    verify     V6 focused rerun and pass/fail verification loop (requires --contract v6)",
      "    report     Primary report/review command from existing artifacts",
      "    audit      Compatibility alias for run (planned removal in v4.0)",
      "    review     Compatibility alias for report (planned removal in v4.0)",
      "    measure    Fast batch metrics (CDP-based, non-Lighthouse)",
      "    quick      Fast runner pack (measure + headers + links + bundle + accessibility pass)",
      "    discover   Primary setup/discovery flow",
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
      "  --mode <m>         Run mode profile: fidelity | throughput (default throughput)",
      "  --parity           Preset: parity-oriented fidelity run (equivalent to --mode fidelity defaults)",
      "  --throughput-backoff <m> Backoff policy for parallel instability: auto | aggressive | off",
      "  --isolation <m>    Browser isolation: shared | per-audit | browser (browser => strict relaunch + parallel=1)",
      "  --contract <c>     Artifact contract: legacy | v3 (default legacy)",
      "  --legacy-artifacts Keep legacy artifacts when --contract v3 is enabled",
      "  --baseline <path>  Baseline run.json path to compare compat hash against",
      "  --artifact-profile <lean|standard|diagnostics>  Machine output profile (default lean)",
      "  --machine-token-budget <n>  Strict machine-output token budget (default by profile)",
      "  --external-signals <path>  Merge local external signals into ranking (repeatable)",
      "",
      "Options (discover/init):",
      "  --scope <quick|full|file>     Discovery scope profile (default full)",
      "  --routes-file <path>          Route list file (required for --scope file in non-interactive mode)",
      "  --base-url <url>              Override detected base URL",
      "  --project-root <path>         Override project root for route detection",
      "  --profile <id>                Force project profile: next|nuxt|remix|sveltekit|spa|custom",
      "  --non-interactive             Fail fast on missing required inputs",
      "  --yes, -y                     Accept defaults without prompts",
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
      "Options (analyze):",
      "  --contract v6          Required in this phase to enable analyze command",
      "  --dir <path>           Artifacts directory (default .signaler)",
      "  --artifact-profile <lean|standard|diagnostics>  Output density profile (default lean)",
      "  --top-actions <n>      Action cap (1..100, default 12)",
      "  --min-confidence <high|medium|low>  Minimum confidence filter (default medium)",
      "  --token-budget <n>     Max estimated tokens for emitted actions payload (min 2000, default by profile: lean=8000, standard=16000, diagnostics=32000)",
      "  --external-signals <path>  Merge local external signals into action ranking (repeatable)",
      "  --strict               Fail on missing/invalid required v3 inputs with exit code 2",
      "  --json                 Print compact analyze summary JSON to stdout",
      "",
      "Options (verify):",
      "  --contract v6          Required in this phase to enable verify command",
      "  --dir <path>           Baseline artifacts directory (default .signaler)",
      "  --from <path>          Analyze source (default .signaler/analyze.json)",
      "  --action-ids <csv>     Explicit action ids to verify (overrides --top-actions)",
      "  --top-actions <n>      Number of actions from analyze.json when --action-ids is omitted",
      "  --verify-mode <fidelity|throughput>  Rerun mode (default fidelity)",
      "  --max-routes <n>       Cap focused routes for rerun (1..50, default 10)",
      "  --runtime-budget-ms <n>  Optional verify route-budget cap using baseline average step timing",
      "  --strict-comparability Fail if rerun comparability hash differs from baseline",
      "  --allow-comparability-mismatch  Override strict comparability and continue checks",
      "  --pass-thresholds <path>  JSON thresholds override",
      "  --dry-run              Write planned verify artifacts without rerun (exit 3)",
      "  --json                 Print compact verify summary JSON to stdout",
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
      "  - Parallel auto-tunes from CPU/memory (up to 3 by default)",
      "  - Throttling: simulate, CPU slowdown: 4, Runs: 1",
      "  - Stability: use --stable only when parallel mode flakes (e.g., TargetClose/Lantern errors)",
      "  - Accuracy tip: run against a production server (e.g., Next.js: next build && next start)",
      "  - Incremental: use --incremental --build-id <id> to skip unchanged audits between runs",
      "  - Presets: choose only one of --fast, --quick, --accurate, --devtools-accurate",
      "",
      "More help:",
      "  signaler help topics",
      "  signaler help budgets",
      "  signaler help agent",
    ].join("\n"),
  );
}

function isInteractiveTty(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

// Graceful shutdown handler
let isShuttingDown = false;

async function cleanupChromeProcesses(): Promise<void> {
  // Intentionally non-destructive.
  // Runner-level Chrome sessions are already closed by their own lifecycle hooks.
  // Global taskkill/pkill can terminate user-launched Chrome sessions.
  await Promise.resolve();
}

function setupGracefulShutdown(): void {
  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    console.error(`\n\n[WARN] Received ${signal}, shutting down gracefully...`);
    console.error("Cleaning up Chrome processes...");

    await cleanupChromeProcesses();

    console.error("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT (Ctrl+C)"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  // Cleanup on uncaught errors
  process.on("uncaughtException", async (error) => {
    console.error("\n[ERROR] Uncaught exception:", error.message);
    await cleanupChromeProcesses();
    process.exit(1);
  });

  process.on("unhandledRejection", async (reason) => {
    console.error("\n[ERROR] Unhandled rejection:", reason);
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
    const helpArgs: readonly string[] = argv.slice(3);
    const topic: string | undefined = helpArgs.find((arg) => !arg.startsWith("-"));
    const json: boolean = helpArgs.includes("--json");
    printHelp(topic, { json });
    return;
  }

  if (parsed.command === "version") {
    await printVersion();
    return;
  }

  if (hasHelpFlag(argv)) {
    const helpTopic: string | undefined = resolveCommandHelpTopic(parsed.command);
    if (helpTopic !== undefined) {
      printHelp(helpTopic);
      return;
    }
  }

  if (parsed.command === "shell") {
    await runShellCli(parsed.argv);
    return;
  }

  if (parsed.command === "tui") {
    await runTuiCli(parsed.argv);
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
      console.log("Compatibility alias: 'audit' maps to primary 'run' (planned removal in v4.0).");
      await runAuditCli(parsed.argv);
      return;
    }
    if (parsed.command === "run") {
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
    if (parsed.command === "analyze") {
      await runAnalyzeCli(parsed.argv);
      return;
    }
    if (parsed.command === "verify") {
      await runVerifyCli(parsed.argv);
      return;
    }
    if (parsed.command === "review") {
      console.log("Compatibility alias: 'review' maps to primary 'report' (planned removal in v4.0).");
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
    if (parsed.command === "init" || parsed.command === "wizard" || parsed.command === "guide" || parsed.command === "discover") {
      if (parsed.command === "init" || parsed.command === "wizard" || parsed.command === "guide") {
        console.log("Compatibility alias: use 'discover' as the primary setup command (init planned removal in v4.0).");
      }
      const hasScope: boolean = parsed.argv.some((arg) => arg === "--scope" || arg.startsWith("--scope="));
      const discoverArgv: readonly string[] =
        !hasScope
          ? [...parsed.argv, "--scope", "full"]
          : parsed.argv;
      await runWizardCli(discoverArgv);
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
    if (parsed.command === "ai") {
      await runAiCli(parsed.argv);
      return;
    }
    if (parsed.command === "cortex") {
      await runCortexCli(parsed.argv);
      return;
    }
  };

  try {
    await runOnce();
  } catch (error: unknown) {
    const message: string = error instanceof Error ? error.message : String(error);

    // Handle common error scenarios with helpful messages
    if (message.includes("ENOENT") && message.includes("signaler.config.json")) {
      console.error("\n[ERROR] Config file not found");
      console.error("\nTo create a config file, run:");
      console.error("  signaler wizard");
      console.error("\nOr specify a config path:");
      console.error("  signaler audit --config path/to/config.json");
      process.exitCode = 1;
      return;
    }

    if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
      console.error("\n[ERROR] Cannot connect to baseUrl");
      console.error("\nMake sure:");
      console.error("  - Your development server is running");
      console.error("  - The baseUrl in signaler.config.json is correct");
      console.error("  - The server is accessible from this machine");
      process.exitCode = 1;
      return;
    }

    if (message.includes("EACCES") || message.includes("permission denied")) {
      console.error("\n[ERROR] Permission denied");
      console.error("\nTry:");
      console.error("  - Running with appropriate permissions");
      console.error("  - Checking file/directory permissions");
      console.error("  - Closing other applications that might lock files");
      process.exitCode = 1;
      return;
    }

    // Re-throw unknown errors
    throw error;
  }

}

function handleRunBinError(error: unknown): void {
  console.error("\n[ERROR] Signaler CLI failed\n");

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
  console.error("  - README.md for documentation");
  console.error("  - signaler help for command reference");
  console.error("  - GitHub issues for known problems");

  process.exitCode = 1;
}

function isDirectExecution(): boolean {
  const invokedPath: string | undefined = process.argv[1];
  if (typeof invokedPath !== "string" || invokedPath.length === 0) {
    return false;
  }
  const modulePath: string = fileURLToPath(import.meta.url);
  return resolve(invokedPath) === resolve(modulePath);
}

if (isDirectExecution()) {
  void runBin(process.argv).catch(handleRunBinError);
}





