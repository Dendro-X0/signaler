import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type GateStatus = "ok" | "warn" | "error";

type GateCheck = {
  readonly id: string;
  readonly status: GateStatus;
  readonly details: string;
  readonly blocking: boolean;
};

type GateReport = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly status: GateStatus;
  readonly checks: readonly GateCheck[];
  readonly summary: {
    readonly blockingFailures: number;
    readonly warnings: number;
    readonly manualItems: number;
  };
};

type LoopSmokeEvidence = {
  readonly schemaVersion?: unknown;
  readonly status?: unknown;
  readonly elapsedMs?: unknown;
  readonly maxAllowedMs?: unknown;
};

type LowMemoryEvidence = {
  readonly schemaVersion?: unknown;
  readonly status?: unknown;
  readonly assertions?: {
    readonly lowMemoryReasonPresent?: unknown;
    readonly forcedProfileReasonPresent?: unknown;
    readonly parallelCappedToOne?: unknown;
    readonly stableRunner?: unknown;
    readonly predictabilityImproved?: unknown;
  };
};

type CliArgs = {
  readonly outJsonPath: string;
  readonly outMarkdownPath: string;
  readonly rootDir: string;
};

function parseArgs(argv: readonly string[]): CliArgs {
  let outJsonPath = resolve("benchmarks/out/v63-success-gate.json");
  let outMarkdownPath = resolve("benchmarks/out/v63-success-gate.md");
  let rootDir = resolve(".");
  for (let i = 0; i < argv.length; i += 1) {
    const arg: string = argv[i] ?? "";
    if (arg === "--out-json" && i + 1 < argv.length) {
      outJsonPath = resolve(argv[i + 1] ?? outJsonPath);
      i += 1;
      continue;
    }
    if (arg.startsWith("--out-json=")) {
      outJsonPath = resolve(arg.slice("--out-json=".length));
      continue;
    }
    if (arg === "--out-md" && i + 1 < argv.length) {
      outMarkdownPath = resolve(argv[i + 1] ?? outMarkdownPath);
      i += 1;
      continue;
    }
    if (arg.startsWith("--out-md=")) {
      outMarkdownPath = resolve(arg.slice("--out-md=".length));
      continue;
    }
    if (arg === "--root" && i + 1 < argv.length) {
      rootDir = resolve(argv[i + 1] ?? rootDir);
      i += 1;
      continue;
    }
    if (arg.startsWith("--root=")) {
      rootDir = resolve(arg.slice("--root=".length));
    }
  }
  return { outJsonPath, outMarkdownPath, rootDir };
}

async function fileExists(pathToFile: string): Promise<boolean> {
  try {
    await stat(pathToFile);
    return true;
  } catch {
    return false;
  }
}

async function readText(pathToFile: string): Promise<string | undefined> {
  try {
    return await readFile(pathToFile, "utf8");
  } catch {
    return undefined;
  }
}

function check(id: string, status: GateStatus, details: string, blocking: boolean): GateCheck {
  return { id, status, details, blocking };
}

function summarize(checks: readonly GateCheck[]): GateReport["summary"] {
  const blockingFailures = checks.filter((entry) => entry.blocking && entry.status === "error").length;
  const warnings = checks.filter((entry) => entry.status === "warn").length;
  const manualItems = checks.filter((entry) => !entry.blocking).length;
  return { blockingFailures, warnings, manualItems };
}

function statusFromSummary(summary: GateReport["summary"]): GateStatus {
  if (summary.blockingFailures > 0) return "error";
  if (summary.warnings > 0) return "warn";
  return "ok";
}

