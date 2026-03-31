import { relative, resolve } from "node:path";
import type { MultiBenchmarkSignalsFileV1, SeoTechnicalMetricsV1 } from "./contracts/multi-benchmark-v1.js";

type ResultsReportLike = {
  readonly generatedAt?: unknown;
  readonly meta?: {
    readonly completedAt?: unknown;
  };
  readonly results?: readonly {
    readonly path?: unknown;
    readonly url?: unknown;
    readonly device?: unknown;
    readonly failedAudits?: unknown;
    readonly runtimeErrorMessage?: unknown;
  }[];
};

type LinksReportLike = {
  readonly results?: readonly {
    readonly url?: unknown;
    readonly statusCode?: unknown;
    readonly runtimeErrorMessage?: unknown;
  }[];
};

export type SeoBenchmarkIssueMapping = {
  readonly defaultIssueId?: string;
  readonly routeIssueIdByPath: Readonly<Record<string, string>>;
};

export type BuildSeoBenchmarkSignalsParams = {
  readonly resultsReport: unknown;
  readonly linksReport?: unknown;
  readonly sourceRelPath: string;
  readonly linksSourceRelPath?: string;
  readonly collectedAt?: string;
  readonly confidence?: "high" | "medium" | "low";
  readonly defaultIssueId?: string;
  readonly routeIssueIdByPath?: Readonly<Record<string, string>>;
  readonly minIssueCount?: number;
  readonly includePassingRoutes?: boolean;
};

type SeoEvidence = {
  readonly sourceRelPath: string;
  readonly pointer: string;
  readonly artifactRelPath?: string;
};

const INDEXABILITY_AUDIT_IDS: ReadonlySet<string> = new Set([
  "is-crawlable",
  "robots-txt",
  "document-title",
  "meta-description",
  "canonical",
  "hreflang",
  "structured-data",
]);

