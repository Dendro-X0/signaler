import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  ExternalSignalAdapterIdV1,
  ExternalSignalEvidenceV1,
  ExternalSignalMetricsV1,
  ExternalSignalsFileV1,
  ExternalSignalsMetadataV1,
} from "./contracts/external-signals-v1.js";
import type { SuggestionV3 } from "./contracts/v3/suggestions-v3.js";

const DEFAULT_EXTERNAL_WEIGHT = 0.1;
const MAX_EXTERNAL_WEIGHT = 0.3;
const DEFAULT_MAX_AGE_DAYS = 30;
const POLICY_ID: ExternalSignalsMetadataV1["policy"] = "v1-conservative-high-30d-route-issue";

export function buildDefaultExternalSignalsMetadata(): ExternalSignalsMetadataV1 {
  return {
    enabled: false,
    inputFiles: [],
    accepted: 0,
    rejected: 0,
    digest: null,
    policy: POLICY_ID,
  };
}

export type ExternalSignalsLoadedRecord = {
  readonly adapterId: ExternalSignalAdapterIdV1;
  readonly collectedAt: string;
  readonly collectedAtMs: number;
  readonly id: string;
  readonly target: {
    readonly issueId: string;
    readonly path: string;
    readonly device?: "mobile" | "desktop";
  };
  readonly confidence: "high" | "medium" | "low";
  readonly weight?: number;
  readonly evidence: readonly ExternalSignalEvidenceV1[];
  readonly metrics?: ExternalSignalMetricsV1;
};

export type ExternalSignalsLoaded = {
  readonly inputFiles: readonly string[];
  readonly records: readonly ExternalSignalsLoadedRecord[];
};

export type ExternalSignalAcceptedRecord = {
  readonly adapterId: ExternalSignalAdapterIdV1;
  readonly collectedAt: string;
  readonly collectedAtMs: number;
  readonly id: string;
  readonly target: {
    readonly issueId: string;
    readonly path: string;
    readonly device?: "mobile" | "desktop";
  };
  readonly weight: number;
  readonly evidence: readonly ExternalSignalEvidenceV1[];
  readonly metrics?: ExternalSignalMetricsV1;
};

export type ExternalSignalsEvaluation = {
  readonly acceptedRecords: readonly ExternalSignalAcceptedRecord[];
  readonly metadata: ExternalSignalsMetadataV1;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function parseEvidenceRows(value: unknown): readonly ExternalSignalEvidenceV1[] {
  if (!Array.isArray(value)) {
    throw new Error("Invalid external signal evidence: expected array.");
  }
  const rows: ExternalSignalEvidenceV1[] = [];
  for (const row of value) {
    if (!isRecord(row)) {
      throw new Error("Invalid external signal evidence row: expected object.");
    }
    if (!isNonEmptyString(row.sourceRelPath) || !isNonEmptyString(row.pointer)) {
      throw new Error("Invalid external signal evidence row: sourceRelPath and pointer are required.");
    }
    rows.push({
      sourceRelPath: row.sourceRelPath,
      pointer: row.pointer,
      ...(isNonEmptyString(row.artifactRelPath) ? { artifactRelPath: row.artifactRelPath } : {}),
    });
  }
  return rows;
}

function parseMetrics(value: unknown): ExternalSignalMetricsV1 | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new Error("Invalid external signal metrics: expected object.");
  }
  const parsed: ExternalSignalMetricsV1 = {
    ...(isFiniteNumber(value.lcpMsP75) ? { lcpMsP75: value.lcpMsP75 } : {}),
    ...(isFiniteNumber(value.inpMsP75) ? { inpMsP75: value.inpMsP75 } : {}),
    ...(isFiniteNumber(value.clsP75) ? { clsP75: value.clsP75 } : {}),
    ...(isFiniteNumber(value.ttfbMsP75) ? { ttfbMsP75: value.ttfbMsP75 } : {}),
  };
  if (Object.keys(parsed).length === 0 && Object.keys(value).length > 0) {
    throw new Error("Invalid external signal metrics values.");
  }
  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseExternalSignalsFile(raw: unknown): ExternalSignalsFileV1 {
  if (!isRecord(raw)) {
    throw new Error("Invalid external signals payload: expected object.");
  }
  if (raw.schemaVersion !== 1) {
    throw new Error("Invalid external signals payload: schemaVersion must be 1.");
  }
  if (!Array.isArray(raw.adapters)) {
    throw new Error("Invalid external signals payload: adapters must be an array.");
  }
  for (const adapter of raw.adapters) {
    if (!isRecord(adapter)) {
      throw new Error("Invalid external adapter entry: expected object.");
    }
    if (adapter.adapterId !== "psi" && adapter.adapterId !== "crux" && adapter.adapterId !== "rum" && adapter.adapterId !== "wpt" && adapter.adapterId !== "custom") {
      throw new Error("Invalid external adapter id.");
    }
    if (!isNonEmptyString(adapter.collectedAt) || !Number.isFinite(Date.parse(adapter.collectedAt))) {
      throw new Error("Invalid external adapter collectedAt timestamp.");
    }
    if (!Array.isArray(adapter.records)) {
      throw new Error("Invalid external adapter records: expected array.");
    }
    for (const record of adapter.records) {
      if (!isRecord(record)) {
        throw new Error("Invalid external adapter record: expected object.");
      }
      if (!isNonEmptyString(record.id)) {
        throw new Error("Invalid external adapter record id.");
      }
      if (!isRecord(record.target)) {
        throw new Error("Invalid external adapter record target.");
      }
      if (!isNonEmptyString(record.target.issueId) || !isNonEmptyString(record.target.path)) {
        throw new Error("Invalid external adapter record target fields.");
      }
      if (record.target.device !== undefined && record.target.device !== "mobile" && record.target.device !== "desktop") {
        throw new Error("Invalid external adapter record target.device.");
      }
      if (record.confidence !== "high" && record.confidence !== "medium" && record.confidence !== "low") {
        throw new Error("Invalid external adapter record confidence.");
      }
      if (record.weight !== undefined && !isFiniteNumber(record.weight)) {
        throw new Error("Invalid external adapter record weight.");
      }
      parseEvidenceRows(record.evidence);
      parseMetrics(record.metrics);
    }
  }
  return raw as unknown as ExternalSignalsFileV1;
}

