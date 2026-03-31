import { relative, resolve } from "node:path";
import type { CrossBrowserParityMetricsV1, MultiBenchmarkSignalsFileV1 } from "./contracts/multi-benchmark-v1.js";

type CrossBrowserSnapshotReportLike = {
  readonly generatedAt?: unknown;
  readonly collectedAt?: unknown;
  readonly snapshots?: readonly {
    readonly path?: unknown;
    readonly url?: unknown;
    readonly device?: unknown;
    readonly browser?: unknown;
    readonly performanceScore?: unknown;
    readonly metrics?: {
      readonly lcpMs?: unknown;
      readonly cls?: unknown;
    };
    readonly runtimeErrorMessage?: unknown;
  }[];
};

type ParsedSnapshot = {
  readonly index: number;
  readonly path: string;
  readonly device: "mobile" | "desktop";
  readonly browser: string;
  readonly performanceScore?: number;
  readonly lcpMs?: number;
  readonly cls?: number;
  readonly runtimeErrorMessage?: string;
};

export type CrossBrowserBenchmarkIssueMapping = {
  readonly defaultIssueId?: string;
  readonly routeIssueIdByPath: Readonly<Record<string, string>>;
};

export type BuildCrossBrowserBenchmarkSignalsParams = {
  readonly report: unknown;
  readonly sourceRelPath: string;
  readonly collectedAt?: string;
  readonly confidence?: "high" | "medium" | "low";
  readonly defaultIssueId?: string;
  readonly routeIssueIdByPath?: Readonly<Record<string, string>>;
  readonly minScoreVariancePct?: number;
  readonly minLcpDeltaMs?: number;
  readonly minClsDelta?: number;
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

function roundTo(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function clampThreshold(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, value ?? fallback);
}

function buildRecordId(pathname: string, device: "mobile" | "desktop", index: number): string {
  const normalizedPath: string = pathname
    .replace(/^\//, "")
    .replace(/\/+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();
  const safePath: string = normalizedPath.length > 0 ? normalizedPath : "root";
  return `parity-${safePath}-${device}-${index + 1}`;
}

function assertSnapshotReport(value: unknown): Required<Pick<CrossBrowserSnapshotReportLike, "snapshots">> & Pick<CrossBrowserSnapshotReportLike, "generatedAt" | "collectedAt"> {
  if (!isRecord(value)) {
    throw new Error("Invalid cross-browser snapshot report: expected object.");
  }
  if (!Array.isArray(value.snapshots)) {
    throw new Error("Invalid cross-browser snapshot report: snapshots must be an array.");
  }
  if (value.generatedAt !== undefined && !isNonEmptyString(value.generatedAt)) {
    throw new Error("Invalid cross-browser snapshot report: generatedAt must be a string when provided.");
  }
  if (value.collectedAt !== undefined && !isNonEmptyString(value.collectedAt)) {
    throw new Error("Invalid cross-browser snapshot report: collectedAt must be a string when provided.");
  }

  for (const row of value.snapshots) {
    if (!isRecord(row)) {
      throw new Error("Invalid cross-browser snapshot row: expected object.");
    }
    if (!isNonEmptyString(row.path)) {
      throw new Error("Invalid cross-browser snapshot row.path.");
    }
    if (row.device !== "mobile" && row.device !== "desktop") {
      throw new Error("Invalid cross-browser snapshot row.device.");
    }
    if (!isNonEmptyString(row.browser)) {
      throw new Error("Invalid cross-browser snapshot row.browser.");
    }
    if (row.url !== undefined && !isNonEmptyString(row.url)) {
      throw new Error("Invalid cross-browser snapshot row.url.");
    }
    if (row.performanceScore !== undefined && !isFiniteNonNegativeNumber(row.performanceScore)) {
      throw new Error("Invalid cross-browser snapshot row.performanceScore.");
    }
    if (row.runtimeErrorMessage !== undefined && typeof row.runtimeErrorMessage !== "string") {
      throw new Error("Invalid cross-browser snapshot row.runtimeErrorMessage.");
    }
    if (row.metrics !== undefined) {
      if (!isRecord(row.metrics)) {
        throw new Error("Invalid cross-browser snapshot row.metrics.");
      }
      if (row.metrics.lcpMs !== undefined && !isFiniteNonNegativeNumber(row.metrics.lcpMs)) {
        throw new Error("Invalid cross-browser snapshot row.metrics.lcpMs.");
      }
      if (row.metrics.cls !== undefined && !isFiniteNonNegativeNumber(row.metrics.cls)) {
        throw new Error("Invalid cross-browser snapshot row.metrics.cls.");
      }
    }
  }
  return value as Required<Pick<CrossBrowserSnapshotReportLike, "snapshots">> & Pick<CrossBrowserSnapshotReportLike, "generatedAt" | "collectedAt">;
}

function parseSnapshots(report: Required<Pick<CrossBrowserSnapshotReportLike, "snapshots">>): readonly ParsedSnapshot[] {
  const parsed: ParsedSnapshot[] = [];
  for (let index = 0; index < report.snapshots.length; index += 1) {
    const row = report.snapshots[index];
    if (!isRecord(row)) continue;
    parsed.push({
      index,
      path: row.path as string,
      device: row.device as "mobile" | "desktop",
      browser: (row.browser as string).trim().toLowerCase(),
      ...(typeof row.performanceScore === "number" ? { performanceScore: row.performanceScore } : {}),
      ...(isRecord(row.metrics) && typeof row.metrics.lcpMs === "number" ? { lcpMs: row.metrics.lcpMs } : {}),
      ...(isRecord(row.metrics) && typeof row.metrics.cls === "number" ? { cls: row.metrics.cls } : {}),
      ...(typeof row.runtimeErrorMessage === "string" ? { runtimeErrorMessage: row.runtimeErrorMessage } : {}),
    });
  }
  return parsed;
}

function minMax(values: readonly number[]): { readonly min: number; readonly max: number } | undefined {
  if (values.length === 0) return undefined;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function buildGroupMetrics(params: {
  readonly rows: readonly ParsedSnapshot[];
  readonly minScoreVariancePct: number;
}): { readonly metrics: CrossBrowserParityMetricsV1; readonly runtimeErrorCount: number; readonly browserCount: number } {
  const scoreValues = params.rows
    .map((row) => row.performanceScore)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const lcpValues = params.rows
    .map((row) => row.lcpMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const clsValues = params.rows
    .map((row) => row.cls)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const runtimeErrorCount = params.rows.filter((row) => typeof row.runtimeErrorMessage === "string" && row.runtimeErrorMessage.length > 0).length;
  const browserCount = new Set(params.rows.map((row) => row.browser)).size;

  const scoreRange = minMax(scoreValues);
  const lcpRange = minMax(lcpValues);
  const clsRange = minMax(clsValues);

  let scoreVariancePct = scoreRange === undefined ? 0 : roundTo(Math.max(0, scoreRange.max - scoreRange.min), 2);
  const lcpDeltaMs = lcpRange === undefined ? 0 : roundTo(Math.max(0, lcpRange.max - lcpRange.min), 2);
  const clsDelta = clsRange === undefined ? 0 : roundTo(Math.max(0, clsRange.max - clsRange.min), 4);

  if (runtimeErrorCount > 0 && scoreVariancePct === 0) {
    scoreVariancePct = roundTo(params.minScoreVariancePct, 2);
  }

  return {
    metrics: {
      ...(scoreVariancePct > 0 ? { scoreVariancePct } : {}),
      ...(lcpDeltaMs > 0 ? { lcpDeltaMs } : {}),
      ...(clsDelta > 0 ? { clsDelta } : {}),
    },
    runtimeErrorCount,
    browserCount,
  };
}

function groupRowsByPathAndDevice(rows: readonly ParsedSnapshot[]): readonly {
  readonly path: string;
  readonly device: "mobile" | "desktop";
  readonly rows: readonly ParsedSnapshot[];
}[] {
  const map = new Map<string, ParsedSnapshot[]>();
  for (const row of rows) {
    const key = `${row.path}::${row.device}`;
    const group = map.get(key);
    if (group) {
      group.push(row);
    } else {
      map.set(key, [row]);
    }
  }
  return [...map.entries()]
    .map(([key, value]) => {
      const splitIndex = key.lastIndexOf("::");
      const path = key.slice(0, splitIndex);
      const device = key.slice(splitIndex + 2) as "mobile" | "desktop";
      const rowsSorted = [...value].sort((a, b) => {
        const browserDelta = a.browser.localeCompare(b.browser);
        if (browserDelta !== 0) return browserDelta;
        return a.index - b.index;
      });
      return { path, device, rows: rowsSorted };
    })
    .sort((a, b) => {
      const pathDelta = a.path.localeCompare(b.path);
      if (pathDelta !== 0) return pathDelta;
      return a.device.localeCompare(b.device);
    });
}

export function deriveIssueMappingFromIssuesJson(raw: unknown): CrossBrowserBenchmarkIssueMapping {
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

export function buildCrossBrowserBenchmarkSignalsFromSnapshots(params: BuildCrossBrowserBenchmarkSignalsParams): MultiBenchmarkSignalsFileV1 {
  const report = assertSnapshotReport(params.report);
  const confidence: "high" | "medium" | "low" = params.confidence ?? "high";
  const minScoreVariancePct: number = clampThreshold(params.minScoreVariancePct, 5);
  const minLcpDeltaMs: number = clampThreshold(params.minLcpDeltaMs, 250);
  const minClsDelta: number = clampThreshold(params.minClsDelta, 0.05);
  const includePassingRoutes: boolean = params.includePassingRoutes ?? false;
  const sourceRelPath: string = normalizePath(params.sourceRelPath);

  const collectedAt: string = params.collectedAt
    ?? (isNonEmptyString(report.collectedAt) ? report.collectedAt : undefined)
    ?? (isNonEmptyString(report.generatedAt) ? report.generatedAt : new Date().toISOString());
  assertIsoTimestamp(collectedAt, "collectedAt");

  const routeIssueIdByPath: Readonly<Record<string, string>> = params.routeIssueIdByPath ?? {};
  const defaultIssueId: string | undefined = params.defaultIssueId;

  const records: MultiBenchmarkSignalsFileV1["sources"][number]["records"][number][] = [];
  const grouped = groupRowsByPathAndDevice(parseSnapshots(report));
  for (let index = 0; index < grouped.length; index += 1) {
    const group = grouped[index];
    const mappedIssueId: string | undefined = routeIssueIdByPath[group.path] ?? defaultIssueId;
    if (!isNonEmptyString(mappedIssueId)) {
      throw new Error(`No issueId mapping found for path "${group.path}". Provide --default-issue-id or --issues mapping.`);
    }

    const computed = buildGroupMetrics({
      rows: group.rows,
      minScoreVariancePct,
    });
    const hasComparability = computed.browserCount >= 2;
    const hasSignal = computed.runtimeErrorCount > 0
      || (computed.metrics.scoreVariancePct ?? 0) >= minScoreVariancePct
      || (computed.metrics.lcpDeltaMs ?? 0) >= minLcpDeltaMs
      || (computed.metrics.clsDelta ?? 0) >= minClsDelta;
    if (!hasComparability && !includePassingRoutes) {
      continue;
    }
    if (!includePassingRoutes && !hasSignal) {
      continue;
    }

    records.push({
      id: buildRecordId(group.path, group.device, index),
      target: {
        issueId: normalizeIssueId(mappedIssueId),
        path: group.path,
        device: group.device,
      },
      confidence,
      evidence: group.rows.map((row) => ({
        sourceRelPath,
        pointer: `/snapshots/${row.index}`,
        artifactRelPath: "cross-browser-snapshots.json",
      })),
      ...(Object.keys(computed.metrics).length > 0 ? { metrics: computed.metrics } : {}),
    });
  }

  return {
    schemaVersion: 1,
    sources: [
      {
        sourceId: "cross-browser-parity",
        collectedAt,
        records,
      },
    ],
  };
}

export function resolveCrossBrowserSnapshotsSourcePath(inputPath: string): string {
  return toRelativeSourcePath(inputPath);
}
