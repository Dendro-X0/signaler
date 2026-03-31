import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildSecurityBenchmarkSignalsFromHeadersReport,
  deriveIssueMappingFromIssuesJson,
  resolveSecurityHeadersSourcePath,
} from "../src/security-benchmark-signals.js";

type AdapterArgs = {
  readonly headersPath: string;
  readonly outPath: string;
  readonly issuesPath?: string;
  readonly defaultIssueId?: string;
  readonly collectedAt?: string;
  readonly minMissingHeaders: number;
  readonly confidence: "high" | "medium" | "low";
  readonly includeRuntimeErrors: boolean;
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
  let headersPath: string | undefined;
  let outPath: string | undefined;
  let issuesPath: string | undefined;
  let defaultIssueId: string | undefined;
  let collectedAt: string | undefined;
  let minMissingHeaders = 1;
  let confidence: "high" | "medium" | "low" = "high";
  let includeRuntimeErrors = true;
  let json = false;

  for (let index = 2; index < argv.length; index += 1) {
    const arg: string = argv[index] ?? "";
    if (arg === "--") {
      continue;
    }
    if ((arg === "--headers" || arg === "--headers-path") && index + 1 < argv.length) {
      headersPath = resolve(argv[index + 1] ?? "");
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
    if (arg === "--min-missing-headers" && index + 1 < argv.length) {
      minMissingHeaders = parsePositiveInteger(argv[index + 1] ?? "", "--min-missing-headers");
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
    if (arg === "--exclude-runtime-errors") {
      includeRuntimeErrors = false;
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

  if (!headersPath) {
    throw new Error("Missing required --headers <path>.");
  }
  if (!outPath) {
    throw new Error("Missing required --out <path>.");
  }

  return {
    headersPath,
    outPath,
    issuesPath,
    defaultIssueId,
    collectedAt,
    minMissingHeaders,
    confidence,
    includeRuntimeErrors,
    json,
  };
}

function printUsage(): void {
  console.log(
    [
      "Usage:",
      "  pnpm exec tsx scripts/build-security-benchmark-fixture.ts --headers .signaler/headers.json --issues .signaler/issues.json --out .signaler/benchmark-security.json [flags]",
      "",
      "Flags:",
      "  --headers <path>             Required headers.json input",
      "  --out <path>                 Required output path for MultiBenchmarkSignalsFileV1 JSON",
      "  --issues <path>              Optional issues.json for route-level issueId mapping",
      "  --default-issue-id <id>      Fallback issueId when no route mapping exists",
      "  --collected-at <iso>         Override collectedAt timestamp (default headers.meta.completedAt)",
      "  --min-missing-headers <n>    Minimum missing headers per route to emit a record (default 1)",
      "  --confidence <level>         high|medium|low (default high)",
      "  --exclude-runtime-errors     Skip runtime error rows",
      "  --json                       Print compact generation summary JSON",
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
  const headersRaw: unknown = await readJsonFile(args.headersPath);
  const issuesRaw: unknown = args.issuesPath !== undefined ? await readJsonFile(args.issuesPath) : undefined;
  const derivedMapping = deriveIssueMappingFromIssuesJson(issuesRaw);
  const fallbackIssueId: string | undefined = args.defaultIssueId ?? derivedMapping.defaultIssueId;
  const sourceRelPath: string = resolveSecurityHeadersSourcePath(args.headersPath);
  const fixture = buildSecurityBenchmarkSignalsFromHeadersReport({
    report: headersRaw,
    sourceRelPath,
    collectedAt: args.collectedAt,
    confidence: args.confidence,
    minMissingHeaders: args.minMissingHeaders,
    includeRuntimeErrors: args.includeRuntimeErrors,
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
        headersPath: args.headersPath,
        issuesPath: args.issuesPath ?? null,
        outPath: args.outPath,
        sourceId: "security-baseline",
        records: generatedRecords,
        defaultIssueId: fallbackIssueId ?? null,
      }),
    );
    return;
  }

  console.log(`Wrote security benchmark fixture: ${args.outPath}`);
  console.log(`Source: ${args.headersPath}`);
  console.log(`Records: ${generatedRecords}`);
  console.log(`Issue mapping: ${args.issuesPath ? `${args.issuesPath} (+ fallback=${fallbackIssueId ?? "-"})` : fallbackIssueId ?? "-"}`);
}

void main(process.argv).catch((error: unknown) => {
  const message: string = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});