const CRAWLABILITY_AUDIT_IDS: ReadonlySet<string> = new Set([
  "is-crawlable",
  "crawlable-anchors",
  "robots-txt",
  "http-status-code",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function normalizeIssueId(value: string): string {
  return value.trim();
}

function assertIsoTimestamp(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid ${fieldName}: expected ISO timestamp.`);
  }
}

function toRelativeSourcePath(sourcePath: string): string {
  const resolvedSource: string = resolve(sourcePath);
  const rel: string = normalizePath(relative(process.cwd(), resolvedSource));
  if (rel.length === 0) return normalizePath(sourcePath);
  if (!rel.startsWith("..")) return rel;
  return normalizePath(sourcePath);
}

function normalizeRoutePathFromUrl(url: string): string | undefined {
  try {
    const pathname: string = new URL(url).pathname;
    if (!pathname || pathname.length === 0) return "/";
    return pathname;
  } catch {
    return undefined;
  }
}

function buildRecordId(pathname: string, device: "mobile" | "desktop", index: number): string {
  const normalizedPath: string = pathname
    .replace(/^\//, "")
    .replace(/\/+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();
  const safePath: string = normalizedPath.length > 0 ? normalizedPath : "root";
  return `seo-${safePath}-${device}-${index + 1}`;
}

function parseFailedAudits(value: unknown): readonly { readonly id: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const audits: { id: string }[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isNonEmptyString(item.id)) {
      continue;
    }
    audits.push({ id: item.id.trim().toLowerCase() });
  }
  return audits;
}

function assertResultsReport(value: unknown): Required<Pick<ResultsReportLike, "results">> & Pick<ResultsReportLike, "generatedAt" | "meta"> {
  if (!isRecord(value)) {
    throw new Error("Invalid results report: expected object.");
  }
  if (!Array.isArray(value.results)) {
    throw new Error("Invalid results report: results must be an array.");
  }
  if (value.generatedAt !== undefined && !isNonEmptyString(value.generatedAt)) {
    throw new Error("Invalid results report: generatedAt must be a string.");
  }
  if (value.meta !== undefined && !isRecord(value.meta)) {
    throw new Error("Invalid results report: meta must be an object.");
  }
  if (isRecord(value.meta) && value.meta.completedAt !== undefined && !isNonEmptyString(value.meta.completedAt)) {
    throw new Error("Invalid results report: meta.completedAt must be a string when provided.");
  }

  for (const row of value.results) {
    if (!isRecord(row)) {
      throw new Error("Invalid results report row: expected object.");
    }
    if (!isNonEmptyString(row.path)) {
      throw new Error("Invalid results report row.path.");
    }
    if (!isNonEmptyString(row.url)) {
      throw new Error("Invalid results report row.url.");
    }
    if (row.device !== "mobile" && row.device !== "desktop") {
      throw new Error("Invalid results report row.device.");
    }
    if (row.runtimeErrorMessage !== undefined && typeof row.runtimeErrorMessage !== "string") {
      throw new Error("Invalid results report row.runtimeErrorMessage.");
    }
    parseFailedAudits(row.failedAudits);
  }
  return value as Required<Pick<ResultsReportLike, "results">> & Pick<ResultsReportLike, "generatedAt" | "meta">;
}

function parseLinksReport(value: unknown): LinksReportLike | undefined {
  if (!isRecord(value)) return undefined;
  if (!Array.isArray(value.results)) {
    throw new Error("Invalid links report: results must be an array.");
  }
  for (const row of value.results) {
    if (!isRecord(row)) {
      throw new Error("Invalid links report row: expected object.");
    }
    if (!isNonEmptyString(row.url)) {
      throw new Error("Invalid links report row.url.");
    }
    if (row.statusCode !== undefined && (typeof row.statusCode !== "number" || !Number.isFinite(row.statusCode) || row.statusCode < 0)) {
      throw new Error("Invalid links report row.statusCode.");
    }
    if (row.runtimeErrorMessage !== undefined && typeof row.runtimeErrorMessage !== "string") {
      throw new Error("Invalid links report row.runtimeErrorMessage.");
    }
  }
  return value as LinksReportLike;
}

function buildBrokenLinkCountsByPath(linksReport: LinksReportLike | undefined): ReadonlyMap<string, number> {
  if (!linksReport || !Array.isArray(linksReport.results)) {
    return new Map<string, number>();
  }
  const counts = new Map<string, number>();
  for (const row of linksReport.results) {
    if (!isRecord(row) || !isNonEmptyString(row.url)) {
      continue;
    }
    const routePath: string | undefined = normalizeRoutePathFromUrl(row.url);
    if (!routePath) continue;
    const hasRuntimeError: boolean = typeof row.runtimeErrorMessage === "string" && row.runtimeErrorMessage.length > 0;
    const statusCode: number | undefined = typeof row.statusCode === "number" ? row.statusCode : undefined;
    const isBrokenStatus: boolean = typeof statusCode === "number" && statusCode >= 400;
    if (!hasRuntimeError && !isBrokenStatus) {
      continue;
    }
    counts.set(routePath, (counts.get(routePath) ?? 0) + 1);
  }
  return counts;
}

function deriveMetrics(params: {
  readonly failedAudits: readonly { readonly id: string }[];
  readonly runtimeErrorMessage?: string;
  readonly brokenLinkCount: number;
}): SeoTechnicalMetricsV1 {
  let indexabilityIssueCount = 0;
  let canonicalMismatchCount = 0;
  let structuredDataErrorCount = 0;
  let crawlabilityIssueCount = params.brokenLinkCount;

  for (const audit of params.failedAudits) {
    if (INDEXABILITY_AUDIT_IDS.has(audit.id)) {
      indexabilityIssueCount += 1;
    }
    if (audit.id.includes("canonical")) {
      canonicalMismatchCount += 1;
    }
    if (audit.id.includes("structured-data")) {
      structuredDataErrorCount += 1;
    }
    if (CRAWLABILITY_AUDIT_IDS.has(audit.id)) {
      crawlabilityIssueCount += 1;
    }
  }

  if (typeof params.runtimeErrorMessage === "string" && params.runtimeErrorMessage.length > 0) {
    crawlabilityIssueCount += 1;
    indexabilityIssueCount += 1;
  }

  return {
    ...(indexabilityIssueCount > 0 ? { indexabilityIssueCount } : {}),
    ...(canonicalMismatchCount > 0 ? { canonicalMismatchCount } : {}),
    ...(structuredDataErrorCount > 0 ? { structuredDataErrorCount } : {}),
    ...(crawlabilityIssueCount > 0 ? { crawlabilityIssueCount } : {}),
  };
}

function totalIssueCount(metrics: SeoTechnicalMetricsV1): number {
  return (metrics.indexabilityIssueCount ?? 0)
    + (metrics.canonicalMismatchCount ?? 0)
    + (metrics.structuredDataErrorCount ?? 0)
    + (metrics.crawlabilityIssueCount ?? 0);
}

function buildEvidence(params: {
  readonly resultsSourceRelPath: string;
  readonly rowIndex: number;
  readonly linksSourceRelPath?: string;
  readonly hasLinkContribution: boolean;
}): readonly SeoEvidence[] {
  const rows: SeoEvidence[] = [
    {
      sourceRelPath: params.resultsSourceRelPath,
      pointer: `/results/${params.rowIndex}`,
      artifactRelPath: "results.json",
    },
  ];
  if (params.hasLinkContribution && params.linksSourceRelPath) {
    rows.push({
      sourceRelPath: params.linksSourceRelPath,
      pointer: "/results/*",
      artifactRelPath: "links.json",
    });
  }
  return rows;
}

export function deriveIssueMappingFromIssuesJson(raw: unknown): SeoBenchmarkIssueMapping {
  if (!isRecord(raw)) {
    return { routeIssueIdByPath: {} };
  }
  const routeIssueIdByPath: Record<string, string> = {};
  const failing: unknown = raw.failing;
  if (Array.isArray(failing)) {
    for (const row of failing) {
      if (!isRecord(row) || !isNonEmptyString(row.path) || !Array.isArray(row.topOpportunities)) {
        continue;
      }
      const top = row.topOpportunities.find((opportunity) => isRecord(opportunity) && isNonEmptyString(opportunity.id));
      if (!top || !isRecord(top) || !isNonEmptyString(top.id)) {
        continue;
      }
      routeIssueIdByPath[row.path] = normalizeIssueId(top.id);
    }
  }
  const topIssues: unknown = raw.topIssues;
  const defaultIssueId: string | undefined = Array.isArray(topIssues)
    ? (() => {
      const first = topIssues.find((row) => isRecord(row) && isNonEmptyString(row.id));
      return first && isRecord(first) && isNonEmptyString(first.id) ? normalizeIssueId(first.id) : undefined;
    })()
    : undefined;
  return {
    ...(defaultIssueId !== undefined ? { defaultIssueId } : {}),
    routeIssueIdByPath,
  };
}

export function buildSeoBenchmarkSignalsFromArtifacts(params: BuildSeoBenchmarkSignalsParams): MultiBenchmarkSignalsFileV1 {
  const resultsReport = assertResultsReport(params.resultsReport);
  const linksReport = params.linksReport !== undefined ? parseLinksReport(params.linksReport) : undefined;
  const confidence: "high" | "medium" | "low" = params.confidence ?? "high";
  const minIssueCount: number = Math.max(1, Math.floor(params.minIssueCount ?? 1));
  const includePassingRoutes: boolean = params.includePassingRoutes ?? false;
  const resultsSourceRelPath: string = normalizePath(params.sourceRelPath);
  const linksSourceRelPath: string | undefined = params.linksSourceRelPath !== undefined ? normalizePath(params.linksSourceRelPath) : undefined;

  const collectedAt: string =
    params.collectedAt
      ?? (isRecord(resultsReport.meta) && isNonEmptyString(resultsReport.meta.completedAt)
        ? resultsReport.meta.completedAt
        : (isNonEmptyString(resultsReport.generatedAt) ? resultsReport.generatedAt : new Date().toISOString()));
  assertIsoTimestamp(collectedAt, "collectedAt");

  const routeIssueIdByPath: Readonly<Record<string, string>> = params.routeIssueIdByPath ?? {};
  const defaultIssueId: string | undefined = params.defaultIssueId;
  const brokenLinkCountsByPath: ReadonlyMap<string, number> = buildBrokenLinkCountsByPath(linksReport);

  const records: MultiBenchmarkSignalsFileV1["sources"][number]["records"][number][] = [];
  for (let index = 0; index < resultsReport.results.length; index += 1) {
    const row = resultsReport.results[index];
    const path: string = row.path as string;
    const device: "mobile" | "desktop" = row.device as "mobile" | "desktop";
    const failedAudits = parseFailedAudits(row.failedAudits);
    const runtimeErrorMessage: string | undefined = typeof row.runtimeErrorMessage === "string" ? row.runtimeErrorMessage : undefined;
    const brokenLinkCount: number = brokenLinkCountsByPath.get(path) ?? 0;
    const metrics: SeoTechnicalMetricsV1 = deriveMetrics({
      failedAudits,
      runtimeErrorMessage,
      brokenLinkCount,
    });
    const issueCount: number = totalIssueCount(metrics);
    if (!includePassingRoutes && issueCount < minIssueCount) {
      continue;
    }

    const mappedIssueId: string | undefined = routeIssueIdByPath[path] ?? defaultIssueId;
    if (!isNonEmptyString(mappedIssueId)) {
      throw new Error(`No issueId mapping found for path "${path}". Provide --default-issue-id or --issues mapping.`);
    }

    records.push({
      id: buildRecordId(path, device, index),
      target: {
        issueId: normalizeIssueId(mappedIssueId),
        path,
        device,
      },
      confidence,
      evidence: buildEvidence({
        resultsSourceRelPath,
        rowIndex: index,
        linksSourceRelPath,
        hasLinkContribution: brokenLinkCount > 0,
      }),
      ...(Object.keys(metrics).length > 0 ? { metrics } : {}),
    });
  }

  return {
    schemaVersion: 1,
    sources: [
      {
        sourceId: "seo-technical",
        collectedAt,
        records,
      },
    ],
  };
}

export function resolveSeoResultsSourcePath(inputPath: string): string {
  return toRelativeSourcePath(inputPath);
}

export function resolveSeoLinksSourcePath(inputPath: string): string {
  return toRelativeSourcePath(inputPath);
}

