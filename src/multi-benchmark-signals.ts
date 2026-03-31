import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  AccessibilityExtendedMetricsV1,
  CrossBrowserParityMetricsV1,
  MultiBenchmarkEvidenceV1,
  MultiBenchmarkMetadataV1,
  MultiBenchmarkSignalsFileV1,
  MultiBenchmarkSourceIdV1,
  ReliabilitySloMetricsV1,
  SeoTechnicalMetricsV1,
  SecurityBaselineMetricsV1,
} from "./contracts/multi-benchmark-v1.js";
import type { SuggestionV3 } from "./contracts/v3/suggestions-v3.js";

const DEFAULT_MAX_AGE_DAYS = 30;
const POLICY_ID: MultiBenchmarkMetadataV1["policy"] = "v1-conservative-high-30d-route-issue";
const RANKING_VERSION: MultiBenchmarkMetadataV1["rankingVersion"] = "j3-composite-ranking";
const MAX_SOURCE_BOOST = 0.12;
const MAX_TOTAL_BOOST = 0.3;
const SOURCE_BASE_BOOST: Record<MultiBenchmarkSourceIdV1, number> = {
  "accessibility-extended": 0.06,
  "security-baseline": 0.06,
  "seo-technical": 0.05,
  "reliability-slo": 0.07,
  "cross-browser-parity": 0.04,
} as const;

export function buildDefaultMultiBenchmarkMetadata(): MultiBenchmarkMetadataV1 {
  return {
    enabled: false,
    inputFiles: [],
    sources: [],
    accepted: 0,
    rejected: 0,
    digest: null,
    policy: POLICY_ID,
    rankingVersion: RANKING_VERSION,
  };
}

export type MultiBenchmarkLoadedRecord = {
  readonly sourceId: MultiBenchmarkSourceIdV1;
  readonly collectedAt: string;
  readonly collectedAtMs: number;
  readonly id: string;
  readonly target: {
    readonly issueId: string;
    readonly path: string;
    readonly device?: "mobile" | "desktop";
  };
  readonly confidence: "high" | "medium" | "low";
  readonly evidence: readonly MultiBenchmarkEvidenceV1[];
  readonly metrics?:
    | AccessibilityExtendedMetricsV1
    | SecurityBaselineMetricsV1
    | SeoTechnicalMetricsV1
    | ReliabilitySloMetricsV1
    | CrossBrowserParityMetricsV1;
};

export type MultiBenchmarkSignalsLoaded = {
  readonly inputFiles: readonly string[];
  readonly sourceIds: readonly MultiBenchmarkSourceIdV1[];
  readonly records: readonly MultiBenchmarkLoadedRecord[];
};

export type MultiBenchmarkAcceptedRecord = MultiBenchmarkLoadedRecord;

export type MultiBenchmarkEvaluation = {
  readonly acceptedRecords: readonly MultiBenchmarkAcceptedRecord[];
  readonly metadata: MultiBenchmarkMetadataV1;
};

export type MultiBenchmarkSourceBoosts = Record<MultiBenchmarkSourceIdV1, number>;