export async function loadExternalSignalsFromFiles(paths: readonly string[]): Promise<ExternalSignalsLoaded | undefined> {
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

  const records: ExternalSignalsLoadedRecord[] = [];
  for (const path of dedupedPaths) {
    let parsedRaw: unknown;
    try {
      const rawText: string = await readFile(path, "utf8");
      parsedRaw = JSON.parse(rawText) as unknown;
    } catch (error: unknown) {
      throw new Error(`Failed to load external signals file: ${path} (${error instanceof Error ? error.message : String(error)})`);
    }
    let parsed: ExternalSignalsFileV1;
    try {
      parsed = parseExternalSignalsFile(parsedRaw);
    } catch (error: unknown) {
      throw new Error(`Invalid external signals file: ${path} (${error instanceof Error ? error.message : String(error)})`);
    }

    for (const adapter of parsed.adapters) {
      const collectedAtMs: number = Date.parse(adapter.collectedAt);
      for (const row of adapter.records) {
        records.push({
          adapterId: adapter.adapterId,
          collectedAt: adapter.collectedAt,
          collectedAtMs,
          id: row.id,
          target: {
            issueId: row.target.issueId,
            path: row.target.path,
            ...(row.target.device !== undefined ? { device: row.target.device } : {}),
          },
          confidence: row.confidence,
          ...(typeof row.weight === "number" ? { weight: row.weight } : {}),
          evidence: parseEvidenceRows(row.evidence),
          ...(row.metrics !== undefined ? { metrics: parseMetrics(row.metrics) } : {}),
        });
      }
    }
  }

  return {
    inputFiles: dedupedPaths,
    records,
  };
}

function clampWeight(value: number | undefined): number {
  const resolved = typeof value === "number" ? value : DEFAULT_EXTERNAL_WEIGHT;
  if (!Number.isFinite(resolved)) return DEFAULT_EXTERNAL_WEIGHT;
  if (resolved < 0) return 0;
  if (resolved > MAX_EXTERNAL_WEIGHT) return MAX_EXTERNAL_WEIGHT;
  return resolved;
}

