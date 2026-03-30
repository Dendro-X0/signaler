import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { Phase0BaselineReport } from "./types.js";

const runnerStabilitySchema = z.object({
  totalAttempts: z.number().int().nonnegative(),
  totalFailures: z.number().int().nonnegative(),
  totalRetries: z.number().int().nonnegative(),
  reductions: z.number().int().nonnegative(),
  cooldownPauses: z.number().int().nonnegative(),
  initialParallel: z.number().int().nonnegative(),
  finalParallel: z.number().int().nonnegative(),
  failureRate: z.number().nonnegative().optional(),
  retryRate: z.number().nonnegative().optional(),
  maxConsecutiveRetries: z.number().int().nonnegative().optional(),
  cooldownMsTotal: z.number().nonnegative().optional(),
  recoveryIncreases: z.number().int().nonnegative().optional(),
  status: z.enum(["stable", "degraded", "unstable"]).optional(),
});

const reportEntrySchema = z.object({
  environment: z.enum(["ci-linux", "local-6c12t"]),
  profileId: z.string().min(1),
  runMode: z.enum(["throughput", "fidelity"]),
  toolchain: z.object({
    nodeVersion: z.string().min(1),
    rustVersion: z.string().min(1).optional(),
  }),
  metrics: z.object({
    elapsedMs: z.number().nonnegative(),
    avgStepMs: z.number().nonnegative(),
    comboCount: z.number().int().nonnegative(),
    resolvedParallel: z.number().int().nonnegative(),
    runnerStability: runnerStabilitySchema.optional(),
  }),
  discovery: z.object({
    detected: z.number().int().nonnegative(),
    selected: z.number().int().nonnegative(),
    excludedDynamic: z.number().int().nonnegative(),
    excludedByFilter: z.number().int().nonnegative(),
    excludedByScope: z.number().int().nonnegative(),
  }).optional(),
  artifactSizes: z.object({
    runJsonBytes: z.number().int().nonnegative(),
    summaryJsonBytes: z.number().int().nonnegative(),
    resultsJsonBytes: z.number().int().nonnegative().optional(),
    suggestionsJsonBytes: z.number().int().nonnegative().optional(),
  }),
  status: z.enum(["ok", "warn", "error"]),
  notes: z.array(z.string()).optional(),
  rustProbe: z.object({
    enabled: z.boolean(),
    status: z.enum(["ok", "skipped", "error"]),
    elapsedMs: z.number().nonnegative().optional(),
    outputPath: z.string().min(1).optional(),
    message: z.string().optional(),
  }).optional(),
});

const phase0ReportSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  entries: z.array(reportEntrySchema).min(1),
  summary: z.object({
    total: z.number().int().nonnegative(),
    ok: z.number().int().nonnegative(),
    warn: z.number().int().nonnegative(),
    error: z.number().int().nonnegative(),
  }),
});

export type Phase0ValidationResult =
  | { readonly ok: true; readonly value: Phase0BaselineReport }
  | { readonly ok: false; readonly errors: readonly string[] };

function formatIssues(issues: readonly z.ZodIssue[]): readonly string[] {
  return issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}

function assertSummaryCounts(report: Phase0BaselineReport): readonly string[] {
  const expected = {
    total: report.entries.length,
    ok: report.entries.filter((entry) => entry.status === "ok").length,
    warn: report.entries.filter((entry) => entry.status === "warn").length,
    error: report.entries.filter((entry) => entry.status === "error").length,
  };
  const errors: string[] = [];
  if (report.summary.total !== expected.total) {
    errors.push(`summary.total mismatch: expected ${expected.total}, received ${report.summary.total}`);
  }
  if (report.summary.ok !== expected.ok) {
    errors.push(`summary.ok mismatch: expected ${expected.ok}, received ${report.summary.ok}`);
  }
  if (report.summary.warn !== expected.warn) {
    errors.push(`summary.warn mismatch: expected ${expected.warn}, received ${report.summary.warn}`);
  }
  if (report.summary.error !== expected.error) {
    errors.push(`summary.error mismatch: expected ${expected.error}, received ${report.summary.error}`);
  }
  return errors;
}

export async function validatePhase0ReportFile(pathToReport: string): Promise<Phase0ValidationResult> {
  const absolutePath = resolve(pathToReport);
  const raw = await readFile(absolutePath, "utf8");
  const parsedUnknown = JSON.parse(raw) as unknown;
  const parsed = phase0ReportSchema.safeParse(parsedUnknown);
  if (!parsed.success) {
    return { ok: false, errors: formatIssues(parsed.error.issues) };
  }
  const summaryErrors = assertSummaryCounts(parsed.data as Phase0BaselineReport);
  if (summaryErrors.length > 0) {
    return { ok: false, errors: summaryErrors };
  }
  return { ok: true, value: parsed.data as Phase0BaselineReport };
}

async function main(): Promise<void> {
  const reportPath = process.argv[2] ?? "benchmarks/out/phase0-baseline.json";
  const schemaPath = resolve("benchmarks/phase0/report.schema.json");
  await readFile(schemaPath, "utf8");
  const validation = await validatePhase0ReportFile(reportPath);
  if (!validation.ok) {
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Phase 0 baseline report is valid: ${resolve(reportPath)}`);
}

const SCRIPT_PATH = fileURLToPath(import.meta.url);

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  void main();
}
