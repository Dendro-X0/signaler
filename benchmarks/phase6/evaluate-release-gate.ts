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

type CrossPlatformSmokeEvidence = {
  readonly schemaVersion?: unknown;
  readonly generatedAt?: unknown;
  readonly os?: unknown;
  readonly smoke?: {
    readonly testSmokePassed?: unknown;
    readonly phase6SmokePassed?: unknown;
  };
};

function parseArgs(argv: readonly string[]): CliArgs {
  let outJsonPath = resolve("benchmarks/out/phase6-release-gate.json");
  let outMarkdownPath = resolve("benchmarks/out/phase6-release-gate.md");
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

async function readCrossPlatformEvidence(root: string, os: string): Promise<string | undefined> {
  const fileName = `cross-platform-smoke-${os}.json`;
  const candidatePaths = [
    resolve(root, "benchmarks/out", fileName),
    resolve(root, fileName),
    resolve(root, `cross-platform-smoke-${os}`, "benchmarks/out", fileName),
  ];
  for (const candidate of candidatePaths) {
    const raw = await readText(candidate);
    if (raw !== undefined) {
      return raw;
    }
  }
  return undefined;
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
  lines.push("# Phase 6 Release Gate");
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

function normalizeVersion(version: string): string {
  return version.replace(/\.0$/, "");
}

function containsCanonicalFlow(text: string): boolean {
  const compact = text.toLowerCase();
  if (compact.includes("discover -> run -> report")) return true;
  if (compact.includes("discover") && compact.includes("run") && compact.includes("report")) return true;
  return false;
}

function parseDogfoodCompletedCount(markdown: string): number {
  const lines = markdown.split(/\r?\n/);
  let completed = 0;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    const columns = line.split("|").map((value) => value.trim());
    if (columns.length < 7) continue;
    const first = (columns[1] ?? "").toLowerCase();
    const second = (columns[2] ?? "").toLowerCase();
    if (first === "repo" && second === "owner") continue;
    if ((columns[1] ?? "").replace(/-/g, "").length === 0) continue;
    const startDate = columns[3] ?? "";
    const endDate = columns[4] ?? "";
    const hasStart = /^\d{4}-\d{2}-\d{2}$/.test(startDate);
    const hasEnd = /^\d{4}-\d{2}-\d{2}$/.test(endDate);
    if (!hasStart || !hasEnd) continue;
    const durationDays = daysBetween(startDate, endDate);
    if (durationDays >= 14) completed += 1;
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
      if (daysBetween(entry.startDate, entry.endDate) >= 14) {
        completed += 1;
      }
    }
    return { ok: true, completed, total: entries.length };
  } catch {
    return { ok: false, completed: 0, total: 0, reason: "not valid JSON" };
  }
}

