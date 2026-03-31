import { relative, resolve } from "node:path";
import type { MultiBenchmarkSignalsFileV1 } from "./contracts/multi-benchmark-v1.js";
import type { ReliabilitySloMetricsV1 } from "./contracts/multi-benchmark-v1.js";

type HealthReportLike = {
  readonly meta?: {
    readonly completedAt?: unknown;
  };
  readonly results?: readonly {
    readonly path?: unknown;
    readonly url?: unknown;
    readonly statusCode?: unknown;
    readonly ttfbMs?: unknown;
    readonly totalMs?: unknown;
    readonly runtimeErrorMessage?: unknown;
  }[];
};

export type ReliabilityBenchmarkIssueMapping = {
  readonly defaultIssueId?: string;
  readonly routeIssueIdByPath: Readonly<Record<string, string>>;
};

export type BuildReliabilityBenchmarkSignalsParams = {
  readonly report: unknown;
  readonly sourceRelPath: string;
  readonly collectedAt?: string;
  readonly confidence?: "high" | "medium" | "low";
  readonly defaultIssueId?: string;
  readonly routeIssueIdByPath?: Readonly<Record<string, string>>;
  readonly minLatencyMs?: number;
  readonly includePassingRoutes?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
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

function assertHealthReport(value: unknown): Required<Pick<HealthReportLike, "meta" | "results">> {
  if (!isRecord(value)) {
    throw new Error("Invalid health report: expected object.");
  }
  if (!isRecord(value.meta)) {
    throw new Error("Invalid health report: meta is required.");
  }
  if (!isNonEmptyString(value.meta.completedAt)) {
    throw new Error("Invalid health report: meta.completedAt is required.");
  }
  assertIsoTimestamp(value.meta.completedAt, "meta.completedAt");
  if (!Array.isArray(value.results)) {
    throw new Error("Invalid health report: results must be an array.");
  }
  for (const row of value.results) {
    if (!isRecord(row)) {
      throw new Error("Invalid health report result: expected object.");
    }
    if (!isNonEmptyString(row.path)) {
      throw new Error("Invalid health report result.path.");
    }
    if (!isNonEmptyString(row.url)) {
      throw new Error("Invalid health report result.url.");
    }
    if (row.statusCode !== undefined && !isFiniteNonNegativeNumber(row.statusCode)) {
      throw new Error("Invalid health report result.statusCode.");
    }
    if (row.ttfbMs !== undefined && !isFiniteNonNegativeNumber(row.ttfbMs)) {
      throw new Error("Invalid health report result.ttfbMs.");
    }
    if (row.totalMs !== undefined && !isFiniteNonNegativeNumber(row.totalMs)) {
      throw new Error("Invalid health report result.totalMs.");
    }
    if (row.runtimeErrorMessage !== undefined && typeof row.runtimeErrorMessage !== "string") {
      throw new Error("Invalid health report result.runtimeErrorMessage.");
    }
  }
  return value as Required<Pick<HealthReportLike, "meta" | "results">>;
}

function buildRecordId(pathname: string, index: number): string {
  const normalizedPath: string = pathname
    .replace(/^\//, "")
    .replace(/\/+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();
  const safePath: string = normalizedPath.length > 0 ? normalizedPath : "root";
  return `rel-${safePath}-${index + 1}`;
}

function deriveMetrics(row: {
  readonly statusCode?: number;
  readonly runtimeErrorMessage?: string;
  readonly ttfbMs?: number;
  readonly totalMs?: number;
}): ReliabilitySloMetricsV1 {
  const statusCode: number = row.statusCode ?? 0;
  const hasRuntimeError: boolean = typeof row.runtimeErrorMessage === "string" && row.runtimeErrorMessage.length > 0;
  const isHealthyStatus: boolean = statusCode >= 200 && statusCode < 400;
  const availabilityPct: number = hasRuntimeError || !isHealthyStatus ? 0 : 100;
  const errorRatePct: number = 100 - availabilityPct;
  const latencyP95Ms: number = row.totalMs ?? row.ttfbMs ?? 0;
  return {
    availabilityPct,
    errorRatePct,
    latencyP95Ms,
  };
}

export function deriveIssueMappingFromIssuesJson(raw: unknown): ReliabilityBenchmarkIssueMapping {
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

export function buildReliabilityBenchmarkSignalsFromHealthReport(params: BuildReliabilityBenchmarkSignalsParams): MultiBenchmarkSignalsFileV1 {
  const report = assertHealthReport(params.report);
  const confidence: "high" | "medium" | "low" = params.confidence ?? "high";
  const minLatencyMs: number = Math.max(0, Math.floor(params.minLatencyMs ?? 400));
  const includePassingRoutes: boolean = params.includePassingRoutes ?? false;
  const sourceRelPath: string = normalizePath(params.sourceRelPath);
  const collectedAt: string = params.collectedAt ?? (report.meta.completedAt as string);
  assertIsoTimestamp(collectedAt, "collectedAt");

  const routeIssueIdByPath: Readonly<Record<string, string>> = params.routeIssueIdByPath ?? {};
  const defaultIssueId: string | undefined = params.defaultIssueId;

  const records: MultiBenchmarkSignalsFileV1["sources"][number]["records"][number][] = [];
  for (let index = 0; index < report.results.length; index += 1) {
    const row = report.results[index];
    const path: string = row.path as string;
    const statusCode: number | undefined = typeof row.statusCode === "number" ? row.statusCode : undefined;
    const totalMs: number | undefined = typeof row.totalMs === "number" ? row.totalMs : undefined;
    const ttfbMs: number | undefined = typeof row.ttfbMs === "number" ? row.ttfbMs : undefined;
    const runtimeErrorMessage: string | undefined = typeof row.runtimeErrorMessage === "string" ? row.runtimeErrorMessage : undefined;

    const metrics = deriveMetrics({
      statusCode,
      runtimeErrorMessage,
      ttfbMs,
      totalMs,
    });
    const hasReliabilitySignal: boolean =
      (metrics.errorRatePct ?? 0) > 0
      || (metrics.latencyP95Ms ?? 0) >= minLatencyMs
      || includePassingRoutes;
    if (!hasReliabilitySignal) {
      continue;
    }

    const mappedIssueId: string | undefined = routeIssueIdByPath[path] ?? defaultIssueId;
    if (!isNonEmptyString(mappedIssueId)) {
      throw new Error(`No issueId mapping found for path "${path}". Provide --default-issue-id or --issues mapping.`);
    }

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
          artifactRelPath: "health.json",
        },
      ],
      metrics,
    });
  }

  return {
    schemaVersion: 1,
    sources: [
      {
        sourceId: "reliability-slo",
        collectedAt,
        records,
      },
    ],
  };
}

export function resolveReliabilityHealthSourcePath(inputPath: string): string {
  return toRelativeSourcePath(inputPath);
}
