import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  AccessibilityExtendedMetricsV1,
  MultiBenchmarkSignalsFileV1,
  MultiBenchmarkSourceIdV1,
  ReliabilitySloMetricsV1,
  SecurityBaselineMetricsV1,
  SeoTechnicalMetricsV1,
} from "./engine-contracts/signals/index.js";
import type { MultiBenchmarkMetadataV1 } from "./engine-contracts/signals/multi-benchmark-v1.js";
import type { QualityPackConfig } from "./core/types.js";
import type { QualityPackViolation } from "./quality-pack.js";

export type QualityPackBenchmarkFamilyMetrics = {
  readonly missingHeaderCount?: number;
  readonly tlsConfigIssueCount?: number;
  readonly cookiePolicyIssueCount?: number;
  readonly mixedContentCount?: number;
  readonly wcagViolationCount?: number;
  readonly seriousViolationCount?: number;
  readonly criticalViolationCount?: number;
  readonly indexabilityIssueCount?: number;
  readonly canonicalMismatchCount?: number;
  readonly structuredDataErrorCount?: number;
  readonly crawlabilityIssueCount?: number;
  readonly highLatencyRoutes?: number;
  readonly availabilityFailures?: number;
};

export type QualityPackBenchmarkFamilySummary = {
  readonly sourceId: MultiBenchmarkSourceIdV1;
  readonly recordCount: number;
  readonly bridgeFile: string;
  readonly metrics: QualityPackBenchmarkFamilyMetrics;
  readonly passed: boolean;
};

export type QualityPackBenchmarkSignalsSummary = {
  readonly enabled: boolean;
  readonly bridgeDir: string;
  readonly families: readonly QualityPackBenchmarkFamilySummary[];
  readonly analyzeMultiBenchmark?: Pick<
    MultiBenchmarkMetadataV1,
    "enabled" | "accepted" | "rejected" | "sources" | "digest"
  >;
};

export type QualityPackBenchmarkFamilyLimits = {
  readonly maxRecords?: number;
  readonly maxMissingHeaders?: number;
  readonly maxTlsConfigIssues?: number;
  readonly maxCriticalViolations?: number;
  readonly maxSeriousViolations?: number;
  readonly maxIndexabilityIssues?: number;
  readonly maxCrawlabilityIssues?: number;
  readonly maxHighLatencyRoutes?: number;
};

export type QualityPackBenchmarkSignalsConfig = {
  readonly enabled?: boolean;
  readonly requireBridge?: boolean;
  readonly securityBaseline?: QualityPackBenchmarkFamilyLimits;
  readonly accessibilityExtended?: QualityPackBenchmarkFamilyLimits;
  readonly reliabilitySlo?: QualityPackBenchmarkFamilyLimits;
  readonly seoTechnical?: QualityPackBenchmarkFamilyLimits;
};

export const BENCHMARK_BRIDGE_DIR = "runners/benchmark-bridge";

const BRIDGE_FILE_BY_SOURCE: Readonly<Record<MultiBenchmarkSourceIdV1, string>> = {
  "security-baseline": "security-baseline.json",
  "accessibility-extended": "accessibility-extended.json",
  "reliability-slo": "reliability-slo.json",
  "seo-technical": "seo-technical.json",
  "cross-browser-parity": "cross-browser-parity.json",
};

function sumOptional(a: number | undefined, b: number | undefined): number {
  return (a ?? 0) + (b ?? 0);
}

function aggregateSecurityMetrics(records: readonly { readonly metrics?: SecurityBaselineMetricsV1 }[]): SecurityBaselineMetricsV1 {
  let missingHeaderCount = 0;
  let tlsConfigIssueCount = 0;
  let cookiePolicyIssueCount = 0;
  let mixedContentCount = 0;
  for (const record of records) {
    missingHeaderCount = sumOptional(missingHeaderCount, record.metrics?.missingHeaderCount);
    tlsConfigIssueCount = sumOptional(tlsConfigIssueCount, record.metrics?.tlsConfigIssueCount);
    cookiePolicyIssueCount = sumOptional(cookiePolicyIssueCount, record.metrics?.cookiePolicyIssueCount);
    mixedContentCount = sumOptional(mixedContentCount, record.metrics?.mixedContentCount);
  }
  return {
    ...(missingHeaderCount > 0 ? { missingHeaderCount } : {}),
    ...(tlsConfigIssueCount > 0 ? { tlsConfigIssueCount } : {}),
    ...(cookiePolicyIssueCount > 0 ? { cookiePolicyIssueCount } : {}),
    ...(mixedContentCount > 0 ? { mixedContentCount } : {}),
  };
}

