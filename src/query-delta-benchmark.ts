import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveArtifactPath } from "./artifact-layout/index.js";
import type { MultiBenchmarkSourceIdV1 } from "./engine-contracts/signals/index.js";
import type { QualityPackResult } from "./quality-pack.js";
import {
  loadBenchmarkBridgeFixtures,
  summarizeBenchmarkBridgeFixtures,
  type QualityPackBenchmarkFamilyMetrics,
  type QualityPackBenchmarkFamilySummary,
} from "./quality-pack-benchmark.js";

export type QualityPackSummarySnapshot = QualityPackResult["summary"];

export type QualityPackSummaryDelta = {
  readonly headerFailures: number;
  readonly brokenLinks: number;
  readonly healthErrors: number;
  readonly consoleErrorCombos: number;
  readonly measureRuntimeErrors: number;
  readonly accessibilityCritical: number;
  readonly accessibilitySerious: number;
};

export type BenchmarkFamilyDelta = {
  readonly sourceId: MultiBenchmarkSourceIdV1;
  readonly before: { readonly recordCount: number; readonly metrics: QualityPackBenchmarkFamilyMetrics };
  readonly after: { readonly recordCount: number; readonly metrics: QualityPackBenchmarkFamilyMetrics };
  readonly delta: { readonly recordCount: number; readonly metrics: QualityPackBenchmarkFamilyMetrics };
};

export type BenchmarkSignalPlaneDelta = {
  readonly families: readonly BenchmarkFamilyDelta[];
  readonly headlines: readonly string[];
};

export type QualityPackDelta = {
  readonly before: QualityPackSummarySnapshot;
  readonly after: QualityPackSummarySnapshot;
  readonly delta: QualityPackSummaryDelta;
  readonly headlines: readonly string[];
};

const METRIC_KEYS: readonly (keyof QualityPackBenchmarkFamilyMetrics)[] = [
  "missingHeaderCount",
  "tlsConfigIssueCount",
  "cookiePolicyIssueCount",
  "mixedContentCount",
  "wcagViolationCount",
  "seriousViolationCount",
  "criticalViolationCount",
  "indexabilityIssueCount",
  "canonicalMismatchCount",
  "structuredDataErrorCount",
  "crawlabilityIssueCount",
  "highLatencyRoutes",
  "availabilityFailures",
] as const;

