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
import { isSameExecPath } from "./exec-path.js";
import { fileURLToPath } from "node:url";
const freeMemoryMB = Math.round(freemem() / 1024 / 1024);
if (freeMemoryMB < 512) {
  console.warn(`[WARN] Low memory detected (${freeMemoryMB}MB free)`);
  console.warn('   Signaler may run slowly or fail. Consider closing other applications.');
}

import { runQuickstartCli } from "./quickstart-cli.js";
import { runShellCli } from "./shell-cli.js";
import { runTuiCli } from "./tui-cli.js";
import { readEngineVersion } from "./engine-version.js";
import { hasHelpFlag, resolveCommandHelpTopic } from "./help-routing.js";
import { dispatchShellCommand, parseShellArgs, type ParsedShellArgs } from "./shell/index.js";

type ApexCommandId = ParsedShellArgs["command"];

interface ParsedBinArgs {
  readonly command: ApexCommandId;
  readonly argv: readonly string[];
}

function parseBinArgs(argv: readonly string[]): ParsedBinArgs {
  return parseShellArgs(argv);
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
      "Distribution: portable GitHub Release installers",
      "",
      "Install:",
      "  PowerShell: irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex",
      "  Bash:       curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash",
      "  Launchers:  signaler (primary), signalar (compatibility alias)",
      "",
      "Quick Start:",
      "  signaler bootstrap --audit --yes   # Zero-config first audit",
      "  signaler explore --cwd .           # Probe routes and loopback servers",
      "  signaler audit --base-url http://127.0.0.1:3000",
      "  signaler query --view agent --dir .signaler",
      "",
      "Maintenance:",
      "  signaler upgrade     # Update the global install",
      "  signaler uninstall --global",
      "  signalar upgrade     # Same command through alias launcher",
      "",
      "Documentation:",
      "  https://github.com/Dendro-X0/signaler",
    ].join("\n"),
  );
}