function aggregateAccessibilityMetrics(
  records: readonly { readonly metrics?: AccessibilityExtendedMetricsV1 }[],
): AccessibilityExtendedMetricsV1 {
  let wcagViolationCount = 0;
  let seriousViolationCount = 0;
  let criticalViolationCount = 0;
  for (const record of records) {
    wcagViolationCount = sumOptional(wcagViolationCount, record.metrics?.wcagViolationCount);
    seriousViolationCount = sumOptional(seriousViolationCount, record.metrics?.seriousViolationCount);
    criticalViolationCount = sumOptional(criticalViolationCount, record.metrics?.criticalViolationCount);
  }
  return {
    ...(wcagViolationCount > 0 ? { wcagViolationCount } : {}),
    ...(seriousViolationCount > 0 ? { seriousViolationCount } : {}),
    ...(criticalViolationCount > 0 ? { criticalViolationCount } : {}),
  };
}

function aggregateSeoMetrics(records: readonly { readonly metrics?: SeoTechnicalMetricsV1 }[]): SeoTechnicalMetricsV1 {
  let indexabilityIssueCount = 0;
  let canonicalMismatchCount = 0;
  let structuredDataErrorCount = 0;
  let crawlabilityIssueCount = 0;
  for (const record of records) {
    indexabilityIssueCount = sumOptional(indexabilityIssueCount, record.metrics?.indexabilityIssueCount);
    canonicalMismatchCount = sumOptional(canonicalMismatchCount, record.metrics?.canonicalMismatchCount);
    structuredDataErrorCount = sumOptional(structuredDataErrorCount, record.metrics?.structuredDataErrorCount);
    crawlabilityIssueCount = sumOptional(crawlabilityIssueCount, record.metrics?.crawlabilityIssueCount);
  }
  return {
    ...(indexabilityIssueCount > 0 ? { indexabilityIssueCount } : {}),
    ...(canonicalMismatchCount > 0 ? { canonicalMismatchCount } : {}),
    ...(structuredDataErrorCount > 0 ? { structuredDataErrorCount } : {}),
    ...(crawlabilityIssueCount > 0 ? { crawlabilityIssueCount } : {}),
  };
}

function aggregateReliabilityMetrics(
  records: readonly { readonly metrics?: ReliabilitySloMetricsV1 }[],
  highLatencyMs: number,
): { readonly highLatencyRoutes: number; readonly availabilityFailures: number } {
  let highLatencyRoutes = 0;
  let availabilityFailures = 0;
  for (const record of records) {
    const latency = record.metrics?.latencyP95Ms ?? 0;
    if (latency >= highLatencyMs) {
      highLatencyRoutes += 1;
    }
    const availability = record.metrics?.availabilityPct;
    if (typeof availability === "number" && availability < 100) {
      availabilityFailures += 1;
    }
    const errorRate = record.metrics?.errorRatePct;
    if (typeof errorRate === "number" && errorRate > 0) {
      availabilityFailures += 1;
    }
  }
  return { highLatencyRoutes, availabilityFailures };
}

function toFamilyMetrics(params: {
  readonly sourceId: MultiBenchmarkSourceIdV1;
  readonly records: readonly { readonly metrics?: unknown }[];
  readonly highLatencyMs: number;
}): QualityPackBenchmarkFamilyMetrics {
  if (params.sourceId === "security-baseline") {
    return aggregateSecurityMetrics(params.records as readonly { readonly metrics?: SecurityBaselineMetricsV1 }[]);
  }
  if (params.sourceId === "accessibility-extended") {
    return aggregateAccessibilityMetrics(params.records as readonly { readonly metrics?: AccessibilityExtendedMetricsV1 }[]);
  }
  if (params.sourceId === "seo-technical") {
    return aggregateSeoMetrics(params.records as readonly { readonly metrics?: SeoTechnicalMetricsV1 }[]);
  }
  if (params.sourceId === "reliability-slo") {
    const reliability = aggregateReliabilityMetrics(
      params.records as readonly { readonly metrics?: ReliabilitySloMetricsV1 }[],
      params.highLatencyMs,
    );
    return {
      highLatencyRoutes: reliability.highLatencyRoutes,
      availabilityFailures: reliability.availabilityFailures,
    };
  }
  return {};
}

