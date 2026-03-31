import { relative, resolve } from "node:path";
import type { MultiBenchmarkSignalsFileV1 } from "./contracts/multi-benchmark-v1.js";

type HeaderKey =
  | "content-security-policy"
  | "strict-transport-security"
  | "x-content-type-options"
  | "x-frame-options"
  | "referrer-policy"
  | "permissions-policy"
  | "cross-origin-opener-policy"
  | "cross-origin-resource-policy"
  | "cross-origin-embedder-policy";

type HeadersReportLike = {
  readonly meta?: {
    readonly baseUrl?: unknown;
    readonly completedAt?: unknown;
  };
  readonly results?: readonly {
    readonly path?: unknown;
    readonly url?: unknown;
    readonly missing?: unknown;
    readonly present?: unknown;
    readonly statusCode?: unknown;
    readonly runtimeErrorMessage?: unknown;
  }[];
};

export type SecurityBenchmarkIssueMapping = {
  readonly defaultIssueId?: string;
  readonly routeIssueIdByPath: Readonly<Record<string, string>>;
};

export type BuildSecurityBenchmarkSignalsParams = {
  readonly report: unknown;
  readonly sourceRelPath: string;
  readonly collectedAt?: string;
  readonly confidence?: "high" | "medium" | "low";
  readonly defaultIssueId?: string;
  readonly routeIssueIdByPath?: Readonly<Record<string, string>>;
  readonly minMissingHeaders?: number;
  readonly includeRuntimeErrors?: boolean;
};

const POLICY_HEADERS: readonly HeaderKey[] = [
  "content-security-policy",
  "permissions-policy",
  "referrer-policy",
] as const;

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

function isKnownHeaderKey(value: unknown): value is HeaderKey {
  return value === "content-security-policy"
    || value === "strict-transport-security"
    || value === "x-content-type-options"
    || value === "x-frame-options"
    || value === "referrer-policy"
    || value === "permissions-policy"
    || value === "cross-origin-opener-policy"
    || value === "cross-origin-resource-policy"
    || value === "cross-origin-embedder-policy";
}