export type MultiBenchmarkMatchResult = {
  readonly totalBoost: number;
  readonly sourceBoosts: MultiBenchmarkSourceBoosts;
  readonly evidence: readonly MultiBenchmarkEvidenceV1[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isBenchmarkSourceId(value: unknown): value is MultiBenchmarkSourceIdV1 {
  return value === "accessibility-extended"
    || value === "security-baseline"
    || value === "seo-technical"
    || value === "reliability-slo"
    || value === "cross-browser-parity";
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function clampBoost(value: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, max);
}

function parseEvidenceRows(value: unknown): readonly MultiBenchmarkEvidenceV1[] {
  if (!Array.isArray(value)) {
    throw new Error("Invalid benchmark signal evidence: expected array.");
  }
  const rows: MultiBenchmarkEvidenceV1[] = [];
  for (const row of value) {
    if (!isRecord(row)) {
      throw new Error("Invalid benchmark signal evidence row: expected object.");
    }
    if (!isNonEmptyString(row.sourceRelPath) || !isNonEmptyString(row.pointer)) {
      throw new Error("Invalid benchmark signal evidence row: sourceRelPath and pointer are required.");
    }
    rows.push({
      sourceRelPath: row.sourceRelPath,
      pointer: row.pointer,
      ...(isNonEmptyString(row.artifactRelPath) ? { artifactRelPath: row.artifactRelPath } : {}),
    });
  }
  return normalizeEvidenceRows(rows);
}

function compareEvidenceRows(a: MultiBenchmarkEvidenceV1, b: MultiBenchmarkEvidenceV1): number {
  const sourceDelta = a.sourceRelPath.localeCompare(b.sourceRelPath);
  if (sourceDelta !== 0) return sourceDelta;
  const pointerDelta = a.pointer.localeCompare(b.pointer);
  if (pointerDelta !== 0) return pointerDelta;
  return (a.artifactRelPath ?? "").localeCompare(b.artifactRelPath ?? "");
}

function normalizeEvidenceRows(rows: readonly MultiBenchmarkEvidenceV1[]): readonly MultiBenchmarkEvidenceV1[] {
  const sorted = [...rows].sort(compareEvidenceRows);
  const deduped: MultiBenchmarkEvidenceV1[] = [];
  let lastKey = "";
  for (const row of sorted) {
    const key = `${row.sourceRelPath}|${row.pointer}|${row.artifactRelPath ?? ""}`;
    if (key === lastKey) continue;
    deduped.push(row);
    lastKey = key;
  }
  return deduped;
}

function compareLoadedRecords(a: MultiBenchmarkLoadedRecord, b: MultiBenchmarkLoadedRecord): number {
  const sourceDelta = a.sourceId.localeCompare(b.sourceId);
  if (sourceDelta !== 0) return sourceDelta;
  const issueDelta = a.target.issueId.localeCompare(b.target.issueId);
  if (issueDelta !== 0) return issueDelta;
  const pathDelta = a.target.path.localeCompare(b.target.path);
  if (pathDelta !== 0) return pathDelta;
  const deviceDelta = (a.target.device ?? "").localeCompare(b.target.device ?? "");
  if (deviceDelta !== 0) return deviceDelta;
  const collectedDelta = a.collectedAtMs - b.collectedAtMs;
  if (collectedDelta !== 0) return collectedDelta;
  const isoDelta = a.collectedAt.localeCompare(b.collectedAt);
  if (isoDelta !== 0) return isoDelta;
  const confidenceDelta = a.confidence.localeCompare(b.confidence);
  if (confidenceDelta !== 0) return confidenceDelta;
  return a.id.localeCompare(b.id);
}

function metricsSortKey(value: MultiBenchmarkLoadedRecord["metrics"]): string {
  if (value === undefined) return "";
  const entries = Object.entries(value as Record<string, number>).sort((a, b) => a[0].localeCompare(b[0]));
  return JSON.stringify(entries);
}

function recordDedupKey(value: MultiBenchmarkLoadedRecord): string {
  const evidenceKey = value.evidence
    .map((row) => `${row.sourceRelPath}|${row.pointer}|${row.artifactRelPath ?? ""}`)
    .join("||");
  return [
    value.sourceId,
    value.collectedAt,
    String(value.collectedAtMs),
    value.id,
    value.target.issueId,
    value.target.path,
    value.target.device ?? "",
    value.confidence,
    evidenceKey,
    metricsSortKey(value.metrics),
  ].join("::");
}

function normalizeLoadedRecords(records: readonly MultiBenchmarkLoadedRecord[]): readonly MultiBenchmarkLoadedRecord[] {
  const sorted = [...records].sort(compareLoadedRecords).map((row) => ({
    ...row,
    evidence: normalizeEvidenceRows(row.evidence),
  }));
  const deduped: MultiBenchmarkLoadedRecord[] = [];
  const seen = new Set<string>();
  for (const row of sorted) {
    const key = recordDedupKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

function parseMetricsBySource(params: {
  readonly sourceId: MultiBenchmarkSourceIdV1;
  readonly value: unknown;
}):
  | AccessibilityExtendedMetricsV1
  | SecurityBaselineMetricsV1
  | SeoTechnicalMetricsV1
  | ReliabilitySloMetricsV1
  | CrossBrowserParityMetricsV1
  | undefined {
  if (params.value === undefined) return undefined;
  if (!isRecord(params.value)) {
    throw new Error("Invalid benchmark signal metrics: expected object.");
  }

  if (params.sourceId === "accessibility-extended") {
    const parsed: AccessibilityExtendedMetricsV1 = {
      ...(isFiniteNonNegativeNumber(params.value.wcagViolationCount) ? { wcagViolationCount: params.value.wcagViolationCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.seriousViolationCount) ? { seriousViolationCount: params.value.seriousViolationCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.criticalViolationCount) ? { criticalViolationCount: params.value.criticalViolationCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.ariaPatternMismatchCount) ? { ariaPatternMismatchCount: params.value.ariaPatternMismatchCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.focusAppearanceIssueCount) ? { focusAppearanceIssueCount: params.value.focusAppearanceIssueCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.focusNotObscuredIssueCount) ? { focusNotObscuredIssueCount: params.value.focusNotObscuredIssueCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.targetSizeIssueCount) ? { targetSizeIssueCount: params.value.targetSizeIssueCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.draggingAlternativeIssueCount) ? { draggingAlternativeIssueCount: params.value.draggingAlternativeIssueCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.apgPatternMismatchCount) ? { apgPatternMismatchCount: params.value.apgPatternMismatchCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.keyboardSupportIssueCount) ? { keyboardSupportIssueCount: params.value.keyboardSupportIssueCount } : {}),
    };
    if (Object.keys(parsed).length === 0 && Object.keys(params.value).length > 0) {
      throw new Error("Invalid accessibility-extended metrics values.");
    }
    return Object.keys(parsed).length > 0 ? parsed : undefined;
  }

  if (params.sourceId === "security-baseline") {
    const parsed: SecurityBaselineMetricsV1 = {
      ...(isFiniteNonNegativeNumber(params.value.missingHeaderCount) ? { missingHeaderCount: params.value.missingHeaderCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.tlsConfigIssueCount) ? { tlsConfigIssueCount: params.value.tlsConfigIssueCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.cookiePolicyIssueCount) ? { cookiePolicyIssueCount: params.value.cookiePolicyIssueCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.mixedContentCount) ? { mixedContentCount: params.value.mixedContentCount } : {}),
    };
    if (Object.keys(parsed).length === 0 && Object.keys(params.value).length > 0) {
      throw new Error("Invalid security-baseline metrics values.");
    }
    return Object.keys(parsed).length > 0 ? parsed : undefined;
  }

  if (params.sourceId === "seo-technical") {
    const parsed: SeoTechnicalMetricsV1 = {
      ...(isFiniteNonNegativeNumber(params.value.indexabilityIssueCount) ? { indexabilityIssueCount: params.value.indexabilityIssueCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.canonicalMismatchCount) ? { canonicalMismatchCount: params.value.canonicalMismatchCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.structuredDataErrorCount) ? { structuredDataErrorCount: params.value.structuredDataErrorCount } : {}),
      ...(isFiniteNonNegativeNumber(params.value.crawlabilityIssueCount) ? { crawlabilityIssueCount: params.value.crawlabilityIssueCount } : {}),
    };
    if (Object.keys(parsed).length === 0 && Object.keys(params.value).length > 0) {
      throw new Error("Invalid seo-technical metrics values.");
    }
    return Object.keys(parsed).length > 0 ? parsed : undefined;
  }

  if (params.sourceId === "reliability-slo") {
    const reliability: ReliabilitySloMetricsV1 = {
      ...(isFiniteNonNegativeNumber(params.value.availabilityPct) ? { availabilityPct: params.value.availabilityPct } : {}),
      ...(isFiniteNonNegativeNumber(params.value.errorRatePct) ? { errorRatePct: params.value.errorRatePct } : {}),
      ...(isFiniteNonNegativeNumber(params.value.latencyP95Ms) ? { latencyP95Ms: params.value.latencyP95Ms } : {}),
    };
    if (Object.keys(reliability).length === 0 && Object.keys(params.value).length > 0) {
      throw new Error("Invalid reliability-slo metrics values.");
    }
    return Object.keys(reliability).length > 0 ? reliability : undefined;
  }

  const parity: CrossBrowserParityMetricsV1 = {
    ...(isFiniteNonNegativeNumber(params.value.scoreVariancePct) ? { scoreVariancePct: params.value.scoreVariancePct } : {}),
    ...(isFiniteNonNegativeNumber(params.value.lcpDeltaMs) ? { lcpDeltaMs: params.value.lcpDeltaMs } : {}),
    ...(isFiniteNonNegativeNumber(params.value.clsDelta) ? { clsDelta: params.value.clsDelta } : {}),
  };
  if (Object.keys(parity).length === 0 && Object.keys(params.value).length > 0) {
    throw new Error("Invalid cross-browser-parity metrics values.");
  }
  return Object.keys(parity).length > 0 ? parity : undefined;
}

function parseBenchmarkSignalsFile(raw: unknown): MultiBenchmarkSignalsFileV1 {
  if (!isRecord(raw)) {
    throw new Error("Invalid benchmark signals payload: expected object.");
  }
  if (raw.schemaVersion !== 1) {
    throw new Error("Invalid benchmark signals payload: schemaVersion must be 1.");
  }
  if (!Array.isArray(raw.sources)) {
    throw new Error("Invalid benchmark signals payload: sources must be an array.");
  }
  for (const source of raw.sources) {
    if (!isRecord(source)) {
      throw new Error("Invalid benchmark source entry: expected object.");
    }
    if (!isBenchmarkSourceId(source.sourceId)) {
      throw new Error("Invalid benchmark source id.");
    }
    if (!isNonEmptyString(source.collectedAt) || !Number.isFinite(Date.parse(source.collectedAt))) {
      throw new Error("Invalid benchmark source collectedAt timestamp.");
    }
    if (!Array.isArray(source.records)) {
      throw new Error("Invalid benchmark source records: expected array.");
    }
    for (const record of source.records) {
      if (!isRecord(record)) {
        throw new Error("Invalid benchmark source record: expected object.");
      }
      if (!isNonEmptyString(record.id)) {
        throw new Error("Invalid benchmark source record id.");
      }
      if (!isRecord(record.target)) {
        throw new Error("Invalid benchmark source record target.");
      }
      if (!isNonEmptyString(record.target.issueId) || !isNonEmptyString(record.target.path)) {
        throw new Error("Invalid benchmark source record target fields.");
      }
      if (record.target.device !== undefined && record.target.device !== "mobile" && record.target.device !== "desktop") {
        throw new Error("Invalid benchmark source record target.device.");
      }
      if (record.confidence !== "high" && record.confidence !== "medium" && record.confidence !== "low") {
        throw new Error("Invalid benchmark source record confidence.");
      }
      parseEvidenceRows(record.evidence);
      parseMetricsBySource({
        sourceId: source.sourceId,
        value: record.metrics,
      });
    }
  }
  return raw as unknown as MultiBenchmarkSignalsFileV1;
}

export async function loadMultiBenchmarkSignalsFromFiles(paths: readonly string[]): Promise<MultiBenchmarkSignalsLoaded | undefined> {
  const dedupedPaths: string[] = [];
  const seen = new Set<string>();
  for (const rawPath of paths) {
    const absolutePath: string = normalizePath(resolve(rawPath));
    if (!seen.has(absolutePath)) {
      seen.add(absolutePath);
      dedupedPaths.push(absolutePath);
    }
  }
  if (dedupedPaths.length === 0) return undefined;

  const sourceSet = new Set<MultiBenchmarkSourceIdV1>();
  const records: MultiBenchmarkLoadedRecord[] = [];
  for (const path of dedupedPaths) {
    let parsedRaw: unknown;
    try {
      const rawText: string = await readFile(path, "utf8");
      parsedRaw = JSON.parse(rawText) as unknown;
    } catch (error: unknown) {
      throw new Error(`Failed to load benchmark signals file: ${path} (${error instanceof Error ? error.message : String(error)})`);
    }
    let parsed: MultiBenchmarkSignalsFileV1;
    try {
      parsed = parseBenchmarkSignalsFile(parsedRaw);
    } catch (error: unknown) {
      throw new Error(`Invalid benchmark signals file: ${path} (${error instanceof Error ? error.message : String(error)})`);
    }

    for (const source of parsed.sources) {
      sourceSet.add(source.sourceId);
      const collectedAtMs: number = Date.parse(source.collectedAt);
      for (const record of source.records) {
        records.push({
          sourceId: source.sourceId,
          collectedAt: source.collectedAt,
          collectedAtMs,
          id: record.id,
          target: {
            issueId: record.target.issueId,
            path: record.target.path,
            ...(record.target.device !== undefined ? { device: record.target.device } : {}),
          },
          confidence: record.confidence,
          evidence: parseEvidenceRows(record.evidence),
          ...(record.metrics !== undefined
            ? {
              metrics: parseMetricsBySource({
                sourceId: source.sourceId,
                value: record.metrics,
              }),
            }
            : {}),
        });
      }
    }
  }

  return {
    inputFiles: dedupedPaths,
    sourceIds: [...sourceSet].sort((a, b) => a.localeCompare(b)),
    records: normalizeLoadedRecords(records),
  };
}

function digestAcceptedRecords(records: readonly MultiBenchmarkAcceptedRecord[]): string {
  const normalized = [...records]
    .map((record) => ({
      sourceId: record.sourceId,
      collectedAt: record.collectedAt,
      id: record.id,
      target: {
        issueId: record.target.issueId,
        path: record.target.path,
        ...(record.target.device !== undefined ? { device: record.target.device } : {}),
      },
      evidence: [...record.evidence]
        .map((row) => ({
          sourceRelPath: row.sourceRelPath,
          pointer: row.pointer,
          ...(row.artifactRelPath !== undefined ? { artifactRelPath: row.artifactRelPath } : {}),
        }))
        .sort((a, b) => {
          const sourceDelta = a.sourceRelPath.localeCompare(b.sourceRelPath);
          if (sourceDelta !== 0) return sourceDelta;
          const pointerDelta = a.pointer.localeCompare(b.pointer);
          if (pointerDelta !== 0) return pointerDelta;
          return (a.artifactRelPath ?? "").localeCompare(b.artifactRelPath ?? "");
        }),
      ...(record.metrics !== undefined ? { metrics: record.metrics } : {}),
    }))
    .sort((a, b) => {
      const sourceDelta = a.sourceId.localeCompare(b.sourceId);
      if (sourceDelta !== 0) return sourceDelta;
      const issueDelta = a.target.issueId.localeCompare(b.target.issueId);
      if (issueDelta !== 0) return issueDelta;
      const pathDelta = a.target.path.localeCompare(b.target.path);
      if (pathDelta !== 0) return pathDelta;
      const deviceDelta = (a.target.device ?? "").localeCompare(b.target.device ?? "");
      if (deviceDelta !== 0) return deviceDelta;
      return a.id.localeCompare(b.id);
    });
  const payload = JSON.stringify({
    policy: POLICY_ID,
    rankingVersion: RANKING_VERSION,
    accepted: normalized,
  });
  return createHash("sha256").update(payload).digest("hex");
}

function mergeEvidence(
  base: readonly MultiBenchmarkEvidenceV1[],
  extra: readonly MultiBenchmarkEvidenceV1[],
): readonly MultiBenchmarkEvidenceV1[] {
  const seen = new Set<string>();
  const merged: MultiBenchmarkEvidenceV1[] = [];
  for (const row of [...base, ...extra]) {
    const key: string = `${row.sourceRelPath}|${row.pointer}|${row.artifactRelPath ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged;
}

export function evaluateConservativeMultiBenchmarkSignals(params: {
  readonly loaded: MultiBenchmarkSignalsLoaded | undefined;
  readonly knownIssueIds: ReadonlySet<string> | readonly string[];
  readonly knownPaths: ReadonlySet<string> | readonly string[];
  readonly nowMs?: number;
  readonly maxAgeDays?: number;
}): MultiBenchmarkEvaluation | undefined {
  if (params.loaded === undefined) return undefined;
  const knownIssueIds: ReadonlySet<string> = params.knownIssueIds instanceof Set ? params.knownIssueIds : new Set(params.knownIssueIds);
  const knownPaths: ReadonlySet<string> = params.knownPaths instanceof Set ? params.knownPaths : new Set(params.knownPaths);
  const nowMs: number = params.nowMs ?? Date.now();
  const maxAgeMs: number = (params.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS) * 24 * 60 * 60 * 1000;

  const acceptedRecords: MultiBenchmarkAcceptedRecord[] = [];
  let rejected = 0;
  for (const row of params.loaded.records) {
    if (row.confidence !== "high") {
      rejected += 1;
      continue;
    }
    if (row.evidence.length === 0) {
      rejected += 1;
      continue;
    }
    if (nowMs - row.collectedAtMs > maxAgeMs) {
      rejected += 1;
      continue;
    }
    if (!knownIssueIds.has(row.target.issueId) || !knownPaths.has(row.target.path)) {
      rejected += 1;
      continue;
    }
    acceptedRecords.push(row);
  }

  return {
    acceptedRecords,
    metadata: {
      enabled: true,
      inputFiles: params.loaded.inputFiles,
      sources: params.loaded.sourceIds,
      accepted: acceptedRecords.length,
      rejected,
      digest: digestAcceptedRecords(acceptedRecords),
      policy: POLICY_ID,
      rankingVersion: RANKING_VERSION,
    },
  };
}

export function matchAcceptedMultiBenchmarkSignals(params: {
  readonly accepted: readonly MultiBenchmarkAcceptedRecord[];
  readonly issueId: string;
  readonly allowedPaths?: readonly string[];
}): MultiBenchmarkMatchResult {
  const pathSet: ReadonlySet<string> | undefined = Array.isArray(params.allowedPaths) ? new Set(params.allowedPaths) : undefined;
  const sourceTotals: MultiBenchmarkSourceBoosts = {
    "accessibility-extended": 0,
    "security-baseline": 0,
    "seo-technical": 0,
    "reliability-slo": 0,
    "cross-browser-parity": 0,
  };
  let evidence: readonly MultiBenchmarkEvidenceV1[] = [];

  for (const row of params.accepted) {
    if (row.target.issueId !== params.issueId) continue;
    if (pathSet !== undefined && !pathSet.has(row.target.path)) continue;
    const baseBoost: number = SOURCE_BASE_BOOST[row.sourceId];
    sourceTotals[row.sourceId] = clampBoost(sourceTotals[row.sourceId] + baseBoost, MAX_SOURCE_BOOST);
    evidence = mergeEvidence(evidence, row.evidence);
  }

  const totalBoost: number = clampBoost(
    sourceTotals["accessibility-extended"]
      + sourceTotals["security-baseline"]
      + sourceTotals["seo-technical"]
      + sourceTotals["reliability-slo"]
      + sourceTotals["cross-browser-parity"],
    MAX_TOTAL_BOOST,
  );
  return {
    totalBoost,
    sourceBoosts: sourceTotals,
    evidence,
  };
}

export function applyBenchmarkBoostToSuggestions(params: {
  readonly suggestions: readonly SuggestionV3[];
  readonly accepted: readonly MultiBenchmarkAcceptedRecord[];
}): readonly SuggestionV3[] {
  const updated: SuggestionV3[] = params.suggestions.map((suggestion) => {
    const issueIdMatch: RegExpMatchArray | null = suggestion.id.match(/^sugg-(.+)-\d+$/);
    const issueId: string | undefined = issueIdMatch && issueIdMatch.length > 1 ? issueIdMatch[1] : undefined;
    if (!issueId) return suggestion;
    const matched = matchAcceptedMultiBenchmarkSignals({
      accepted: params.accepted,
      issueId,
    });
    if (matched.totalBoost <= 0) return suggestion;
    return {
      ...suggestion,
      priorityScore: Math.round(suggestion.priorityScore * (1 + matched.totalBoost)),
      evidence: mergeEvidence(suggestion.evidence, matched.evidence),
    };
  });
  return [...updated].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.id.localeCompare(b.id);
  });
}