export async function loadBenchmarkBridgeFixtures(outputDir: string): Promise<MultiBenchmarkSignalsFileV1[]> {
  const bridgeDir = resolve(outputDir, BENCHMARK_BRIDGE_DIR);
  const fixtures: MultiBenchmarkSignalsFileV1[] = [];
  for (const fileName of Object.values(BRIDGE_FILE_BY_SOURCE)) {
    try {
      const raw = await readFile(resolve(bridgeDir, fileName), "utf8");
      fixtures.push(JSON.parse(raw) as MultiBenchmarkSignalsFileV1);
    } catch {
      // optional family file
    }
  }
  return fixtures;
}

export function summarizeBenchmarkBridgeFixtures(params: {
  readonly fixtures: readonly MultiBenchmarkSignalsFileV1[];
  readonly highLatencyMs?: number;
}): readonly QualityPackBenchmarkFamilySummary[] {
  const highLatencyMs = params.highLatencyMs ?? 400;
  const summaries: QualityPackBenchmarkFamilySummary[] = [];
  for (const fixture of params.fixtures) {
    for (const source of fixture.sources) {
      summaries.push({
        sourceId: source.sourceId,
        recordCount: source.records.length,
        bridgeFile: `${BENCHMARK_BRIDGE_DIR}/${BRIDGE_FILE_BY_SOURCE[source.sourceId]}`,
        metrics: toFamilyMetrics({
          sourceId: source.sourceId,
          records: source.records,
          highLatencyMs,
        }),
        passed: true,
      });
    }
  }
  return summaries.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

function resolveFamilyLimits(params: {
  readonly sourceId: MultiBenchmarkSourceIdV1;
  readonly config?: QualityPackBenchmarkSignalsConfig;
  readonly runnerLimits: Required<
    Pick<
      QualityPackConfig,
      | "maxHeaderFailures"
      | "maxBrokenLinks"
      | "maxHealthErrors"
      | "maxAccessibilityCriticalViolations"
      | "maxAccessibilitySeriousViolations"
    >
  >;
}): QualityPackBenchmarkFamilyLimits {
  const familyKey =
    params.sourceId === "security-baseline"
      ? "securityBaseline"
      : params.sourceId === "accessibility-extended"
        ? "accessibilityExtended"
        : params.sourceId === "reliability-slo"
          ? "reliabilitySlo"
          : params.sourceId === "seo-technical"
            ? "seoTechnical"
            : undefined;
  const explicit = familyKey ? params.config?.[familyKey] : undefined;
  const inherited: QualityPackBenchmarkFamilyLimits =
    params.sourceId === "security-baseline"
      ? {
          maxRecords: params.runnerLimits.maxHeaderFailures,
          maxMissingHeaders: params.runnerLimits.maxHeaderFailures,
        }
      : params.sourceId === "accessibility-extended"
        ? {
            maxCriticalViolations: params.runnerLimits.maxAccessibilityCriticalViolations,
            maxSeriousViolations: params.runnerLimits.maxAccessibilitySeriousViolations,
          }
        : params.sourceId === "reliability-slo"
          ? { maxRecords: params.runnerLimits.maxHealthErrors }
          : params.sourceId === "seo-technical"
            ? {
                maxCrawlabilityIssues: params.runnerLimits.maxBrokenLinks,
                maxIndexabilityIssues: params.runnerLimits.maxBrokenLinks,
              }
            : {};
  return {
    maxRecords: explicit?.maxRecords ?? inherited.maxRecords,
    maxMissingHeaders: explicit?.maxMissingHeaders ?? inherited.maxMissingHeaders,
    maxTlsConfigIssues: explicit?.maxTlsConfigIssues ?? inherited.maxTlsConfigIssues,
    maxCriticalViolations: explicit?.maxCriticalViolations ?? inherited.maxCriticalViolations,
    maxSeriousViolations: explicit?.maxSeriousViolations ?? inherited.maxSeriousViolations,
    maxIndexabilityIssues: explicit?.maxIndexabilityIssues ?? inherited.maxIndexabilityIssues,
    maxCrawlabilityIssues: explicit?.maxCrawlabilityIssues ?? inherited.maxCrawlabilityIssues,
    maxHighLatencyRoutes: explicit?.maxHighLatencyRoutes ?? inherited.maxHighLatencyRoutes,
  };
}

function exceedsLimit(value: number, limit: number | undefined): boolean {
  return typeof limit === "number" && value > limit;
}

export function evaluateBenchmarkFamilyGates(params: {
  readonly families: readonly QualityPackBenchmarkFamilySummary[];
  readonly config?: QualityPackBenchmarkSignalsConfig;
  readonly runnerLimits: Required<
    Pick<
      QualityPackConfig,
      | "maxHeaderFailures"
      | "maxBrokenLinks"
      | "maxHealthErrors"
      | "maxAccessibilityCriticalViolations"
      | "maxAccessibilitySeriousViolations"
    >
  >;
}): { readonly families: readonly QualityPackBenchmarkFamilySummary[]; readonly violations: readonly QualityPackViolation[] } {
  const violations: QualityPackViolation[] = [];
  const familyFailed = new Set<MultiBenchmarkSourceIdV1>();

  const pushViolation = (sourceId: MultiBenchmarkSourceIdV1, violation: QualityPackViolation): void => {
    familyFailed.add(sourceId);
    if (!violations.some((existing) => existing.id === violation.id)) {
      violations.push(violation);
    }
  };

  const updatedFamilies = params.families.map((family) => {
    const limits = resolveFamilyLimits({
      sourceId: family.sourceId,
      config: params.config,
      runnerLimits: params.runnerLimits,
    });

    if (exceedsLimit(family.recordCount, limits.maxRecords)) {
      pushViolation(family.sourceId, {
        id: `benchmark-${family.sourceId}-max-records`,
        message: `${family.sourceId}: ${family.recordCount} benchmark signal record(s) exceed max ${limits.maxRecords}.`,
        severity: "critical",
      });
    }

    if (family.sourceId === "security-baseline") {
      const missingHeaders = family.metrics.missingHeaderCount ?? 0;
      if (exceedsLimit(missingHeaders, limits.maxMissingHeaders)) {
        pushViolation(family.sourceId, {
          id: "benchmark-security-max-missing-headers",
          message: `security-baseline: ${missingHeaders} missing header metric(s) exceed max ${limits.maxMissingHeaders}.`,
          severity: "critical",
        });
      }
      const tlsIssues = family.metrics.tlsConfigIssueCount ?? 0;
      if (exceedsLimit(tlsIssues, limits.maxTlsConfigIssues)) {
        pushViolation(family.sourceId, {
          id: "benchmark-security-max-tls-issues",
          message: `security-baseline: ${tlsIssues} TLS config issue(s) exceed max ${limits.maxTlsConfigIssues}.`,
          severity: "critical",
        });
      }
    }

    if (family.sourceId === "accessibility-extended") {
      const critical = family.metrics.criticalViolationCount ?? 0;
      if (exceedsLimit(critical, limits.maxCriticalViolations)) {
        pushViolation(family.sourceId, {
          id: "benchmark-accessibility-max-critical",
          message: `accessibility-extended: ${critical} critical violation metric(s) exceed max ${limits.maxCriticalViolations}.`,
          severity: "critical",
        });
      }
      const serious = family.metrics.seriousViolationCount ?? 0;
      if (exceedsLimit(serious, limits.maxSeriousViolations)) {
        pushViolation(family.sourceId, {
          id: "benchmark-accessibility-max-serious",
          message: `accessibility-extended: ${serious} serious violation metric(s) exceed max ${limits.maxSeriousViolations}.`,
          severity: "critical",
        });
      }
    }

    if (family.sourceId === "reliability-slo") {
      const highLatency = family.metrics.highLatencyRoutes ?? 0;
      if (exceedsLimit(highLatency, limits.maxHighLatencyRoutes)) {
        pushViolation(family.sourceId, {
          id: "benchmark-reliability-max-high-latency",
          message: `reliability-slo: ${highLatency} high-latency route(s) exceed max ${limits.maxHighLatencyRoutes}.`,
          severity: "critical",
        });
      }
    }

    if (family.sourceId === "seo-technical") {
      const indexability = family.metrics.indexabilityIssueCount ?? 0;
      if (exceedsLimit(indexability, limits.maxIndexabilityIssues)) {
        pushViolation(family.sourceId, {
          id: "benchmark-seo-max-indexability",
          message: `seo-technical: ${indexability} indexability issue(s) exceed max ${limits.maxIndexabilityIssues}.`,
          severity: "critical",
        });
      }
      const crawlability = family.metrics.crawlabilityIssueCount ?? 0;
      if (exceedsLimit(crawlability, limits.maxCrawlabilityIssues)) {
        pushViolation(family.sourceId, {
          id: "benchmark-seo-max-crawlability",
          message: `seo-technical: ${crawlability} crawlability issue(s) exceed max ${limits.maxCrawlabilityIssues}.`,
          severity: "critical",
        });
      }
    }

    return {
      ...family,
      passed: !familyFailed.has(family.sourceId),
    };
  });

  return { families: updatedFamilies, violations };
}

export function isBenchmarkSignalsEnabled(config?: QualityPackBenchmarkSignalsConfig): boolean {
  return config?.enabled !== false;
}
