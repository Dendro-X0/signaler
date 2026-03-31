import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildSeoBenchmarkSignalsFromArtifacts,
  deriveIssueMappingFromIssuesJson,
  resolveSeoLinksSourcePath,
  resolveSeoResultsSourcePath,
} from "../src/seo-benchmark-signals.js";

type AdapterArgs = {
  readonly resultsPath: string;
  readonly linksPath?: string;
  readonly outPath: string;
  readonly issuesPath?: string;
  readonly defaultIssueId?: string;
  readonly collectedAt?: string;
  readonly minIssueCount: number;
  readonly confidence: "high" | "medium" | "low";
  readonly includePassingRoutes: boolean;
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
  let resultsPath: string | undefined;
  let linksPath: string | undefined;
  let outPath: string | undefined;
  let issuesPath: string | undefined;
  let defaultIssueId: string | undefined;
  let collectedAt: string | undefined;
  let minIssueCount = 1;
  let confidence: "high" | "medium" | "low" = "high";
  let includePassingRoutes = false;
  let json = false;

  for (let index = 2; index < argv.length; index += 1) {
    const arg: string = argv[index] ?? "";
    if (arg === "--") {
      continue;
    }
    if ((arg === "--results" || arg === "--results-path") && index + 1 < argv.length) {
      resultsPath = resolve(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    if ((arg === "--links" || arg === "--links-path") && index + 1 < argv.length) {
      linksPath = resolve(argv[index + 1] ?? "");
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
    if (arg === "--min-issue-count" && index + 1 < argv.length) {
      minIssueCount = parsePositiveInteger(argv[index + 1] ?? "", "--min-issue-count");
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

  if (!resultsPath) {
    throw new Error("Missing required --results <path>.");
  }
  if (!outPath) {
    throw new Error("Missing required --out <path>.");
  }

  return {
    resultsPath,
    linksPath,
    outPath,
    issuesPath,
    defaultIssueId,
    collectedAt,
    minIssueCount,
    confidence,
    includePassingRoutes,
    json,
  };
}

function printUsage(): void {
  console.log(
    [
      "Usage:",
      "  pnpm exec tsx scripts/build-seo-benchmark-fixture.ts --results .signaler/results.json --links .signaler/links.json --issues .signaler/issues.json --out .signaler/benchmark-seo.json [flags]",
      "",
      "Flags:",
      "  --results <path>              Required results.json input",
      "  --links <path>                Optional links.json input for crawlability augmentation",
      "  --out <path>                  Required output path for MultiBenchmarkSignalsFileV1 JSON",
      "  --issues <path>               Optional issues.json for route-level issueId mapping",
      "  --default-issue-id <id>       Fallback issueId when no route mapping exists",
      "  --collected-at <iso>          Override collectedAt timestamp",
      "  --min-issue-count <n>         Minimum SEO issue count to emit a record (default 1)",
      "  --confidence <level>          high|medium|low (default high)",
      "  --include-passing-routes      Emit records even when no SEO issues are detected",
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
  const resultsRaw: unknown = await readJsonFile(args.resultsPath);
  const linksRaw: unknown = args.linksPath !== undefined ? await readJsonFile(args.linksPath) : undefined;
  const issuesRaw: unknown = args.issuesPath !== undefined ? await readJsonFile(args.issuesPath) : undefined;

  const derivedMapping = deriveIssueMappingFromIssuesJson(issuesRaw);
  const fallbackIssueId: string | undefined = args.defaultIssueId ?? derivedMapping.defaultIssueId;
  const resultsSourceRelPath: string = resolveSeoResultsSourcePath(args.resultsPath);
  const linksSourceRelPath: string | undefined = args.linksPath !== undefined ? resolveSeoLinksSourcePath(args.linksPath) : undefined;

  const fixture = buildSeoBenchmarkSignalsFromArtifacts({
    resultsReport: resultsRaw,
    linksReport: linksRaw,
    sourceRelPath: resultsSourceRelPath,
    linksSourceRelPath,
    collectedAt: args.collectedAt,
    confidence: args.confidence,
    minIssueCount: args.minIssueCount,
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
        resultsPath: args.resultsPath,
        linksPath: args.linksPath ?? null,
        issuesPath: args.issuesPath ?? null,
        outPath: args.outPath,
        sourceId: "seo-technical",
        records: generatedRecords,
        defaultIssueId: fallbackIssueId ?? null,
      }),
    );
    return;
  }

  console.log(`Wrote SEO benchmark fixture: ${args.outPath}`);
  console.log(`Source: ${args.resultsPath}`);
  if (args.linksPath) {
    console.log(`Links source: ${args.linksPath}`);
  }
  console.log(`Records: ${generatedRecords}`);
  console.log(`Issue mapping: ${args.issuesPath ? `${args.issuesPath} (+ fallback=${fallbackIssueId ?? "-"})` : fallbackIssueId ?? "-"}`);
}

void main(process.argv).catch((error: unknown) => {
  const message: string = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});

