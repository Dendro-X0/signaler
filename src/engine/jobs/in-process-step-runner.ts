import type { EngineJobStepV1 } from "../../engine-contracts/jobs/index.js";
import { createDefaultEngineJobStepRunner } from "./step-runner.js";
import type { EngineJobStepOutcome, EngineJobStepRunner } from "./types.js";

export type InProcessCommandHandler = (argv: readonly string[]) => Promise<void>;

export const IN_PROCESS_JOB_COMMANDS = [
  "discover",
  "init",
  "wizard",
  "guide",
  "run",
  "audit",
  "analyze",
  "verify",
  "query",
  "explain",
  "report",
  "review",
  "headers",
  "links",
  "bundle",
] as const;

export type InProcessJobCommand = (typeof IN_PROCESS_JOB_COMMANDS)[number];

function buildStepArgv(step: EngineJobStepV1): readonly string[] {
  return ["node", "signaler", step.command, ...(step.args ?? [])];
}

function normalizeDiscoverArgv(argv: readonly string[]): readonly string[] {
  const hasScope = argv.some((arg) => arg === "--scope" || arg.startsWith("--scope="));
  return hasScope ? argv : [...argv, "--scope", "full"];
}

let cachedDefaultHandlers: Promise<Record<string, InProcessCommandHandler>> | undefined;

async function defaultInProcessHandlers(): Promise<Record<string, InProcessCommandHandler>> {
  const [
    { runWizardCli },
    { runAuditCli },
    { runAnalyzeCli },
    { runVerifyCli },
    { runQueryCli },
    { runExplainCli },
    { runReportCli },
    { runHeadersCli },
    { runLinksCli },
    { runBundleCli },
  ] = await Promise.all([
    import("../../wizard-cli.js"),
    import("../../cli.js"),
    import("../../analyze-cli.js"),
    import("../../verify-cli.js"),
    import("../../query-cli.js"),
    import("../../explain-cli.js"),
    import("../../report-cli.js"),
    import("../../headers-cli.js"),
    import("../../links-cli.js"),
    import("../../bundle-cli.js"),
  ]);

  return {
    discover: async (argv) => runWizardCli(normalizeDiscoverArgv(argv)),
    init: async (argv) => runWizardCli(normalizeDiscoverArgv(argv)),
    wizard: async (argv) => runWizardCli(normalizeDiscoverArgv(argv)),
    guide: async (argv) => runWizardCli(normalizeDiscoverArgv(argv)),
    run: async (argv) => runAuditCli(argv),
    audit: async (argv) => runAuditCli(argv),
    analyze: async (argv) => runAnalyzeCli(argv),
    verify: async (argv) => runVerifyCli(argv),
    query: async (argv) => runQueryCli(argv),
    explain: async (argv) => runExplainCli(argv),
    report: async (argv) => runReportCli(argv),
    review: async (argv) => runReportCli(argv),
    headers: async (argv) => runHeadersCli(argv),
    links: async (argv) => runLinksCli(argv),
    bundle: async (argv) => runBundleCli(argv),
  };
}

async function resolveHandler(
  command: string,
  overrides?: Partial<Record<string, InProcessCommandHandler>>,
): Promise<InProcessCommandHandler | undefined> {
  if (overrides?.[command]) {
    return overrides[command];
  }
  if (!cachedDefaultHandlers) {
    cachedDefaultHandlers = defaultInProcessHandlers();
  }
  const defaults = await cachedDefaultHandlers;
  return defaults[command];
}

export async function runInProcessJobStep(params: {
  readonly cwd: string;
  readonly step: EngineJobStepV1;
  readonly handlers?: Partial<Record<string, InProcessCommandHandler>>;
}): Promise<EngineJobStepOutcome> {
  const handler = await resolveHandler(params.step.command, params.handlers);
  if (!handler) {
    return createDefaultEngineJobStepRunner()({ cwd: params.cwd, step: params.step });
  }

  const startedMs = Date.now();
  const previousCwd = process.cwd();
  const previousExitCode = process.exitCode;
  process.chdir(params.cwd);
  process.exitCode = 0;

  try {
    await handler(buildStepArgv(params.step));
  } catch {
    return { exitCode: 1, elapsedMs: Date.now() - startedMs };
  } finally {
    process.chdir(previousCwd);
  }

  const exitCode = typeof process.exitCode === "number" ? process.exitCode : 0;
  process.exitCode = previousExitCode;
  return { exitCode, elapsedMs: Date.now() - startedMs };
}

/**
 * Runs preset job steps in-process by calling existing CLI modules (no `node bin.js` subprocess).
 */
export function createInProcessEngineJobStepRunner(
  overrides?: Partial<Record<string, InProcessCommandHandler>>,
): EngineJobStepRunner {
  return (params) => runInProcessJobStep({ ...params, handlers: overrides });
}