function toMarkdown(report: GateReport): string {
  const lines: string[] = [];
  lines.push("# V6.3 Success Gate");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Status: ${report.status.toUpperCase()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Blocking failures: ${report.summary.blockingFailures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Manual items: ${report.summary.manualItems}`);
  lines.push("");
  lines.push("## Checks");
  lines.push("");
  lines.push("| Check | Status | Blocking | Details |");
  lines.push("| --- | --- | --- | --- |");
  for (const item of report.checks) {
    lines.push(`| ${item.id} | ${item.status} | ${item.blocking ? "yes" : "no"} | ${item.details.replace(/\|/g, "\\|")} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function containsCanonicalV63Flow(text: string): boolean {
  const compact: string = text.toLowerCase();
  if (compact.includes("discover -> run -> analyze -> verify -> report")) {
    return true;
  }
  if (compact.includes("discover") && compact.includes("run") && compact.includes("analyze") && compact.includes("verify") && compact.includes("report")) {
    return true;
  }
  return false;
}

function countSuccessGateChecks(markdown: string): { readonly total: number; readonly completed: number } {
  const lines: readonly string[] = markdown.split(/\r?\n/);
  const startIndex: number = lines.findIndex((line) => line.trim() === "## Success Gate");
  if (startIndex < 0) {
    return { total: 0, completed: 0 };
  }
  let total = 0;
  let completed = 0;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line: string = lines[i] ?? "";
    if (line.startsWith("## ")) {
      break;
    }
    const trimmed: string = line.trim();
    if (!trimmed.startsWith("- [")) {
      continue;
    }
    total += 1;
    if (trimmed.startsWith("- [x]")) {
      completed += 1;
    }
  }
  return { total, completed };
}

async function evaluateSuccessGate(args: CliArgs): Promise<GateReport> {
  const checks: GateCheck[] = [];
  const root = args.rootDir;

  const requiredPaths: readonly string[] = [
    "README.md",
    "docs/guides/getting-started.md",
    "docs/reference/cli.md",
    "docs/roadmap/active-roadmap.md",
    "src/analyze-cli.ts",
    "src/verify-cli.ts",
    "src/cli.ts",
    "src/shell-cli.ts",
    "test/analyze-cli-v6.test.ts",
    "test/verify-cli-v6.test.ts",
  ] as const;
  const missing: string[] = [];
  for (const relPath of requiredPaths) {
    if (!(await fileExists(resolve(root, relPath)))) {
      missing.push(relPath);
    }
  }
  checks.push(
    missing.length === 0
      ? check("v63-required-files", "ok", "Core V6.3 docs, commands, and tests are present.", true)
      : check("v63-required-files", "error", `Missing required files: ${missing.join(", ")}`, true),
  );

  const flowDocs: readonly string[] = [
    await readText(resolve(root, "README.md")),
    await readText(resolve(root, "docs/guides/getting-started.md")),
    await readText(resolve(root, "docs/reference/cli.md")),
  ].filter((value): value is string => value !== undefined);
  const flowMatches = flowDocs.filter((text) => containsCanonicalV63Flow(text)).length;
  checks.push(
    flowMatches >= 2
      ? check("canonical-flow-docs-v63", "ok", `V6.3 canonical flow found in ${flowMatches} key docs.`, true)
      : check("canonical-flow-docs-v63", "error", "Canonical flow `discover -> run -> analyze -> verify -> report` is not clear across key docs.", true),
  );

  const cliAndCi = await readText(resolve(root, "docs/reference/cli.md"));
  const gettingStarted = await readText(resolve(root, "docs/guides/getting-started.md"));
  const hasLocalNodeDocs = Boolean(
    (cliAndCi?.includes("node ./dist/bin.js") ?? false)
    && ((gettingStarted?.includes("node ./dist/bin.js") ?? false) || (gettingStarted?.includes("node .\\dist\\bin.js") ?? false)),
  );
  checks.push(
    hasLocalNodeDocs
      ? check("local-workspace-flow-docs", "ok", "Local unpublished-build execution path is documented with node dist/bin.js commands.", true)
      : check("local-workspace-flow-docs", "error", "Missing local unpublished-build workflow docs (`node ./dist/bin.js ...`).", true),
  );

  const verifyCli = await readText(resolve(root, "src/verify-cli.ts"));
  const shellCli = await readText(resolve(root, "src/shell-cli.ts"));
  const hasRuntimeBudgetFlag = Boolean(
    (verifyCli?.includes("--runtime-budget-ms") ?? false)
    && (shellCli?.includes("--runtime-budget-ms") ?? false),
  );
  checks.push(
    hasRuntimeBudgetFlag
      ? check("runtime-budget-integration", "ok", "Verify runtime budget flag is integrated in CLI and shell completion.", true)
      : check("runtime-budget-integration", "error", "Missing runtime budget integration in verify command and/or shell completion.", true),
  );

  const analyzeCli = await readText(resolve(root, "src/analyze-cli.ts"));
  const hasTimingMetadata = Boolean(
    (analyzeCli?.includes("elapsedMs") ?? false)
    && (verifyCli?.includes("plannedCombos") ?? false)
    && (verifyCli?.includes("executedCombos") ?? false),
  );
  checks.push(
    hasTimingMetadata
      ? check("timing-metadata", "ok", "Compact JSON summaries include orchestration timing/planning fields.", true)
      : check("timing-metadata", "error", "Missing expected timing/planning fields in analyze/verify JSON summaries.", true),
  );

  const runCli = await readText(resolve(root, "src/cli.ts"));
  const hasLowMemoryGuidance = runCli?.includes("Low-memory guidance:") ?? false;
  checks.push(
    hasLowMemoryGuidance
      ? check("low-memory-guidance", "ok", "Low-memory throughput guidance is present in run output path.", true)
      : check("low-memory-guidance", "error", "Low-memory guidance text not found in run path.", true),
  );

  const analyzeTest = await readText(resolve(root, "test/analyze-cli-v6.test.ts"));
  const verifyTest = await readText(resolve(root, "test/verify-cli-v6.test.ts"));
  const hasCoverage = Boolean(
    (analyzeTest?.includes("elapsedMs") ?? false)
    && (verifyTest?.includes("--runtime-budget-ms") ?? false)
    && (verifyTest?.includes("plannedCombos") ?? false)
    && (verifyTest?.includes("executedCombos") ?? false),
  );
  checks.push(
    hasCoverage
      ? check("v63-regression-tests", "ok", "V6.3 regression tests cover timing metadata and runtime budget planning.", true)
      : check("v63-regression-tests", "error", "Expected V6.3 regression tests are missing or incomplete.", true),
  );

  const roadmapText = await readText(resolve(root, "docs/roadmap/active-roadmap.md"));
  if (roadmapText === undefined) {
    checks.push(check("success-gate-progress", "warn", "Active roadmap missing; cannot inspect success-gate progress.", false));
  } else {
    const progress = countSuccessGateChecks(roadmapText);
    if (progress.total === 0) {
      checks.push(check("success-gate-progress", "warn", "Success Gate section not found in v6.3 roadmap.", false));
    } else if (progress.completed === progress.total) {
      checks.push(check("success-gate-progress", "ok", `Success gate checklist complete (${progress.completed}/${progress.total}).`, false));
    } else {
      checks.push(check("success-gate-progress", "warn", `Success gate checklist incomplete (${progress.completed}/${progress.total}).`, false));
    }
  }

  const loopEvidencePath = resolve(root, "benchmarks/out/v63-loop-smoke.json");
  if (!(await fileExists(loopEvidencePath))) {
    checks.push(check("loop-smoke-evidence", "warn", "Loop smoke evidence not found (benchmarks/out/v63-loop-smoke.json).", false));
  } else {
    const rawLoopSmoke = await readText(loopEvidencePath);
    if (rawLoopSmoke === undefined) {
      checks.push(check("loop-smoke-evidence", "warn", "Loop smoke evidence exists but could not be read.", false));
    } else {
      try {
        const parsed = JSON.parse(rawLoopSmoke) as LoopSmokeEvidence;
        const hasSchema = parsed.schemaVersion === 1;
        const hasStatus = parsed.status === "pass" || parsed.status === "fail";
        const hasElapsed = typeof parsed.elapsedMs === "number" && Number.isFinite(parsed.elapsedMs);
        const hasMax = typeof parsed.maxAllowedMs === "number" && Number.isFinite(parsed.maxAllowedMs);
        if (!hasSchema || !hasStatus || !hasElapsed || !hasMax) {
          checks.push(check("loop-smoke-evidence", "warn", "Loop smoke evidence format is invalid.", false));
        } else if (parsed.status === "pass") {
          checks.push(check("loop-smoke-evidence", "ok", `Loop smoke passed in ${Math.round(parsed.elapsedMs as number)}ms.`, false));
        } else {
          checks.push(check("loop-smoke-evidence", "warn", "Loop smoke report exists but status is fail.", false));
        }
      } catch {
        checks.push(check("loop-smoke-evidence", "warn", "Loop smoke evidence is not valid JSON.", false));
      }
    }
  }

  const lowMemoryEvidencePath = resolve(root, "benchmarks/out/v63-low-memory-evidence.json");
  if (!(await fileExists(lowMemoryEvidencePath))) {
    checks.push(check("low-memory-evidence", "warn", "Low-memory evidence not found (benchmarks/out/v63-low-memory-evidence.json).", false));
  } else {
    const rawLowMemory = await readText(lowMemoryEvidencePath);
    if (rawLowMemory === undefined) {
      checks.push(check("low-memory-evidence", "warn", "Low-memory evidence exists but could not be read.", false));
    } else {
      try {
        const parsed = JSON.parse(rawLowMemory) as LowMemoryEvidence;
        const hasSchema = parsed.schemaVersion === 1;
        const hasStatus = parsed.status === "pass" || parsed.status === "fail";
        const assertions = parsed.assertions;
        const assertionsPresent = Boolean(assertions);
        const assertionsValid = assertionsPresent
          && typeof assertions?.lowMemoryReasonPresent === "boolean"
          && typeof assertions?.forcedProfileReasonPresent === "boolean"
          && typeof assertions?.parallelCappedToOne === "boolean"
          && typeof assertions?.stableRunner === "boolean"
          && typeof assertions?.predictabilityImproved === "boolean";
        if (!hasSchema || !hasStatus || !assertionsPresent || !assertionsValid) {
          checks.push(check("low-memory-evidence", "warn", "Low-memory evidence format is invalid.", false));
        } else if (parsed.status === "pass") {
          checks.push(check("low-memory-evidence", "ok", "Low-memory evidence report is present and passing.", false));
        } else {
          checks.push(check("low-memory-evidence", "warn", "Low-memory evidence report exists but status is fail.", false));
        }
      } catch {
        checks.push(check("low-memory-evidence", "warn", "Low-memory evidence is not valid JSON.", false));
      }
    }
  }

  const summary = summarize(checks);
  const report: GateReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: statusFromSummary(summary),
    checks,
    summary,
  };
  await mkdir(dirname(args.outJsonPath), { recursive: true });
  await mkdir(dirname(args.outMarkdownPath), { recursive: true });
  await writeFile(args.outJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(args.outMarkdownPath, toMarkdown(report), "utf8");
  return report;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const report = await evaluateSuccessGate(args);
  console.log(`[v63-gate] status=${report.status} blockingFailures=${report.summary.blockingFailures} warnings=${report.summary.warnings}`);
  console.log(`[v63-gate] report: ${args.outJsonPath}`);
  console.log(`[v63-gate] summary: ${args.outMarkdownPath}`);
  for (const entry of report.checks) {
    const prefix = `[v63-gate][${entry.status}]`;
    const line = `${prefix} ${entry.id}: ${entry.details}`;
    if (entry.status === "error") {
      console.error(line);
    } else {
      console.log(line);
    }
  }
  if (report.summary.blockingFailures > 0) {
    process.exitCode = 1;
  }
}

void main();

export type { GateCheck, GateReport, GateStatus };
export { evaluateSuccessGate, parseArgs };
