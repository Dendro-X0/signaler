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

type CliArgs = {
  readonly outJsonPath: string;
  readonly outMarkdownPath: string;
  readonly rootDir: string;
};

type PackageJsonLike = {
  readonly name?: unknown;
  readonly version?: unknown;
  readonly bin?: unknown;
  readonly scripts?: unknown;
};

type LoopSmokeEvidence = {
  readonly generatedAt?: unknown;
};

type DogfoodEvidenceEntry = {
  readonly repo?: unknown;
  readonly owner?: unknown;
  readonly startDate?: unknown;
  readonly endDate?: unknown;
  readonly notes?: unknown;
};

type DogfoodEvidenceFile = {
  readonly schemaVersion?: unknown;
  readonly generatedAt?: unknown;
  readonly entries?: unknown;
};

function parseArgs(argv: readonly string[]): CliArgs {
  let outJsonPath = resolve("benchmarks/out/v3-release-gate.json");
  let outMarkdownPath = resolve("benchmarks/out/v3-release-gate.md");
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
  lines.push("# V3 Release Gate (Phase 1)");
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

function containsCanonicalV3Flow(text: string): boolean {
  const compact = text.toLowerCase();
  if (compact.includes("discover -> run -> analyze -> verify -> report")) return true;
  if (compact.includes("discover") && compact.includes("run") && compact.includes("analyze") && compact.includes("verify") && compact.includes("report")) return true;
  return false;
}

function hasLocalBuildPath(text: string): boolean {
  return /node\s+\.[\\/]{1}dist[\\/]{1}bin\.js/i.test(text) || /node\s+\.[\\]{1}dist[\\]{1}bin\.js/i.test(text);
}

function parseDogfoodCompletedCount(markdown: string): number {
  const lines = markdown.split(/\r?\n/);
  let completed = 0;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    if (/repo|owner|start date|end date|notes/i.test(line)) continue;
    const columns = line.split("|").map((value) => value.trim());
    if (columns.length < 6) continue;
    const startDate = columns[3] ?? "";
    const endDate = columns[4] ?? "";
    const hasStart = /^\d{4}-\d{2}-\d{2}$/.test(startDate);
    const hasEnd = /^\d{4}-\d{2}-\d{2}$/.test(endDate);
    if (hasStart && hasEnd) completed += 1;
  }
  return completed;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function daysBetween(startIsoDate: string, endIsoDate: string): number {
  const startMs = Date.parse(`${startIsoDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${endIsoDate}T00:00:00.000Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return -1;
  }
  return Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000));
}

function isDogfoodEntry(value: unknown): value is DogfoodEvidenceEntry {
  return typeof value === "object" && value !== null;
}

function countQualifiedDogfoodEntries(rawFile: string): { readonly ok: boolean; readonly completed: number; readonly total: number; readonly reason?: string } {
  try {
    const parsed = JSON.parse(rawFile) as DogfoodEvidenceFile;
    if (parsed.schemaVersion !== 1) {
      return { ok: false, completed: 0, total: 0, reason: "schemaVersion must be 1" };
    }
    if (!Array.isArray(parsed.entries)) {
      return { ok: false, completed: 0, total: 0, reason: "entries must be an array" };
    }
    const entries = parsed.entries.filter(isDogfoodEntry);
    let completed = 0;
    for (const entry of entries) {
      if (!isIsoDate(entry.startDate) || !isIsoDate(entry.endDate)) continue;
      const durationDays = daysBetween(entry.startDate, entry.endDate);
      if (durationDays >= 14) {
        completed += 1;
      }
    }
    return { ok: true, completed, total: entries.length };
  } catch {
    return { ok: false, completed: 0, total: 0, reason: "not valid JSON" };
  }
}

function parsePackageJson(raw: string | undefined): PackageJsonLike | undefined {
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as PackageJsonLike;
  } catch {
    return undefined;
  }
}

function readScriptNames(pkg: PackageJsonLike | undefined): readonly string[] {
  if (pkg === undefined || typeof pkg.scripts !== "object" || pkg.scripts === null) {
    return [];
  }
  return Object.keys(pkg.scripts as Record<string, unknown>);
}

function getPackageName(pkg: PackageJsonLike | undefined): string | undefined {
  return typeof pkg?.name === "string" ? pkg.name : undefined;
}

function getBinSignaler(pkg: PackageJsonLike | undefined): string | undefined {
  if (typeof pkg?.bin !== "object" || pkg.bin === null) return undefined;
  const bin = pkg.bin as Record<string, unknown>;
  return typeof bin.signaler === "string" ? bin.signaler : undefined;
}

function isRecentIsoTimestamp(value: unknown, maxAgeDays: number): boolean {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;
  const ageMs = Date.now() - timestamp;
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return ageMs >= 0 && ageMs <= maxAgeMs;
}

async function evaluateV3ReleaseGate(args: CliArgs): Promise<GateReport> {
  const checks: GateCheck[] = [];
  const root = args.rootDir;

  const requiredDocs = [
    "docs/reference/contracts-v3.md",
    "docs/guides/migration.md",
  ];
  const missingDocs: string[] = [];
  for (const relPath of requiredDocs) {
    if (!(await fileExists(resolve(root, relPath)))) {
      missingDocs.push(relPath);
    }
  }
  checks.push(
    missingDocs.length === 0
      ? check("v3-core-docs", "ok", "V3 contract and migration docs are present.", true)
      : check("v3-core-docs", "error", `Missing required docs: ${missingDocs.join(", ")}`, true),
  );

  const flowDocs = [
    await readText(resolve(root, "README.md")),
    await readText(resolve(root, "docs/guides/getting-started.md")),
    await readText(resolve(root, "docs/reference/cli.md")),
  ].filter((value): value is string => value !== undefined);
  const flowMatches = flowDocs.filter((text) => containsCanonicalV3Flow(text)).length;
  checks.push(
    flowMatches >= 2
      ? check("canonical-flow-docs-v3", "ok", `Canonical flow is clear in ${flowMatches} key docs.`, true)
      : check("canonical-flow-docs-v3", "error", "Canonical flow `discover -> run -> analyze -> verify -> report` is not clear across key docs.", true),
  );

  const cliAndCi = await readText(resolve(root, "docs/reference/cli.md"));
  const gettingStarted = await readText(resolve(root, "docs/guides/getting-started.md"));
  const readme = await readText(resolve(root, "README.md"));
  const hasLocalBuildDocs = Boolean(
    (cliAndCi !== undefined && hasLocalBuildPath(cliAndCi))
    && ((readme !== undefined && hasLocalBuildPath(readme)) || (gettingStarted?.includes("dist/bin.js") === true)),
  );
  checks.push(
    hasLocalBuildDocs
      ? check("local-build-flow-docs", "ok", "Local unpublished-build workflow (`node ./dist/bin.js`) is documented.", true)
      : check("local-build-flow-docs", "error", "Missing local unpublished-build workflow docs in key onboarding files.", true),
  );

  const packageJsonRaw = await readText(resolve(root, "package.json"));
  const packageJson = parsePackageJson(packageJsonRaw);
  const scriptNames = readScriptNames(packageJson);
  const requiredScripts = [
    "build",
    "test:phase6:smoke",
    "bench:v63:loop",
  ];
  const missingCoreScripts = requiredScripts.filter((name) => !scriptNames.includes(name));
  checks.push(
    missingCoreScripts.length === 0
      ? check("required-cli-scripts", "ok", "Required build/smoke scripts are present.", true)
      : check("required-cli-scripts", "error", `Missing scripts: ${missingCoreScripts.join(", ")}`, true),
  );

  const requiredDependencyScripts = [
    "bench:v63:gate",
    "bench:v63:validate",
  ];
  const missingDependencyScripts = requiredDependencyScripts.filter((name) => !scriptNames.includes(name));
  checks.push(
    missingDependencyScripts.length === 0
      ? check("v63-gate-dependencies", "ok", "V6.3 gate dependency scripts are present.", true)
      : check("v63-gate-dependencies", "error", `Missing V6.3 gate dependency scripts: ${missingDependencyScripts.join(", ")}`, true),
  );

  const packageName = getPackageName(packageJson);
  const binSignaler = getBinSignaler(packageJson);
  const packageMetadataOk = packageName === "@signaler/cli" && binSignaler !== undefined && binSignaler.length > 0;
  checks.push(
    packageMetadataOk
      ? check("package-metadata", "ok", "Package name and signaler bin mapping are valid.", true)
      : check("package-metadata", "error", "Invalid package metadata: expected name=@signaler/cli and bin.signaler mapping.", true),
  );

  const requiredSchemaFiles = [
    "benchmarks/v3-release/report.schema.json",
    "benchmarks/v3-release/validate.ts",
    "benchmarks/v3-release/evaluate-gate.ts",
  ];
  const missingSchemaFiles: string[] = [];
  for (const relPath of requiredSchemaFiles) {
    if (!(await fileExists(resolve(root, relPath)))) {
      missingSchemaFiles.push(relPath);
    }
  }
  checks.push(
    missingSchemaFiles.length === 0
      ? check("v3-gate-schema-files", "ok", "V3 gate evaluator/validator/schema files are present.", true)
      : check("v3-gate-schema-files", "error", `Missing V3 gate files: ${missingSchemaFiles.join(", ")}`, true),
  );

  const manifestFiles = [
    "release/v3/release-manifest.schema.json",
    "release/v3/release-manifest.example.json",
    "release/v3/dogfood-evidence.schema.json",
    "release/v3/dogfood-evidence.json",
  ];
  const missingManifestFiles: string[] = [];
  for (const relPath of manifestFiles) {
    if (!(await fileExists(resolve(root, relPath)))) {
      missingManifestFiles.push(relPath);
    }
  }
  checks.push(
    missingManifestFiles.length === 0
      ? check("release-manifest-contract", "ok", "V3 release manifest schema/example files are present.", true)
      : check("release-manifest-contract", "error", `Missing release manifest files: ${missingManifestFiles.join(", ")}`, true),
  );

  const launchChecklist = await readText(resolve(root, "docs/operations/launch-checklist.md"));
  const hasV3GateChecklistLinks = Boolean(
    launchChecklist !== undefined
    && launchChecklist.includes("bench:v3:gate")
    && launchChecklist.includes("bench:v3:validate"),
  );
  checks.push(
    hasV3GateChecklistLinks
      ? check("release-checklist-v3-gate", "ok", "Launch checklist references V3 release gate commands.", true)
      : check("release-checklist-v3-gate", "error", "Launch checklist is missing V3 release gate command references.", true),
  );

  const dogfoodJsonPath = resolve(root, "release/v3/dogfood-evidence.json");
  const dogfoodJsonRaw = await readText(dogfoodJsonPath);
  if (dogfoodJsonRaw !== undefined) {
    const parsedDogfood = countQualifiedDogfoodEntries(dogfoodJsonRaw);
    if (!parsedDogfood.ok) {
      checks.push(check("dogfood-evidence", "warn", `Dogfood evidence JSON is invalid (${parsedDogfood.reason ?? "unknown reason"}).`, false));
    } else if (parsedDogfood.completed >= 3) {
      checks.push(
        check(
          "dogfood-evidence",
          "ok",
          `Dogfood evidence complete for ${parsedDogfood.completed} repos (>=14 days each).`,
          false,
        ),
      );
    } else {
      checks.push(
        check(
          "dogfood-evidence",
          "warn",
          `Dogfood evidence incomplete (${parsedDogfood.completed}/3 repos >=14 days; entries=${parsedDogfood.total}).`,
          false,
        ),
      );
    }
  } else if (launchChecklist === undefined) {
    checks.push(check("dogfood-evidence", "warn", "Missing release/v3/dogfood-evidence.json and launch checklist fallback.", false));
  } else {
    const completed = parseDogfoodCompletedCount(launchChecklist);
    if (completed >= 3) {
      checks.push(check("dogfood-evidence", "ok", `Dogfood evidence complete for ${completed} repos (table fallback).`, false));
    } else {
      checks.push(check("dogfood-evidence", "warn", `Dogfood evidence incomplete (${completed}/3 repos completed, table fallback).`, false));
    }
  }

  const loopSmokePath = resolve(root, "benchmarks/out/v63-loop-smoke.json");
  if (!(await fileExists(loopSmokePath))) {
    checks.push(check("loop-smoke-evidence", "warn", "Loop smoke evidence file not found (benchmarks/out/v63-loop-smoke.json).", false));
  } else {
    const rawLoopSmoke = await readText(loopSmokePath);
    if (rawLoopSmoke === undefined) {
      checks.push(check("loop-smoke-evidence", "warn", "Loop smoke evidence exists but could not be read.", false));
    } else {
      try {
        const parsed = JSON.parse(rawLoopSmoke) as LoopSmokeEvidence;
        if (isRecentIsoTimestamp(parsed.generatedAt, 30)) {
          checks.push(check("loop-smoke-evidence", "ok", "Loop smoke evidence exists and is recent (<=30 days).", false));
        } else {
          checks.push(check("loop-smoke-evidence", "warn", "Loop smoke evidence exists but appears stale (>30 days) or missing generatedAt.", false));
        }
      } catch {
        checks.push(check("loop-smoke-evidence", "warn", "Loop smoke evidence is not valid JSON.", false));
      }
    }
  }

  const draftReleaseNotesCandidates = [
    "docs/archive/release-notes/RELEASE-NOTES-v3.0.0-draft.md",
  ];
  let hasDraftReleaseNotes = false;
  for (const relPath of draftReleaseNotesCandidates) {
    if (await fileExists(resolve(root, relPath))) {
      hasDraftReleaseNotes = true;
      break;
    }
  }
  checks.push(
    hasDraftReleaseNotes
      ? check("release-notes-draft", "ok", "V3 release notes draft/candidate exists.", false)
      : check("release-notes-draft", "warn", "No V3 release notes draft/candidate file found.", false),
  );

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
  const report = await evaluateV3ReleaseGate(args);
  console.log(`[v3-release-gate] status=${report.status} blockingFailures=${report.summary.blockingFailures} warnings=${report.summary.warnings}`);
  console.log(`[v3-release-gate] report: ${args.outJsonPath}`);
  console.log(`[v3-release-gate] summary: ${args.outMarkdownPath}`);
  for (const entry of report.checks) {
    const prefix = `[v3-release-gate][${entry.status}]`;
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
export { evaluateV3ReleaseGate, parseArgs };
