import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildCrossBrowserBenchmarkSignalsFromSnapshots,
  deriveIssueMappingFromIssuesJson,
  resolveCrossBrowserSnapshotsSourcePath,
} from "../src/cross-browser-benchmark-signals.js";

type AdapterArgs = {
  readonly snapshotsPath: string;
  readonly outPath: string;
  readonly issuesPath?: string;
  readonly defaultIssueId?: string;
  readonly collectedAt?: string;
  readonly minScoreVariancePct: number;
  readonly minLcpDeltaMs: number;
  readonly minClsDelta: number;
  readonly confidence: "high" | "medium" | "low";
  readonly includePassingRoutes: boolean;
  readonly json: boolean;
};

function parseNonNegativeNumber(value: string, flagName: string): number {
  const parsed: number = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${flagName}: expected number >= 0.`);
  }
  return parsed;
}

function parseArgs(argv: readonly string[]): AdapterArgs {
  let snapshotsPath: string | undefined;
  let outPath: string | undefined;
  let issuesPath: string | undefined;
  let defaultIssueId: string | undefined;
  let collectedAt: string | undefined;
  let minScoreVariancePct = 5;
  let minLcpDeltaMs = 250;
  let minClsDelta = 0.05;
  let confidence: "high" | "medium" | "low" = "high";
  let includePassingRoutes = false;
  let json = false;

  for (let index = 2; index < argv.length; index += 1) {
    const arg: string = argv[index] ?? "";
    if (arg === "--") {
      continue;
    }
    if ((arg === "--snapshots" || arg === "--snapshot-report") && index + 1 < argv.length) {
      snapshotsPath = resolve(argv[index + 1] ?? "");
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
    if (arg === "--min-score-variance-pct" && index + 1 < argv.length) {
      minScoreVariancePct = parseNonNegativeNumber(argv[index + 1] ?? "", "--min-score-variance-pct");
      index += 1;
      continue;
    }
    if (arg === "--min-lcp-delta-ms" && index + 1 < argv.length) {
      minLcpDeltaMs = parseNonNegativeNumber(argv[index + 1] ?? "", "--min-lcp-delta-ms");
      index += 1;
      continue;
    }
    if (arg === "--min-cls-delta" && index + 1 < argv.length) {
      minClsDelta = parseNonNegativeNumber(argv[index + 1] ?? "", "--min-cls-delta");
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
    if (arg === "--include-passing-routes") {
      includePassingRoutes = true;
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

  if (!snapshotsPath) {
    throw new Error("Missing required --snapshots <path>.");
  }
  if (!outPath) {
    throw new Error("Missing required --out <path>.");
  }

  return {
    snapshotsPath,
    outPath,
    issuesPath,
    defaultIssueId,
    collectedAt,
    minScoreVariancePct,
    minLcpDeltaMs,
    minClsDelta,
    confidence,
    includePassingRoutes,
    json,
  };
}

function printUsage(): void {
  console.log(
    [
      "Usage:",
      "  pnpm exec tsx scripts/build-cross-browser-benchmark-fixture.ts --snapshots .signaler/cross-browser-snapshots.json --issues .signaler/issues.json --out .signaler/benchmark-cross-browser.json [flags]",
      "",
      "Flags:",
      "  --snapshots <path>            Required cross-browser snapshot report JSON",
      "  --out <path>                  Required output path for MultiBenchmarkSignalsFileV1 JSON",
      "  --issues <path>               Optional issues.json for route-level issueId mapping",
      "  --default-issue-id <id>       Fallback issueId when no route mapping exists",
      "  --collected-at <iso>          Override collectedAt timestamp",
      "  --min-score-variance-pct <n>  Minimum score variance threshold (default 5)",
      "  --min-lcp-delta-ms <n>        Minimum LCP delta threshold (default 250)",
      "  --min-cls-delta <n>           Minimum CLS delta threshold (default 0.05)",
      "  --confidence <level>          high|medium|low (default high)",
      "  --include-passing-routes      Emit records even when parity deltas are below thresholds",
      "  --json                        Print compact generation summary JSON",
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
  const snapshotsRaw: unknown = await readJsonFile(args.snapshotsPath);
  const issuesRaw: unknown = args.issuesPath !== undefined ? await readJsonFile(args.issuesPath) : undefined;

  const derivedMapping = deriveIssueMappingFromIssuesJson(issuesRaw);
  const fallbackIssueId: string | undefined = args.defaultIssueId ?? derivedMapping.defaultIssueId;
  const sourceRelPath: string = resolveCrossBrowserSnapshotsSourcePath(args.snapshotsPath);
  const fixture = buildCrossBrowserBenchmarkSignalsFromSnapshots({
    report: snapshotsRaw,
    sourceRelPath,
    collectedAt: args.collectedAt,
    confidence: args.confidence,
    minScoreVariancePct: args.minScoreVariancePct,
    minLcpDeltaMs: args.minLcpDeltaMs,
    minClsDelta: args.minClsDelta,
    includePassingRoutes: args.includePassingRoutes,
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
        snapshotsPath: args.snapshotsPath,
        issuesPath: args.issuesPath ?? null,
        outPath: args.outPath,
        sourceId: "cross-browser-parity",
        records: generatedRecords,
        defaultIssueId: fallbackIssueId ?? null,
      }),
    );
    return;
  }

  console.log(`Wrote cross-browser benchmark fixture: ${args.outPath}`);
  console.log(`Source: ${args.snapshotsPath}`);
  console.log(`Records: ${generatedRecords}`);
  console.log(`Issue mapping: ${args.issuesPath ? `${args.issuesPath} (+ fallback=${fallbackIssueId ?? "-"})` : fallbackIssueId ?? "-"}`);
}

void main(process.argv).catch((error: unknown) => {
  const message: string = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});