function printCommandHelp(topic: string): boolean {
  const normalizedTopic: string =
    topic === "init" || topic === "wizard" || topic === "guide" ? "discover"
      : topic === "review" ? "report"
        : topic;

  const print = (lines: readonly string[]): void => {
    console.log(lines.join("\n"));
  };

  if (normalizedTopic === "audit") {
    print([
      "Usage:",
      "  signaler audit [--cwd <path>] [--base-url <url>] [--scope <quick|full>] [flags]",
      "",
      "Description:",
      "  End-to-end orchestrator: explore → discover → run (v3) → analyze (v6).",
      "  Defaults: attach-first (reuse loopback server), --scope full, in-process steps.",
      "",
      "Key flags:",
      "  --managed-serve | --no-managed-serve  Opt in/out of starting a server (default attach)",
      "  --serve-env KEY=VALUE  Lab env for managed serve child (not written to repo)",
      "  --no-audit-bypass      Skip inferred auth bypass env",
      "  --yes, -y              Auto-confirm lab env injection prompt",
      "  --non-interactive      Skip inferred lab env unless --yes",
      "  --in-process | --no-in-process",
      "  --skip-discover (requires --config)",
      "  --summary           Print one-screen summary after completion",
      "  --json",
      "",
      "Examples:",
      "  signaler audit --cwd ./apps/web --base-url http://127.0.0.1:3000",
      "  signaler audit --config signaler.config.json --skip-discover --no-managed-serve",
      "",
      "Note: `signaler run` remains the low-level Lighthouse runner (config required).",
    ]);
    return true;
  }

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
      "  --benchmark-signals <path> (repeatable)",
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

  if (normalizedTopic === "explore") {
    print([
      "Usage:",
      "  signaler explore [--cwd <path>] [--base-url <url>] [--dir <path>] [--json]",
      "",
      "Description:",
      "  Offline local probe: scan routes, port hints, and loopback servers.",
      "  Writes .signaler/explore.json for agents and audit prelude.",
      "",
      "Key flags:",
      "  --cwd <path>           Project root (default cwd)",
      "  --base-url <url>       Preferred loopback URL for port hints",
      "  --route-limit <n>      Cap route scan (default 200)",
      "  --json                 Print manifest to stdout",
    ]);
    return true;
  }

  if (normalizedTopic === "bootstrap") {
    print([
      "Usage:",
      "  signaler bootstrap [--cwd <path>] [--audit] [--yes]",
      "",
      "Description:",
      "  Zero-config onboarding for any web stack: scan directory, detect routes and ports,",
      "  write signaler.config.json, optionally run the first audit.",
      "",
      "Key flags:",
      "  --cwd <path>           Project root (default cwd)",
      "  --audit                Run audit after auto-config (skip discover)",
      "  --managed-serve        Start server when loopback attach fails",
      "  --yes, -y              Auto-confirm prompts",
      "  --json                 Machine-readable output",
      "",
      "Examples:",
      "  signaler bootstrap --cwd ./my-app --audit --yes",
      "  signaler quickstart --cwd ./my-app   # alias with --audit --yes",
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
      "  --benchmark-signals <path> (repeatable)",
      "  --strict --json",
    ]);
    return true;
  }

  if (normalizedTopic === "job") {
    print([
      "Usage:",
      "  signaler job run --preset <agent|ci|pr> [--base-url <url>] [--config <path>] [--scope <quick|full|file>] [--cwd <path>] [--dir <path>] [--in-process]",
      "  signaler job show --preset <agent|ci|pr> [--json]",
      "  signaler job status [--dir <path>] [--json]",
      "  signaler job run --file <job.json>",
      "",
      "Presets:",
      "  agent  discover → run (v3 lean) → analyze (v6)",
      "  ci     agent preset + --fail-on-budget on run",
      "  pr     run --changed-only → analyze (optional --incremental --build-id)",
      "",
      "PR incremental:",
      "  --incremental --build-id <id>  (or SIGNALER_BUILD_ID / git HEAD)",
      "",
      "Discover scope (agent/ci presets):",
      "  --scope <quick|full|file>  (or SIGNALER_DISCOVER_SCOPE)",
      "",
      "In-process execution (no node bin.js subprocess per step; default on):",
      "  --in-process | --no-in-process  (SIGNALER_JOB_IN_PROCESS=0 to disable)",
      "",
      "Managed server when base URL is down (default on; auto mode tries dev first):",
      "  --managed-serve | --auto-serve | --no-managed-serve  (SIGNALER_MANAGED_SERVE=0 to disable)",
      "  --managed-serve-mode <dev|production|auto>  (default production; or SIGNALER_MANAGED_SERVE_MODE)",
      "  --managed-serve-skip-build",
      "  --managed-serve-reuse",
    ]);
    return true;
  }

  if (normalizedTopic === "query") {
    print([
      "Usage:",
      "  signaler query --view <agent|actions|perf|coverage|run|evidence|delta> [--dir <path>] [--json]",
      "",
      "Views:",
      "  agent     compact agent-index projection",
      "  actions   ranked actions from analyze.json",
      "  perf      performance triage (issue counts, not headline scores)",
      "  run       run metadata",
      "  evidence  evidence pointers only",
      "  delta     verify before/after from verify.json or --baseline-dir + --compare-dir",
    ]);
    return true;
  }

  if (normalizedTopic === "explain") {
    print([
      "Usage:",
      "  signaler explain --id <issue-or-suggestion-id> [--dir <path>] [--json]",
      "",
      "Description:",
      "  Lazy-expand one issue or suggestion without loading full results.json.",
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
      "  signaler quickstart [--cwd <path>] [--base-url <url>] [--managed-serve]",
      "",
      "Description:",
      "  Alias for `signaler bootstrap --audit --yes` — zero-config first audit for any web stack.",
      "",
      "Example:",
      "  signaler quickstart --cwd ./my-app",
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

  if (normalizedTopic === "install") {
    print([
      "Usage:",
      "  signaler install [flags]",
      "",
      "Description:",
      "  Install the portable Signaler release globally and create direct `signaler` and `signalar` launchers.",
      "",
      "Key flags:",
      "  --version <tag|latest>",
      "  --repo <owner/name>",
      "  --install-dir <path>",
      "  --bin-dir <path>",
      "  --dry-run --json",
    ]);
    return true;
  }

  if (normalizedTopic === "upgrade") {
    print([
      "Usage:",
      "  signaler upgrade [flags]",
      "",
      "Description:",
      "  Update the global portable Signaler install in place.",
      "",
      "Key flags:",
      "  --version <tag|latest>",
      "  --repo <owner/name>",
      "  --install-dir <path>",
      "  --bin-dir <path>",
      "  --dry-run --json",
    ]);
    return true;
  }

  if (normalizedTopic === "uninstall") {
    print([
      "Usage:",
      "  signaler uninstall [flags]",
      "",
      "Description:",
      "  Remove Signaler project artifacts by default, or remove the global install/launchers with --global.",
      "",
      "Key flags:",
      "  --global",
      "  --project-root <path>",
      "  --config-path <path>",
      "  --dry-run --yes --json",
    ]);
    return true;
  }

  if (normalizedTopic === "measure" || normalizedTopic === "bundle" || normalizedTopic === "folder" || normalizedTopic === "health" || normalizedTopic === "links" || normalizedTopic === "headers" || normalizedTopic === "console" || normalizedTopic === "accessibility" || normalizedTopic === "clean" || normalizedTopic === "clear-screenshots" || normalizedTopic === "config" || normalizedTopic === "export" || normalizedTopic === "ai" || normalizedTopic === "cortex" || normalizedTopic === "tui" || normalizedTopic === "shell" || normalizedTopic === "install-shim") {
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
    readonly oneShotJob: readonly string[];
    readonly installedCli: readonly string[];
    readonly localDist: readonly string[];
  };
  readonly projections: readonly string[];
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
      oneShotJob: [
        "signaler audit --cwd . --base-url http://127.0.0.1:3000",
        "signaler job run --preset agent --managed-serve --in-process --base-url http://127.0.0.1:3000",
        "signaler query --view perf --dir .signaler",
        "signaler explain --id <issue-id> --dir .signaler",
        "signaler verify --contract v6",
        "signaler query --view delta --dir .signaler",
      ],
      installedCli: [
        "signaler discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000",
        "signaler run --contract v3 --mode throughput --artifact-profile lean --ci --no-color --yes",
        "signaler analyze --contract v6 --artifact-profile lean --json",
        "signaler query --view agent --dir .signaler",
        "signaler verify --contract v6 --runtime-budget-ms 90000 --json",
        "signaler query --view delta --dir .signaler",
      ],
      localDist: [
        "node ./dist/bin.js job run --preset agent --base-url http://127.0.0.1:3000",
        "node ./dist/bin.js query --view perf --dir .signaler",
        "node ./dist/bin.js explain --id <issue-id> --dir .signaler",
      ],
    },
    projections: [
      "signaler query --view agent",
      "signaler query --view perf",
      "signaler query --view actions",
      "signaler query --view delta",
      "signaler explain --id <issue-id>",
    ],
    artifactOrder: [
      "signaler query --view agent (preferred)",
      "signaler query --view perf (performance issue-count triage)",
      ".signaler/analyze.json",
      ".signaler/performance-triage.json",
      ".signaler/verify.json",
      ".signaler/agent-index.json",
      "signaler explain --id <id> before loading full results.json",
    ],
    highSignalFlags: [
      "--artifact-profile <lean|standard|diagnostics>",
      "--token-budget <n>",
      "--external-signals <path> (repeatable)",
      "--benchmark-signals <path> (repeatable)",
      "pnpm run bench:fixture:accessibility -- --summary .signaler/accessibility-summary.json --issues .signaler/issues.json --out .signaler/benchmark-accessibility.json",
      "pnpm run bench:fixture:security -- --headers .signaler/headers.json --issues .signaler/issues.json --out .signaler/benchmark-security.json",
      "pnpm run bench:fixture:reliability -- --health .signaler/health.json --issues .signaler/issues.json --out .signaler/benchmark-reliability.json",
      "pnpm run bench:fixture:seo -- --results .signaler/results.json --links .signaler/links.json --issues .signaler/issues.json --out .signaler/benchmark-seo.json",
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
  if (options.json && topic === "agent") {
    console.log(JSON.stringify(buildAgentHelpJson()));
    return;
  }
  if (typeof topic === "string" && topic.length > 0 && printCommandHelp(topic)) {
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
        "  parallel               Workers (default auto 4–6 on capable hardware, respects CPU/memory)",
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
        "One-shot job (recommended):",
        "  signaler job run --preset agent --base-url http://127.0.0.1:3000",
        "  signaler query --view perf",
        "  signaler explain --id <issue-id>",
        "  signaler verify --contract v6",
        "  signaler query --view delta",
        "",
        "PR / changed-files:",
        "  signaler job run --preset pr",
        "  signaler job run --preset pr --incremental --build-id $(git rev-parse --short HEAD)",
        "",
        "Manual workflow:",
        "  signaler discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000",
        "  signaler run --contract v3 --mode throughput --artifact-profile lean --ci --no-color --yes",
        "  signaler analyze --contract v6 --artifact-profile lean --json",
        "",
        "Read API (prefer over raw .signaler/ trees):",
        "  signaler query --view agent|perf|actions|delta",
        "  signaler explain --id <issue-id>",
        "",
        "Bootstrap scripts:",
        "  bash scripts/agent-bootstrap.sh",
        "  corepack pnpm run agent:bootstrap:sh",
        "",
        "High-signal flags:",
        "  --artifact-profile <lean|standard|diagnostics>",
        "  --token-budget <n>",
        "  --external-signals <path> (repeatable)",
        "  --benchmark-signals <path> (repeatable)",
        "  pnpm run bench:fixture:accessibility -- --summary .signaler/accessibility-summary.json --issues .signaler/issues.json --out .signaler/benchmark-accessibility.json",
        "  pnpm run bench:fixture:security -- --headers .signaler/headers.json --issues .signaler/issues.json --out .signaler/benchmark-security.json",
        "  pnpm run bench:fixture:reliability -- --health .signaler/health.json --issues .signaler/issues.json --out .signaler/benchmark-reliability.json",
        "  pnpm run bench:fixture:seo -- --results .signaler/results.json --links .signaler/links.json --issues .signaler/issues.json --out .signaler/benchmark-seo.json",
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
      "  signaler install         # install the portable release globally",
      "  signaler discover        # primary route discovery/setup",
      "  signaler audit [--cwd <path>] [--base-url <url>] [--scope quick|full]   # discover + run + analyze",
      "  signaler run --mode <fidelity|throughput> [flags]   # canonical Lighthouse runner",
      "  signaler analyze --contract v6 [flags]   # canonical machine action packet",
      "  signaler verify --contract v6 [flags]   # canonical focused rerun + delta validation",
      "  signaler report [--dir <path>]   # primary report/review from artifacts",
      "  signaler init            # compatibility alias of discover (removal planned for v5.3.0)",
      "  signaler review [--dir <path>]   # compatibility alias of report (removal planned for v5.3.0)",
      "  signaler tui [--config <path>]",
      "  signaler quickstart --base-url <url> [--project-root <path>]",
      "  signaler wizard [--config <path>]",
      "  signaler discover [--scope <quick|full|file>] [--routes-file <path>] [--config <path>]",
      "  signaler quick [--config <path>] [--project-root <path>]",
      "  signaler report [--dir <path>]",
      "  signaler folder --root <dir> [--route-cap <n>]",
      "  signaler audit [--cwd <path>] [--base-url <url>] [--scope <quick|full>] [--config <path>]",
      "  signaler guide  (alias of wizard) interactive flow with tips for non-technical users",
      "  signaler upgrade [--version <tag|latest>]  # update the portable global install",
      "  signaler uninstall --global  # remove the portable global install",
      "  signaler shell           # same as default entrypoint",
      "",
      "Commands:",
      "  Interactive:",
      "    shell      Start interactive shell (default)",
      "    tui        Fullscreen interactive dashboard with live command output",
      "    wizard     Run interactive config wizard",
      "    discover   Primary route discovery/setup command",
      "    guide      Same as wizard, with inline tips for non-technical users",
      "    bootstrap  Zero-config: scan project, write config, optional audit",
      "    quickstart Alias: bootstrap --audit --yes",
      "",
      "  Audits and checks:",
      "    run        Primary Lighthouse runner (requires config)",
      "    audit      End-to-end orchestrator: discover + run + analyze",
      "    analyze    V6 machine-facing action packet generator (requires --contract v6)",
      "    verify     V6 focused rerun and pass/fail verification loop (requires --contract v6)",
      "    report     Primary report/review command from existing artifacts",
      "    review     Compatibility alias for report (removal planned for v5.3.0)",
      "    measure    Fast batch metrics (CDP-based, non-Lighthouse)",
      "    quick      Fast runner pack (measure + headers + links + bundle + accessibility pass)",
      "    discover   Primary setup/discovery flow",
      "    folder     Audit a local folder by serving it with a static server",
      "    install    Install the portable CLI globally from GitHub Releases",
      "    upgrade    Update the portable global CLI from GitHub Releases",
      "    bundle     Bundle size audit (Next.js .next/ or dist/ build output)",
      "    health     HTTP status + latency checks for configured routes",
      "    links      Broken links audit (sitemap + HTML link extraction)",
      "    headers    Security headers audit",
      "    console    Console errors + runtime exceptions audit (headless Chrome)",
      "",
      "  Maintenance:",
      "    clean      Remove Signaler artifacts (reports/cache and optionally config)",
      "    uninstall  Remove project artifacts by default, or the global install with --global",
      "    clear-screenshots  Remove .signaler/screenshots/",
      "    install-shim  Install shell shims so direct `signaler` and `signalar` work after JSR install",
      "",
      "  Configuration and Export:",
      "    config     Manage configuration files (create, validate, show)",
      "    export     Export audit data in various formats (CSV, JSON, Excel)",
      "",
      "  Help:",
      "    help       Show this help message",
      "",
      "Options (audit):",
      "  --scope <quick|full>   Discover scope (default full — all static routes)",
      "  --routes-file <path>   Explicit route list file (scope file)",
      "  --incremental-skip     Skip combos that passed prior run criteria",
      "  --incremental          Reuse cache for unchanged combos (requires --build-id)",
      "  --managed-serve        Start server when loopback attach fails (default: attach only)",
      "  --no-managed-serve     Attach only; fail if no healthy loopback server",
      "  --managed-serve-mode <dev|production|auto>  Serve strategy (default production)",
      "  --serve-env KEY=VALUE  Lab env for managed serve child (repeatable; not written to repo)",
      "  --no-audit-bypass      Skip inferred auth bypass env (DEMO_AUTH_BYPASS, etc.)",
      "  --yes, -y              Auto-confirm prompts including lab env injection",
      "  --non-interactive      Skip inferred lab env unless --yes (CI-safe default)",
      "  --in-process           Run job steps in-process (default on)",
      "  --skip-discover        Skip discover when config already exists",
      "  --summary              Print one-screen summary after completion",
      "  --json",
      "",
      "  signaler explore [--cwd <path>] [--base-url <url>] [--json]",
      "    Probe loopback servers, scan routes, write .signaler/explore.json (offline, local only).",
      "",
      "Options (run):",
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
      "  --benchmark-signals <path>  Merge local benchmark fixtures into bounded suggestion ranking + metadata (repeatable)",
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
      "  --benchmark-signals <path>  Merge local benchmark fixtures into bounded composite action ranking + metadata (repeatable)",
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
      "Options (install/upgrade):",
      "  --version <tag|latest>  Release tag to install (default latest)",
      "  --repo <owner/name>     GitHub repo used for portable release lookup (default Dendro-X0/signaler)",
      "  --install-dir <path>    Override install directory",
      "  --bin-dir <path>        Override launcher directory",
      "  --dry-run               Print the plan without downloading",
      "  --json                  Print machine-readable output",
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
      "  --global               Remove the portable global install instead of project artifacts",
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
      "Options (install-shim):",
      "  --dir <path>           Target directory for shim files",
      "  --force                Overwrite existing shim files",
      "  --dry-run              Print target files without writing",
      "  --json                 Print machine-readable output",
      "",
      "Outputs:",
      "  - Writes .signaler/summary.json, summary.md, report.html",
      "  - Prints a file:// link to the HTML report after completion",
      "",
      "Quick start:",
      "  PowerShell: irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex",
      "  Bash:       curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash",
      "  signaler discover                    # guided setup after install",
      "  signaler run                         # run with signaler.config.json",
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
    if (json && topic === "agent") {
      console.log(JSON.stringify(buildAgentHelpJson()));
      return;
    }
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
    await dispatchShellCommand(parsed);
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

export function handleRunBinError(error: unknown): void {
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
  return isSameExecPath(invokedPath, import.meta.filename ?? fileURLToPath(import.meta.url));
}

function shouldRunMain(): boolean {
  if (import.meta.main === true) {
    return true;
  }
  return isDirectExecution();
}

if (shouldRunMain()) {
  void runBin(process.argv).catch(handleRunBinError);
}





