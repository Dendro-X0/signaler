import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AxeSummary } from "../src/accessibility-types.js";
import {
  buildAccessibilityBenchmarkSignalsFromSummary,
  deriveIssueMappingFromIssuesJson,
  resolveAccessibilitySummarySourcePath,
} from "../src/accessibility-benchmark-signals.js";

type AdapterArgs = {
  readonly summaryPath: string;
  readonly outPath: string;
  readonly issuesPath?: string;
  readonly defaultIssueId?: string;
  readonly collectedAt?: string;
  readonly minViolationNodes: number;
  readonly confidence: "high" | "medium" | "low";
  readonly json: boolean;
};

function parsePositiveInteger(value: string, flagName: string): number {
  const parsed: number = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid ${flagName}: expected integer >= 1.`);
  }
  return parsed;
}

function parseArgs(argv: readonly string[]): AdapterArgs {
  let summaryPath: string | undefined;
  let outPath: string | undefined;
  let issuesPath: string | undefined;
  let defaultIssueId: string | undefined;
  let collectedAt: string | undefined;
  let minViolationNodes = 1;
  let confidence: "high" | "medium" | "low" = "high";
  let json = false;

  for (let index = 2; index < argv.length; index += 1) {
    const arg: string = argv[index] ?? "";
    if (arg === "--") {
      continue;
    }
    if ((arg === "--summary" || arg === "--summary-path") && index + 1 < argv.length) {
      summaryPath = resolve(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    if ((arg === "--out" || arg === "--output") && index + 1 < argv.length) {
      outPath = resolve(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (arg === "--issues" && index + 1 < argv.length) {
      issuesPath = resolve(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (arg === "--default-issue-id" && index + 1 < argv.length) {
      defaultIssueId = argv[index + 1] ?? undefined;
      index += 1;
      continue;
    }
    if (arg === "--collected-at" && index + 1 < argv.length) {
      collectedAt = argv[index + 1] ?? undefined;
      index += 1;
      continue;
    }
    if (arg === "--min-violation-nodes" && index + 1 < argv.length) {
      minViolationNodes = parsePositiveInteger(argv[index + 1] ?? "", "--min-violation-nodes");
      index += 1;
      continue;
    }
    if (arg === "--confidence" && index + 1 < argv.length) {
      const next = argv[index + 1];
      if (next !== "high" && next !== "medium" && next !== "low") {
        throw new Error("Invalid --confidence value: expected high|medium|low.");
      }
      confidence = next;
      index += 1;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  if (!summaryPath) {
    throw new Error("Missing required --summary <path>.");
  }
  if (!outPath) {
    throw new Error("Missing required --out <path>.");
  }

  return {
    summaryPath,
    outPath,
    issuesPath,
    defaultIssueId,
    collectedAt,
    minViolationNodes,
    confidence,
    json,
  };
}

function printUsage(): void {
  console.log(
    [
      "Usage:",
      "  pnpm exec tsx scripts/build-accessibility-benchmark-fixture.ts --summary .signaler/accessibility-summary.json --issues .signaler/issues.json --out .signaler/benchmark-accessibility.json [flags]",
      "",
      "Flags:",
      "  --summary <path>           Required accessibility-summary.json input",
      "  --out <path>               Required output path for MultiBenchmarkSignalsFileV1 JSON",
      "  --issues <path>            Optional issues.json for route-level issueId mapping",
      "  --default-issue-id <id>    Fallback issueId when no route mapping exists",
      "  --collected-at <iso>       Override collectedAt timestamp (default summary.meta.completedAt)",
      "  --min-violation-nodes <n>  Minimum weighted violations per route to emit a record (default 1)",
      "  --confidence <level>       high|medium|low (default high)",
      "  --json                     Print compact generation summary JSON",
    ].join("\n"),
  );
}

async function readJsonFile(path: string): Promise<unknown> {
  const raw: string = await readFile(path, "utf8");
  const normalized: string = raw.replace(/^\uFEFF/, "");
  return JSON.parse(normalized) as unknown;
}

async function main(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv);
  const summaryRaw: unknown = await readJsonFile(args.summaryPath);
  const issuesRaw: unknown = args.issuesPath !== undefined ? await readJsonFile(args.issuesPath) : undefined;
  const derivedMapping = deriveIssueMappingFromIssuesJson(issuesRaw);
  const fallbackIssueId: string | undefined = args.defaultIssueId ?? derivedMapping.defaultIssueId;
  const sourceRelPath: string = resolveAccessibilitySummarySourcePath(args.summaryPath);
  const fixture = buildAccessibilityBenchmarkSignalsFromSummary({
    summary: summaryRaw as AxeSummary,
    sourceRelPath,
    collectedAt: args.collectedAt,
    confidence: args.confidence,
    minViolationNodes: args.minViolationNodes,
    defaultIssueId: fallbackIssueId,
    routeIssueIdByPath: derivedMapping.routeIssueIdByPath,
  });

  await writeFile(args.outPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");

  const generatedRecords: number = fixture.sources[0]?.records.length ?? 0;
  if (args.json) {
    console.log(
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        summaryPath: args.summaryPath,
        issuesPath: args.issuesPath ?? null,
        outPath: args.outPath,
        sourceId: "accessibility-extended",
        records: generatedRecords,
        defaultIssueId: fallbackIssueId ?? null,
      }),
    );
    return;
  }

  console.log(`Wrote accessibility benchmark fixture: ${args.outPath}`);
  console.log(`Source: ${args.summaryPath}`);
  console.log(`Records: ${generatedRecords}`);
  console.log(`Issue mapping: ${args.issuesPath ? `${args.issuesPath} (+ fallback=${fallbackIssueId ?? "-"})` : fallbackIssueId ?? "-"}`);
}

void main(process.argv).catch((error: unknown) => {
  const message: string = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});