function digestAcceptedRecords(records: readonly ExternalSignalAcceptedRecord[]): string {
  const normalized = [...records]
    .map((record) => ({
      adapterId: record.adapterId,
      collectedAt: record.collectedAt,
      id: record.id,
      target: {
        issueId: record.target.issueId,
        path: record.target.path,
        ...(record.target.device !== undefined ? { device: record.target.device } : {}),
      },
      weight: record.weight,
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
      const adapterDelta = a.adapterId.localeCompare(b.adapterId);
      if (adapterDelta !== 0) return adapterDelta;
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
    accepted: normalized,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function evaluateConservativeExternalSignals(params: {
  readonly loaded: ExternalSignalsLoaded | undefined;
  readonly knownIssueIds: ReadonlySet<string> | readonly string[];
  readonly knownPaths: ReadonlySet<string> | readonly string[];
  readonly nowMs?: number;
  readonly maxAgeDays?: number;
}): ExternalSignalsEvaluation | undefined {
  if (params.loaded === undefined) return undefined;
  const knownIssueIds: ReadonlySet<string> = params.knownIssueIds instanceof Set ? params.knownIssueIds : new Set(params.knownIssueIds);
  const knownPaths: ReadonlySet<string> = params.knownPaths instanceof Set ? params.knownPaths : new Set(params.knownPaths);
  const nowMs: number = params.nowMs ?? Date.now();
  const maxAgeMs: number = (params.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS) * 24 * 60 * 60 * 1000;

  const acceptedRecords: ExternalSignalAcceptedRecord[] = [];
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
    acceptedRecords.push({
      adapterId: row.adapterId,
      collectedAt: row.collectedAt,
      collectedAtMs: row.collectedAtMs,
      id: row.id,
      target: row.target,
      weight: clampWeight(row.weight),
      evidence: row.evidence,
      ...(row.metrics !== undefined ? { metrics: row.metrics } : {}),
    });
  }

  return {
    acceptedRecords,
    metadata: {
      enabled: true,
      inputFiles: params.loaded.inputFiles,
      accepted: acceptedRecords.length,
      rejected,
      digest: digestAcceptedRecords(acceptedRecords),
      policy: POLICY_ID,
    },
  };
}

export function extractIssueIdFromSuggestionId(suggestionId: string): string | undefined {
  const match: RegExpMatchArray | null = suggestionId.match(/^sugg-(.+)-\d+$/);
  if (!match || match.length < 2) return undefined;
  return match[1];
}

function mergeEvidence(
  base: readonly ExternalSignalEvidenceV1[],
  extra: readonly ExternalSignalEvidenceV1[],
): readonly ExternalSignalEvidenceV1[] {
  const seen = new Set<string>();
  const merged: ExternalSignalEvidenceV1[] = [];
  for (const row of [...base, ...extra]) {
    const key: string = `${row.sourceRelPath}|${row.pointer}|${row.artifactRelPath ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged;
}

export function matchAcceptedExternalSignals(params: {
  readonly accepted: readonly ExternalSignalAcceptedRecord[];
  readonly issueId: string;
  readonly allowedPaths?: readonly string[];
}): {
  readonly totalBoost: number;
  readonly evidence: readonly ExternalSignalEvidenceV1[];
} {
  const pathSet: ReadonlySet<string> | undefined = Array.isArray(params.allowedPaths) ? new Set(params.allowedPaths) : undefined;
  let totalBoost = 0;
  let evidence: readonly ExternalSignalEvidenceV1[] = [];
  for (const row of params.accepted) {
    if (row.target.issueId !== params.issueId) continue;
    if (pathSet !== undefined && !pathSet.has(row.target.path)) continue;
    totalBoost += row.weight;
    evidence = mergeEvidence(evidence, row.evidence);
  }
  return {
    totalBoost: Math.min(MAX_EXTERNAL_WEIGHT, Math.max(0, totalBoost)),
    evidence,
  };
}

export function applyExternalBoostToSuggestions(params: {
  readonly suggestions: readonly SuggestionV3[];
  readonly accepted: readonly ExternalSignalAcceptedRecord[];
}): readonly SuggestionV3[] {
  const updated: SuggestionV3[] = params.suggestions.map((suggestion) => {
    const issueId: string | undefined = extractIssueIdFromSuggestionId(suggestion.id);
    if (!issueId) return suggestion;
    const matched = matchAcceptedExternalSignals({
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
