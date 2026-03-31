import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

type CliArgs = {
  readonly outJsonPath: string;
  readonly outMarkdownPath: string;
  readonly rootDir: string;
};

type WorkstreamJOverheadEvidence = {
  readonly schemaVersion?: unknown;
  readonly status?: unknown;
  readonly assertions?: {
    readonly baselineHasNoBenchmarkMerge?: unknown;
    readonly benchmarkHasAcceptedRecords?: unknown;
    readonly medianOverheadWithinBudget?: unknown;
    readonly p95OverheadWithinBudget?: unknown;
  };
};

type PackageJsonLike = {
  readonly scripts?: unknown;
};

function parseArgs(argv: readonly string[]): CliArgs {
  let outJsonPath = resolve("benchmarks/out/workstream-j-gate.json");
  let outMarkdownPath = resolve("benchmarks/out/workstream-j-gate.md");
  let rootDir = resolve(".");
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
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
  lines.push("# Workstream J Gate");
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

function parsePackageScripts(raw: string | undefined): readonly string[] {
  if (raw === undefined) return [];
  try {
    const parsed = JSON.parse(raw) as PackageJsonLike;
    if (typeof parsed.scripts !== "object" || parsed.scripts === null) {
      return [];
    }
    return Object.keys(parsed.scripts as Record<string, unknown>);
  } catch {
    return [];
  }
}

function includesAll(haystack: readonly string[], required: readonly string[]): boolean {
  const set = new Set(haystack);
  return required.every((item) => set.has(item));
}

async function evaluateWorkstreamJGate(args: CliArgs): Promise<GateReport> {
  const checks: GateCheck[] = [];
  const root = args.rootDir;

  const requiredSourceFiles: readonly string[] = [
    "src/accessibility-benchmark-signals.ts",
    "src/security-benchmark-signals.ts",
    "src/reliability-benchmark-signals.ts",
    "src/seo-benchmark-signals.ts",
    "src/cross-browser-benchmark-signals.ts",
    "src/multi-benchmark-signals.ts",
  ] as const;
  const missingSource: string[] = [];
  for (const relPath of requiredSourceFiles) {
    if (!(await fileExists(resolve(root, relPath)))) {
      missingSource.push(relPath);
    }
  }
  checks.push(
    missingSource.length === 0
      ? check("workstream-j-source-adapters", "ok", "All benchmark signal adapter sources are present.", true)
      : check("workstream-j-source-adapters", "error", `Missing source adapters: ${missingSource.join(", ")}`, true),
  );

  const requiredScripts: readonly string[] = [
    "scripts/build-accessibility-benchmark-fixture.ts",
    "scripts/build-security-benchmark-fixture.ts",
    "scripts/build-reliability-benchmark-fixture.ts",
    "scripts/build-seo-benchmark-fixture.ts",
    "scripts/build-cross-browser-benchmark-fixture.ts",
    "benchmarks/workstream-j/optional-input-overhead.ts",
  ] as const;
  const missingScripts: string[] = [];
  for (const relPath of requiredScripts) {
    if (!(await fileExists(resolve(root, relPath)))) {
      missingScripts.push(relPath);
    }
  }
  checks.push(
    missingScripts.length === 0
      ? check("workstream-j-helpers-and-benchmarks", "ok", "Fixture helper scripts and overhead benchmark runner are present.", true)
      : check("workstream-j-helpers-and-benchmarks", "error", `Missing helper/benchmark scripts: ${missingScripts.join(", ")}`, true),
  );

  const requiredTests: readonly string[] = [
    "test/accessibility-benchmark-signals.test.ts",
    "test/security-benchmark-signals.test.ts",
    "test/reliability-benchmark-signals.test.ts",
    "test/seo-benchmark-signals.test.ts",
    "test/cross-browser-benchmark-signals.test.ts",
    "test/multi-benchmark-signals.test.ts",
    "test/workstream-j-optional-input-overhead.test.ts",
  ] as const;
  const missingTests: string[] = [];
  for (const relPath of requiredTests) {
    if (!(await fileExists(resolve(root, relPath)))) {
      missingTests.push(relPath);
    }
  }
  checks.push(
    missingTests.length === 0
      ? check("workstream-j-test-coverage", "ok", "Adapter and overhead evidence tests are present.", true)
      : check("workstream-j-test-coverage", "error", `Missing test files: ${missingTests.join(", ")}`, true),
  );

  const packageScripts = parsePackageScripts(await readText(resolve(root, "package.json")));
  const requiredPackageScripts: readonly string[] = [
    "bench:workstream-j:overhead",
    "bench:fixture:accessibility",
    "bench:fixture:security",
    "bench:fixture:reliability",
    "bench:fixture:seo",
    "bench:fixture:parity",
  ] as const;
  checks.push(
    includesAll(packageScripts, requiredPackageScripts)
      ? check("workstream-j-package-scripts", "ok", "All Workstream J package scripts are present.", true)
      : check(
        "workstream-j-package-scripts",
        "error",
        `Missing package scripts: ${requiredPackageScripts.filter((name) => !packageScripts.includes(name)).join(", ")}`,
        true,
      ),
  );

  const cliDocs = await readText(resolve(root, "docs/reference/cli.md"));
  const gettingStarted = await readText(resolve(root, "docs/guides/getting-started.md"));
  const testingDocs = await readText(resolve(root, "docs/reference/testing.md"));
  const docsMentionFixtures = Boolean(
    (cliDocs?.includes("bench:fixture:accessibility") ?? false)
    && (cliDocs?.includes("bench:fixture:security") ?? false)
    && (cliDocs?.includes("bench:fixture:reliability") ?? false)
    && (cliDocs?.includes("bench:fixture:seo") ?? false)
    && (cliDocs?.includes("bench:fixture:parity") ?? false)
    && (gettingStarted?.includes("bench:fixture:parity") ?? false)
    && (testingDocs?.includes("bench:fixture:parity") ?? false),
  );
  checks.push(
    docsMentionFixtures
      ? check("workstream-j-docs-fixtures", "ok", "CLI/getting-started/testing docs include all benchmark fixture helper commands.", true)
      : check("workstream-j-docs-fixtures", "error", "Docs are missing one or more benchmark fixture helper command references.", true),
  );

  const planDoc = await readText(resolve(root, "docs/specs/workstream-j-implementation-plan.md"));
  const planMentionsParity = Boolean(
    (planDoc?.includes("cross-browser parity fixture adapter") ?? false)
    || (planDoc?.includes("cross-browser parity fixture") ?? false),
  );
  checks.push(
    planMentionsParity
      ? check("workstream-j-plan-progress", "ok", "Workstream J implementation plan includes parity adapter progress notes.", false)
      : check("workstream-j-plan-progress", "warn", "Workstream J implementation plan is missing parity adapter progress notes.", false),
  );

  const overheadPath = resolve(root, "benchmarks/out/workstream-j-optional-input-overhead.json");
  if (!(await fileExists(overheadPath))) {
    checks.push(check("workstream-j-overhead-evidence", "warn", "Workstream J overhead evidence not found (benchmarks/out/workstream-j-optional-input-overhead.json).", false));
  } else {
    const raw = await readText(overheadPath);
    if (raw === undefined) {
      checks.push(check("workstream-j-overhead-evidence", "warn", "Workstream J overhead evidence exists but could not be read.", false));
    } else {
      try {
        const parsed = JSON.parse(raw) as WorkstreamJOverheadEvidence;
        const valid = parsed.schemaVersion === 1
          && (parsed.status === "pass" || parsed.status === "fail")
          && typeof parsed.assertions?.baselineHasNoBenchmarkMerge === "boolean"
          && typeof parsed.assertions?.benchmarkHasAcceptedRecords === "boolean"
          && typeof parsed.assertions?.medianOverheadWithinBudget === "boolean"
          && typeof parsed.assertions?.p95OverheadWithinBudget === "boolean";
        if (!valid) {
          checks.push(check("workstream-j-overhead-evidence", "warn", "Workstream J overhead evidence format is invalid.", false));
        } else if (parsed.status === "pass") {
          checks.push(check("workstream-j-overhead-evidence", "ok", "Workstream J overhead evidence is present and passing.", false));
        } else {
          checks.push(check("workstream-j-overhead-evidence", "warn", "Workstream J overhead evidence exists but status is fail.", false));
        }
      } catch {
        checks.push(check("workstream-j-overhead-evidence", "warn", "Workstream J overhead evidence is not valid JSON.", false));
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
  const report = await evaluateWorkstreamJGate(args);
  console.log(`[workstream-j-gate] status=${report.status} blockingFailures=${report.summary.blockingFailures} warnings=${report.summary.warnings}`);
  console.log(`[workstream-j-gate] report: ${args.outJsonPath}`);
  console.log(`[workstream-j-gate] summary: ${args.outMarkdownPath}`);
  for (const entry of report.checks) {
    const prefix = `[workstream-j-gate][${entry.status}]`;
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

const SCRIPT_PATH = fileURLToPath(import.meta.url);

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  void main();
}

export type { GateCheck, GateReport, GateStatus };
export { evaluateWorkstreamJGate, parseArgs };
