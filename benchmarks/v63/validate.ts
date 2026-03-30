import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const checkSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ok", "warn", "error"]),
  details: z.string().min(1),
  blocking: z.boolean(),
});

const reportSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  status: z.enum(["ok", "warn", "error"]),
  checks: z.array(checkSchema),
  summary: z.object({
    blockingFailures: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
    manualItems: z.number().int().nonnegative(),
  }),
});

type V63SuccessGateReport = z.infer<typeof reportSchema>;

export type V63SuccessGateValidationResult =
  | { readonly ok: true; readonly value: V63SuccessGateReport }
  | { readonly ok: false; readonly errors: readonly string[] };

function formatIssues(issues: readonly z.ZodIssue[]): readonly string[] {
  return issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}

function validateSummary(report: V63SuccessGateReport): readonly string[] {
  const expectedBlocking = report.checks.filter((item) => item.blocking && item.status === "error").length;
  const expectedWarnings = report.checks.filter((item) => item.status === "warn").length;
  const expectedManualItems = report.checks.filter((item) => !item.blocking).length;
  const errors: string[] = [];
  if (report.summary.blockingFailures !== expectedBlocking) {
    errors.push(`summary.blockingFailures mismatch: expected ${expectedBlocking}, received ${report.summary.blockingFailures}`);
  }
  if (report.summary.warnings !== expectedWarnings) {
    errors.push(`summary.warnings mismatch: expected ${expectedWarnings}, received ${report.summary.warnings}`);
  }
  if (report.summary.manualItems !== expectedManualItems) {
    errors.push(`summary.manualItems mismatch: expected ${expectedManualItems}, received ${report.summary.manualItems}`);
  }
  const expectedStatus = expectedBlocking > 0 ? "error" : expectedWarnings > 0 ? "warn" : "ok";
  if (report.status !== expectedStatus) {
    errors.push(`status mismatch: expected ${expectedStatus}, received ${report.status}`);
  }
  return errors;
}

export async function validateV63SuccessGateReportFile(pathToReport: string): Promise<V63SuccessGateValidationResult> {
  try {
    const raw = await readFile(resolve(pathToReport), "utf8");
    const parsedUnknown = JSON.parse(raw) as unknown;
    const parsed = reportSchema.safeParse(parsedUnknown);
    if (!parsed.success) {
      return { ok: false, errors: formatIssues(parsed.error.issues) };
    }
    const summaryErrors = validateSummary(parsed.data);
    if (summaryErrors.length > 0) {
      return { ok: false, errors: summaryErrors };
    }
    return { ok: true, value: parsed.data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [`read/parse failure: ${message}`] };
  }
}

async function main(): Promise<void> {
  const reportPath = process.argv[2] ?? "benchmarks/out/v63-success-gate.json";
  const schemaPath = resolve("benchmarks/v63/report.schema.json");
  await readFile(schemaPath, "utf8");
  const result = await validateV63SuccessGateReportFile(reportPath);
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`V6.3 success gate report is valid: ${resolve(reportPath)}`);
}

const SCRIPT_PATH = fileURLToPath(import.meta.url);

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  void main();
}
