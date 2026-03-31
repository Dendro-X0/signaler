import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildReliabilityBenchmarkSignalsFromHealthReport,
  deriveIssueMappingFromIssuesJson,
  resolveReliabilityHealthSourcePath,
} from "../src/reliability-benchmark-signals.js";

type AdapterArgs = {
  readonly healthPath: string;
  readonly outPath: string;
  readonly issuesPath?: string;
  readonly defaultIssueId?: string;
  readonly collectedAt?: string;
  readonly minLatencyMs: number;
  readonly confidence: "high" | "medium" | "low";
  readonly includePassingRoutes: boolean;
  readonly json: boolean;
};

function parseNonNegativeInteger(value: string, flagName: string): number {
  const parsed: number = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${flagName}: expected integer >= 0.`);
  }
  return parsed;
}

function parseArgs(argv: readonly string[]): AdapterArgs {
  let healthPath: string | undefined;
  let outPath: string | undefined;
  let issuesPath: string | undefined;
  let defaultIssueId: string | undefined;
  let collectedAt: string | undefined;
  let minLatencyMs = 400;
  let confidence: "high" | "medium" | "low" = "high";
  let includePassingRoutes = false;
  let json = false;

  for (let index = 2; index < argv.length; index += 1) {
    const arg: string = argv[index] ?? "";
    if (arg === "--") {
      continue;
    }
    if ((arg === "--health" || arg === "--health-path") && index + 1 < argv.length) {
      healthPath = resolve(argv[index + 1] ?? "");
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
    if (arg === "--min-latency-ms" && index + 1 < argv.length) {
      minLatencyMs = parseNonNegativeInteger(argv[index + 1] ?? "", "--min-latency-ms");
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

  if (!healthPath) {
    throw new Error("Missing required --health <path>.");
  }
  if (!outPath) {
    throw new Error("Missing required --out <path>.");
  }

  return {
    healthPath,
    outPath,
    issuesPath,
    defaultIssueId,
    collectedAt,
    minLatencyMs,
    confidence,
    includePassingRoutes,
    json,
  };
}

function printUsage(): void {
  console.log(
    [
      "Usage:",
      "  pnpm exec tsx scripts/build-reliability-benchmark-fixture.ts --health .signaler/health.json --issues .signaler/issues.json --out .signaler/benchmark-reliability.json [flags]",
      "",
      "Flags:",
      "  --health <path>               Required health.json input",
      "  --out <path>                  Required output path for MultiBenchmarkSignalsFileV1 JSON",
      "  --issues <path>               Optional issues.json for route-level issueId mapping",
      "  --default-issue-id <id>       Fallback issueId when no route mapping exists",
      "  --collected-at <iso>          Override collectedAt timestamp (default health.meta.completedAt)",
      "  --min-latency-ms <n>          Minimum latency threshold to emit a record (default 400)",
      "  --confidence <level>          high|medium|low (default high)",
      "  --include-passing-routes      Emit records for healthy routes too",
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
  const healthRaw: unknown = await readJsonFile(args.healthPath);
  const issuesRaw: unknown = args.issuesPath !== undefined ? await readJsonFile(args.issuesPath) : undefined;
  const derivedMapping = deriveIssueMappingFromIssuesJson(issuesRaw);
  const fallbackIssueId: string | undefined = args.defaultIssueId ?? derivedMapping.defaultIssueId;
  const sourceRelPath: string = resolveReliabilityHealthSourcePath(args.healthPath);
  const fixture = buildReliabilityBenchmarkSignalsFromHealthReport({
    report: healthRaw,
    sourceRelPath,
    collectedAt: args.collectedAt,
    confidence: args.confidence,
    minLatencyMs: args.minLatencyMs,
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
        healthPath: args.healthPath,
        issuesPath: args.issuesPath ?? null,
        outPath: args.outPath,
        sourceId: "reliability-slo",
        records: generatedRecords,
        defaultIssueId: fallbackIssueId ?? null,
      }),
    );
    return;
  }

  console.log(`Wrote reliability benchmark fixture: ${args.outPath}`);
  console.log(`Source: ${args.healthPath}`);
  console.log(`Records: ${generatedRecords}`);
  console.log(`Issue mapping: ${args.issuesPath ? `${args.issuesPath} (+ fallback=${fallbackIssueId ?? "-"})` : fallbackIssueId ?? "-"}`);
}

void main(process.argv).catch((error: unknown) => {
  const message: string = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});