function validateCrossPlatformEvidence(rawFile: string, expectedOs: string): { readonly ok: boolean; readonly reason?: string } {
  try {
    const parsed = JSON.parse(rawFile) as CrossPlatformSmokeEvidence;
    if (parsed.schemaVersion !== 1) {
      return { ok: false, reason: "schemaVersion must be 1" };
    }
    if (typeof parsed.generatedAt !== "string" || parsed.generatedAt.trim().length === 0) {
      return { ok: false, reason: "generatedAt is missing" };
    }
    if (typeof parsed.os !== "string" || parsed.os.trim().length === 0) {
      return { ok: false, reason: "os is missing" };
    }
    if (parsed.os !== expectedOs) {
      return { ok: false, reason: `os mismatch (expected ${expectedOs}, received ${parsed.os})` };
    }
    if (typeof parsed.smoke !== "object" || parsed.smoke === null) {
      return { ok: false, reason: "smoke block is missing" };
    }
    if (parsed.smoke.testSmokePassed !== true || parsed.smoke.phase6SmokePassed !== true) {
      return { ok: false, reason: "smoke flags must both be true" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "not valid JSON" };
  }
}

async function evaluateReleaseGate(args: CliArgs): Promise<GateReport> {
  const checks: GateCheck[] = [];
  const root = args.rootDir;

  const requiredDocs = [
    "docs/operations/production-playbook.md",
    "docs/operations/launch-checklist.md",
    "docs/guides/known-limits.md",
    "docs/README.md",
    "docs/guides/getting-started.md",
    "docs/reference/cli.md",
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
      ? check("docs-existence", "ok", "Required Phase 6 docs are present.", true)
      : check("docs-existence", "error", `Missing docs: ${missingDocs.join(", ")}`, true),
  );

  const requiredBenchmarks = [
    "benchmarks/out/phase0-baseline.json",
    "benchmarks/out/phase0-baseline.md",
    "benchmarks/out/phase4-baseline.json",
    "benchmarks/out/phase4-baseline.md",
  ];
  const missingBenchmarkOutputs: string[] = [];
  for (const relPath of requiredBenchmarks) {
    if (!(await fileExists(resolve(root, relPath)))) {
      missingBenchmarkOutputs.push(relPath);
    }
  }
  checks.push(
    missingBenchmarkOutputs.length === 0
      ? check("benchmark-outputs", "ok", "Phase 0 and Phase 4 benchmark outputs are present.", true)
      : check("benchmark-outputs", "error", `Missing benchmark outputs: ${missingBenchmarkOutputs.join(", ")}`, true),
  );

  const templateFiles = [
    ".github/workflow-templates/signaler-audit-pnpm.yml",
    ".github/workflow-templates/signaler-audit-pnpm.properties.json",
    ".github/workflow-templates/signaler-audit-npm.yml",
    ".github/workflow-templates/signaler-audit-npm.properties.json",
    ".github/workflow-templates/signaler-audit-yarn.yml",
    ".github/workflow-templates/signaler-audit-yarn.properties.json",
  ];
  const missingTemplates: string[] = [];
  for (const relPath of templateFiles) {
    if (!(await fileExists(resolve(root, relPath)))) {
      missingTemplates.push(relPath);
    }
  }
  checks.push(
    missingTemplates.length === 0
      ? check("ci-templates", "ok", "GitHub workflow templates for pnpm/npm/yarn are present.", true)
      : check("ci-templates", "error", `Missing workflow template files: ${missingTemplates.join(", ")}`, true),
  );

  const packageJsonRaw = await readText(resolve(root, "package.json"));
  let version = "";
  if (packageJsonRaw !== undefined) {
    try {
      const parsed = JSON.parse(packageJsonRaw) as { readonly version?: string };
      version = parsed.version ?? "";
    } catch {
      version = "";
    }
  }
  const releaseNotesCandidates = version.length > 0
    ? [
        resolve(root, `docs/archive/release-notes/RELEASE-NOTES-v${version}.md`),
        resolve(root, `docs/archive/release-notes/RELEASE-NOTES-v${normalizeVersion(version)}.md`),
      ]
    : [];
  const hasReleaseNotes = releaseNotesCandidates.length > 0
    && (await fileExists(releaseNotesCandidates[0])
      || (releaseNotesCandidates[1] !== undefined && await fileExists(releaseNotesCandidates[1])));
  const hasReleaseNotesIndex = await fileExists(resolve(root, "docs/operations/release-notes.md"));
  const docsReadme = await readText(resolve(root, "docs/README.md"));
  const hasReleaseNotesLink = Boolean(
    docsReadme !== undefined
      && docsReadme.includes("(operations/release-notes.md)"),
  );
  checks.push(
    hasReleaseNotes && hasReleaseNotesIndex && hasReleaseNotesLink
      ? check("release-notes-continuity", "ok", `Release notes index + historical notes exist for package version ${version}.`, true)
      : check("release-notes-continuity", "error", `Release notes index, historical note file, or docs link missing for package version ${version || "(unknown)"}.`, true),
  );

  const hasMigrationLink = Boolean(
    docsReadme !== undefined
      && docsReadme.includes("(guides/migration.md)"),
  );
  checks.push(
    hasMigrationLink
      ? check("migration-guide-link", "ok", "docs/README.md links the canonical migration guide.", true)
      : check("migration-guide-link", "error", "docs/README.md is missing a link to guides/migration.md.", true),
  );

  const workflowDocs = [
    await readText(resolve(root, "README.md")),
    await readText(resolve(root, "docs/guides/getting-started.md")),
    await readText(resolve(root, "docs/reference/cli.md")),
  ].filter((value): value is string => value !== undefined);
  const canonicalFlowMatches = workflowDocs.filter((text) => containsCanonicalFlow(text)).length;
  checks.push(
    canonicalFlowMatches >= 2
      ? check("canonical-flow-docs", "ok", `Canonical flow found in ${canonicalFlowMatches} documentation files.`, true)
      : check("canonical-flow-docs", "error", "Canonical flow `discover -> run -> report` is not clearly documented across key docs.", true),
  );

  const ciWorkflow = await readText(resolve(root, ".github/workflows/ci.yml"));
  const hasCrossPlatformJob = ciWorkflow?.includes("cross-platform-smoke:") ?? false;
  const hasPhase6GateJob = ciWorkflow?.includes("phase6-release-gate:") ?? false;
  const hasOsMatrix = Boolean(
    ciWorkflow
      && ciWorkflow.includes("ubuntu-latest")
      && ciWorkflow.includes("windows-latest")
      && ciWorkflow.includes("macos-latest"),
  );
  checks.push(
    hasCrossPlatformJob && hasPhase6GateJob && hasOsMatrix
      ? check("ci-phase6-jobs", "ok", "CI includes cross-platform smoke and Phase 6 gate jobs.", true)
      : check("ci-phase6-jobs", "error", "CI is missing cross-platform smoke matrix and/or phase6-release-gate job.", true),
  );

  const upstreamResults = [
    { name: "test", result: process.env.PHASE6_NEED_TEST },
    { name: "quality", result: process.env.PHASE6_NEED_QUALITY },
    { name: "phase0-benchmark", result: process.env.PHASE6_NEED_PHASE0_BENCHMARK },
    { name: "cross-platform-smoke", result: process.env.PHASE6_NEED_CROSS_PLATFORM },
  ];
  const provided = upstreamResults.filter((entry) => entry.result !== undefined);
  const hasUpstreamContext = provided.length > 0;
  const failedUpstream = provided.filter((entry) => entry.result !== "success");
  if (provided.length === 0) {
    checks.push(check("upstream-required-jobs", "ok", "No upstream job status provided (local mode).", true));
  } else if (failedUpstream.length === 0) {
    checks.push(check("upstream-required-jobs", "ok", "Required upstream CI jobs succeeded.", true));
  } else {
    checks.push(
      check(
        "upstream-required-jobs",
        "warn",
        `Required upstream jobs not successful: ${failedUpstream.map((entry) => `${entry.name}=${entry.result}`).join(", ")}. Non-blocking here because those jobs already report failure directly.`,
        false,
      ),
    );
  }

  const expectedCrossPlatformOs = [
    "ubuntu-latest",
    "windows-latest",
    "macos-latest",
  ] as const;
  const missingCrossPlatformEvidence: string[] = [];
  const invalidCrossPlatformEvidence: string[] = [];
  for (const os of expectedCrossPlatformOs) {
    const raw = await readCrossPlatformEvidence(root, os);
    if (raw === undefined) {
      missingCrossPlatformEvidence.push(os);
      continue;
    }
    const validated = validateCrossPlatformEvidence(raw, os);
    if (!validated.ok) {
      invalidCrossPlatformEvidence.push(`${os}: ${validated.reason ?? "invalid evidence"}`);
    }
  }
  if (!hasUpstreamContext && missingCrossPlatformEvidence.length === expectedCrossPlatformOs.length) {
    checks.push(check("cross-platform-smoke-evidence", "ok", "Cross-platform smoke evidence not provided (local mode).", true));
  } else if (!hasUpstreamContext && missingCrossPlatformEvidence.length > 0) {
    checks.push(
      check(
        "cross-platform-smoke-evidence",
        "warn",
        `Partial cross-platform evidence in local mode. missing=${missingCrossPlatformEvidence.join(", ")}${invalidCrossPlatformEvidence.length > 0 ? `; invalid=${invalidCrossPlatformEvidence.join("; ")}` : ""}`,
        false,
      ),
    );
  } else if (!hasUpstreamContext && invalidCrossPlatformEvidence.length > 0) {
    checks.push(
      check(
        "cross-platform-smoke-evidence",
        "warn",
        `Cross-platform evidence invalid in local mode: ${invalidCrossPlatformEvidence.join("; ")}`,
        false,
      ),
    );
  } else if (missingCrossPlatformEvidence.length > 0 || invalidCrossPlatformEvidence.length > 0) {
    checks.push(
      check(
        "cross-platform-smoke-evidence",
        "error",
        `Cross-platform smoke evidence incomplete. missing=${missingCrossPlatformEvidence.join(", ") || "none"}${invalidCrossPlatformEvidence.length > 0 ? `; invalid=${invalidCrossPlatformEvidence.join("; ")}` : ""}`,
        true,
      ),
    );
  } else {
    checks.push(check("cross-platform-smoke-evidence", "ok", "Cross-platform smoke evidence present for ubuntu/windows/macos.", true));
  }

  const dogfoodJsonRaw = await readText(resolve(root, "release/v3/dogfood-evidence.json"));
  if (dogfoodJsonRaw !== undefined) {
    const parsedDogfood = countQualifiedDogfoodEntries(dogfoodJsonRaw);
    if (!parsedDogfood.ok) {
      checks.push(check("dogfood-evidence", "warn", `Dogfood evidence JSON is invalid (${parsedDogfood.reason ?? "unknown reason"}).`, false));
    } else if (parsedDogfood.completed >= 3) {
      checks.push(check("dogfood-evidence", "ok", `Dogfood evidence complete for ${parsedDogfood.completed} repos (>=14 days each).`, false));
    } else {
      checks.push(check("dogfood-evidence", "warn", `Dogfood evidence incomplete (${parsedDogfood.completed}/3 repos >=14 days; entries=${parsedDogfood.total}).`, false));
    }
  } else {
    const launchChecklist = await readText(resolve(root, "docs/operations/launch-checklist.md"));
    if (launchChecklist === undefined) {
      checks.push(check("dogfood-evidence", "warn", "Missing release/v3/dogfood-evidence.json and launch checklist fallback.", false));
    } else {
      const completed = parseDogfoodCompletedCount(launchChecklist);
      if (completed >= 3) {
        checks.push(check("dogfood-evidence", "ok", `Dogfood evidence complete for ${completed} repos (table fallback).`, false));
      } else {
        checks.push(check("dogfood-evidence", "warn", `Dogfood evidence incomplete (${completed}/3 repos completed, table fallback).`, false));
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
  const report = await evaluateReleaseGate(args);
  console.log(`[phase6-gate] status=${report.status} blockingFailures=${report.summary.blockingFailures} warnings=${report.summary.warnings}`);
  console.log(`[phase6-gate] report: ${args.outJsonPath}`);
  console.log(`[phase6-gate] summary: ${args.outMarkdownPath}`);
  for (const entry of report.checks) {
    const prefix = `[phase6-gate][${entry.status}]`;
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
export { evaluateReleaseGate, parseArgs };