function parseHeaderList(value: unknown, fieldName: string): readonly HeaderKey[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid headers report result.${fieldName}: expected array.`);
  }
  const list: HeaderKey[] = [];
  for (const item of value) {
    if (isKnownHeaderKey(item)) {
      list.push(item);
    }
  }
  return [...new Set(list)];
}

function assertHeadersReport(value: unknown): Required<Pick<HeadersReportLike, "meta" | "results">> {
  if (!isRecord(value)) {
    throw new Error("Invalid headers report: expected object.");
  }
  if (!isRecord(value.meta)) {
    throw new Error("Invalid headers report: meta is required.");
  }
  if (!isNonEmptyString(value.meta.completedAt)) {
    throw new Error("Invalid headers report: meta.completedAt is required.");
  }
  assertIsoTimestamp(value.meta.completedAt, "meta.completedAt");
  if (!Array.isArray(value.results)) {
    throw new Error("Invalid headers report: results must be an array.");
  }
  for (const row of value.results) {
    if (!isRecord(row)) {
      throw new Error("Invalid headers report result: expected object.");
    }
    if (!isNonEmptyString(row.path)) {
      throw new Error("Invalid headers report result.path.");
    }
    if (!isNonEmptyString(row.url)) {
      throw new Error("Invalid headers report result.url.");
    }
    parseHeaderList(row.missing, "missing");
    parseHeaderList(row.present, "present");
    if (row.statusCode !== undefined && (typeof row.statusCode !== "number" || !Number.isFinite(row.statusCode) || row.statusCode < 0)) {
      throw new Error("Invalid headers report result.statusCode.");
    }
    if (row.runtimeErrorMessage !== undefined && typeof row.runtimeErrorMessage !== "string") {
      throw new Error("Invalid headers report result.runtimeErrorMessage.");
    }
  }
  return value as Required<Pick<HeadersReportLike, "meta" | "results">>;
}

function buildRecordId(pathname: string, index: number): string {
  const normalizedPath: string = pathname
    .replace(/^\//, "")
    .replace(/\/+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();
  const safePath: string = normalizedPath.length > 0 ? normalizedPath : "root";
  return `sec-${safePath}-${index + 1}`;
}

function deriveMetrics(params: {
  readonly missing: readonly HeaderKey[];
  readonly url: string;
  readonly baseUrl?: string;
}): NonNullable<MultiBenchmarkSignalsFileV1["sources"][number]["records"][number]["metrics"]> | undefined {
  let missingHeaderCount: number = params.missing.length;
  let tlsConfigIssueCount = 0;
  let cookiePolicyIssueCount = 0;
  let mixedContentCount = 0;

  let urlProtocol: string | undefined;
  try {
    urlProtocol = new URL(params.url).protocol;
  } catch {
    urlProtocol = undefined;
  }

  if (urlProtocol === "https:") {
    if (params.missing.includes("strict-transport-security")) {
      tlsConfigIssueCount += 1;
    }
  } else if (urlProtocol === "http:") {
    tlsConfigIssueCount += 1;
  }

  if (params.baseUrl !== undefined) {
    try {
      const baseProtocol: string = new URL(params.baseUrl).protocol;
      if (baseProtocol === "https:" && urlProtocol === "http:") {
        mixedContentCount += 1;
      }
    } catch {
      // ignore base URL parse errors in derived metrics
    }
  }

  cookiePolicyIssueCount = params.missing.filter((header) => POLICY_HEADERS.includes(header)).length;
  if (missingHeaderCount < 0) missingHeaderCount = 0;

  const metrics = {
    ...(missingHeaderCount > 0 ? { missingHeaderCount } : {}),
    ...(tlsConfigIssueCount > 0 ? { tlsConfigIssueCount } : {}),
    ...(cookiePolicyIssueCount > 0 ? { cookiePolicyIssueCount } : {}),
    ...(mixedContentCount > 0 ? { mixedContentCount } : {}),
  };
  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

export function deriveIssueMappingFromIssuesJson(raw: unknown): SecurityBenchmarkIssueMapping {
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

export function buildSecurityBenchmarkSignalsFromHeadersReport(params: BuildSecurityBenchmarkSignalsParams): MultiBenchmarkSignalsFileV1 {
  const report = assertHeadersReport(params.report);
  const confidence: "high" | "medium" | "low" = params.confidence ?? "high";
  const minMissingHeaders: number = Math.max(1, Math.floor(params.minMissingHeaders ?? 1));
  const includeRuntimeErrors: boolean = params.includeRuntimeErrors ?? true;
  const sourceRelPath: string = normalizePath(params.sourceRelPath);
  const collectedAt: string = params.collectedAt ?? (report.meta.completedAt as string);
  assertIsoTimestamp(collectedAt, "collectedAt");

  const routeIssueIdByPath: Readonly<Record<string, string>> = params.routeIssueIdByPath ?? {};
  const defaultIssueId: string | undefined = params.defaultIssueId;
  const baseUrl: string | undefined = isNonEmptyString(report.meta.baseUrl) ? report.meta.baseUrl : undefined;

  const records: MultiBenchmarkSignalsFileV1["sources"][number]["records"][number][] = [];
  for (let index = 0; index < report.results.length; index += 1) {
    const row = report.results[index];
    const path: string = row.path as string;
    const url: string = row.url as string;
    const missing: readonly HeaderKey[] = parseHeaderList(row.missing, "missing");
    const runtimeError: string | undefined = typeof row.runtimeErrorMessage === "string" ? row.runtimeErrorMessage : undefined;

    const hasRuntimeError: boolean = runtimeError !== undefined && runtimeError.length > 0;
    if (hasRuntimeError && !includeRuntimeErrors) {
      continue;
    }
    if (!hasRuntimeError && missing.length < minMissingHeaders) {
      continue;
    }

    const mappedIssueId: string | undefined = routeIssueIdByPath[path] ?? defaultIssueId;
    if (!isNonEmptyString(mappedIssueId)) {
      throw new Error(`No issueId mapping found for path "${path}". Provide --default-issue-id or --issues mapping.`);
    }

    const metrics = deriveMetrics({
      missing,
      url,
      baseUrl,
    });
    records.push({
      id: buildRecordId(path, index),
      target: {
        issueId: normalizeIssueId(mappedIssueId),
        path,
      },
      confidence,
      evidence: [
        {
          sourceRelPath,
          pointer: `/results/${index}`,
          artifactRelPath: "headers.json",
        },
      ],
      ...(metrics !== undefined ? { metrics } : {}),
    });
  }

  return {
    schemaVersion: 1,
    sources: [
      {
        sourceId: "security-baseline",
        collectedAt,
        records,
      },
    ],
  };
}

export function resolveSecurityHeadersSourcePath(inputPath: string): string {
  return toRelativeSourcePath(inputPath);
}