const FAMILY_LABELS: Readonly<Record<MultiBenchmarkSourceIdV1, string>> = {
  "security-baseline": "security",
  "accessibility-extended": "accessibility",
  "reliability-slo": "reliability",
  "seo-technical": "seo",
  "cross-browser-parity": "parity",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function subtractMetrics(
  after: QualityPackBenchmarkFamilyMetrics,
  before: QualityPackBenchmarkFamilyMetrics,
): QualityPackBenchmarkFamilyMetrics {
  const delta: Record<string, number> = {};
  for (const key of METRIC_KEYS) {
    const value = (after[key] ?? 0) - (before[key] ?? 0);
    if (value !== 0) {
      delta[key] = value;
    }
  }
  return delta as QualityPackBenchmarkFamilyMetrics;
}

function subtractSummary(after: QualityPackSummarySnapshot, before: QualityPackSummarySnapshot): QualityPackSummaryDelta {
  return {
    headerFailures: after.headerFailures - before.headerFailures,
    brokenLinks: after.brokenLinks - before.brokenLinks,
    healthErrors: after.healthErrors - before.healthErrors,
    consoleErrorCombos: after.consoleErrorCombos - before.consoleErrorCombos,
    measureRuntimeErrors: after.measureRuntimeErrors - before.measureRuntimeErrors,
    accessibilityCritical: after.accessibilityCritical - before.accessibilityCritical,
    accessibilitySerious: after.accessibilitySerious - before.accessibilitySerious,
  };
}

function emptySummary(): QualityPackSummarySnapshot {
  return {
    headerFailures: 0,
    brokenLinks: 0,
    linksDiscovered: 0,
    linksStatus: "pass",
    bundleScanned: false,
    bundleFileCount: 0,
    healthErrors: 0,
    healthOk: 0,
    consoleErrorCombos: 0,
    consoleEventCount: 0,
    measureRuntimeErrors: 0,
    accessibilityCritical: 0,
    accessibilitySerious: 0,
    accessibilityRuntimeErrors: 0,
  };
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatFamilyMetricHeadline(sourceId: MultiBenchmarkSourceIdV1, metrics: QualityPackBenchmarkFamilyMetrics): string[] {
  const label = FAMILY_LABELS[sourceId];
  const lines: string[] = [];
  if (metrics.missingHeaderCount !== undefined && metrics.missingHeaderCount !== 0) {
    lines.push(`${formatSigned(metrics.missingHeaderCount)} ${label} missing-header metric(s)`);
  }
  if (metrics.criticalViolationCount !== undefined && metrics.criticalViolationCount !== 0) {
    lines.push(`${formatSigned(metrics.criticalViolationCount)} ${label} critical violation(s)`);
  }
  if (metrics.seriousViolationCount !== undefined && metrics.seriousViolationCount !== 0) {
    lines.push(`${formatSigned(metrics.seriousViolationCount)} ${label} serious violation(s)`);
  }
  if (metrics.indexabilityIssueCount !== undefined && metrics.indexabilityIssueCount !== 0) {
    lines.push(`${formatSigned(metrics.indexabilityIssueCount)} ${label} indexability issue(s)`);
  }
  if (metrics.crawlabilityIssueCount !== undefined && metrics.crawlabilityIssueCount !== 0) {
    lines.push(`${formatSigned(metrics.crawlabilityIssueCount)} ${label} crawlability issue(s)`);
  }
  if (metrics.highLatencyRoutes !== undefined && metrics.highLatencyRoutes !== 0) {
    lines.push(`${formatSigned(metrics.highLatencyRoutes)} ${label} high-latency route(s)`);
  }
  if (metrics.availabilityFailures !== undefined && metrics.availabilityFailures !== 0) {
    lines.push(`${formatSigned(metrics.availabilityFailures)} ${label} availability failure(s)`);
  }
  return lines;
}

export function buildBenchmarkFamilyHeadlines(families: readonly BenchmarkFamilyDelta[]): readonly string[] {
  const headlines: string[] = [];
  for (const family of families) {
    if (family.delta.recordCount !== 0) {
      headlines.push(
        `${formatSigned(family.delta.recordCount)} ${FAMILY_LABELS[family.sourceId]} benchmark record(s)`,
      );
    }
    headlines.push(...formatFamilyMetricHeadline(family.sourceId, family.delta.metrics));
  }
  return headlines;
}

export function buildQualityPackHeadlines(delta: QualityPackSummaryDelta): readonly string[] {
  const headlines: string[] = [];
  if (delta.headerFailures !== 0) {
    headlines.push(`${formatSigned(delta.headerFailures)} header failure(s)`);
  }
  if (delta.brokenLinks !== 0) {
    headlines.push(`${formatSigned(delta.brokenLinks)} broken link(s)`);
  }
  if (delta.healthErrors !== 0) {
    headlines.push(`${formatSigned(delta.healthErrors)} health error(s)`);
  }
  if (delta.consoleErrorCombos !== 0) {
    headlines.push(`${formatSigned(delta.consoleErrorCombos)} console error combo(s)`);
  }
  if (delta.accessibilityCritical !== 0) {
    headlines.push(`${formatSigned(delta.accessibilityCritical)} accessibility critical violation(s)`);
  }
  if (delta.accessibilitySerious !== 0) {
    headlines.push(`${formatSigned(delta.accessibilitySerious)} accessibility serious violation(s)`);
  }
  return headlines;
}

async function loadQualityPack(outputDir: string): Promise<QualityPackResult | undefined> {
  try {
    const path = await resolveArtifactPath(outputDir, "quality-pack");
    const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
    if (!isRecord(raw) || raw.schemaVersion !== 1 || !isRecord(raw.summary)) {
      return undefined;
    }
    return raw as unknown as QualityPackResult;
  } catch {
    return undefined;
  }
}

async function loadBenchmarkFamilies(outputDir: string): Promise<readonly QualityPackBenchmarkFamilySummary[]> {
  const pack = await loadQualityPack(outputDir);
  if (pack?.benchmarkSignals?.families !== undefined && pack.benchmarkSignals.families.length > 0) {
    return pack.benchmarkSignals.families;
  }
  const fixtures = await loadBenchmarkBridgeFixtures(outputDir);
  if (fixtures.length === 0) {
    return [];
  }
  return summarizeBenchmarkBridgeFixtures({ fixtures });
}

function familyMap(
  families: readonly QualityPackBenchmarkFamilySummary[],
): Map<MultiBenchmarkSourceIdV1, QualityPackBenchmarkFamilySummary> {
  return new Map(families.map((family) => [family.sourceId, family]));
}

export function buildBenchmarkFamilyDeltas(params: {
  readonly before: readonly QualityPackBenchmarkFamilySummary[];
  readonly after: readonly QualityPackBenchmarkFamilySummary[];
}): BenchmarkSignalPlaneDelta {
  const beforeMap = familyMap(params.before);
  const afterMap = familyMap(params.after);
  const sourceIds = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].sort();
  const families: BenchmarkFamilyDelta[] = [];

  for (const sourceId of sourceIds) {
    const beforeFamily = beforeMap.get(sourceId);
    const afterFamily = afterMap.get(sourceId);
    const beforeMetrics = beforeFamily?.metrics ?? {};
    const afterMetrics = afterFamily?.metrics ?? {};
    const beforeCount = beforeFamily?.recordCount ?? 0;
    const afterCount = afterFamily?.recordCount ?? 0;
    families.push({
      sourceId,
      before: { recordCount: beforeCount, metrics: beforeMetrics },
      after: { recordCount: afterCount, metrics: afterMetrics },
      delta: {
        recordCount: afterCount - beforeCount,
        metrics: subtractMetrics(afterMetrics, beforeMetrics),
      },
    });
  }

  return {
    families,
    headlines: buildBenchmarkFamilyHeadlines(families),
  };
}

export function buildQualityPackDelta(params: {
  readonly before: QualityPackSummarySnapshot;
  readonly after: QualityPackSummarySnapshot;
}): QualityPackDelta {
  const delta = subtractSummary(params.after, params.before);
  return {
    before: params.before,
    after: params.after,
    delta,
    headlines: buildQualityPackHeadlines(delta),
  };
}

export async function buildSignalPlaneDeltas(params: {
  readonly baselineDir: string;
  readonly compareDir: string;
}): Promise<{ readonly benchmarkSignals?: BenchmarkSignalPlaneDelta; readonly qualityPack?: QualityPackDelta }> {
  const baselineRoot = resolve(params.baselineDir);
  const compareRoot = resolve(params.compareDir);

  const [beforeFamilies, afterFamilies, beforePack, afterPack] = await Promise.all([
    loadBenchmarkFamilies(baselineRoot),
    loadBenchmarkFamilies(compareRoot),
    loadQualityPack(baselineRoot),
    loadQualityPack(compareRoot),
  ]);

  const benchmarkSignals =
    beforeFamilies.length > 0 || afterFamilies.length > 0
      ? buildBenchmarkFamilyDeltas({ before: beforeFamilies, after: afterFamilies })
      : undefined;

  const beforeSummary = beforePack?.summary ?? emptySummary();
  const afterSummary = afterPack?.summary ?? emptySummary();
  const qualityPack =
    beforePack !== undefined || afterPack !== undefined
      ? buildQualityPackDelta({ before: beforeSummary, after: afterSummary })
      : undefined;

  return { benchmarkSignals, qualityPack };
}
