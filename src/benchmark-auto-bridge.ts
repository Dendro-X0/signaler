import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AxeSummary } from "./accessibility-types.js";
import {
  buildAccessibilityBenchmarkSignalsFromSummary,
  resolveAccessibilitySummarySourcePath,
} from "./accessibility-benchmark-signals.js";
import { resolveArtifactPath } from "./artifact-layout/index.js";
import type { MultiBenchmarkSourceIdV1 } from "./engine-contracts/signals/index.js";
import { isSuggestionsV3 } from "./engine-contracts/artifacts/v3/index.js";
import {
  buildReliabilityBenchmarkSignalsFromHealthReport,
  resolveReliabilityHealthSourcePath,
} from "./reliability-benchmark-signals.js";
import {
  buildSecurityBenchmarkSignalsFromHeadersReport,
  deriveIssueMappingFromIssuesJson as deriveSecurityIssueMapping,
  resolveSecurityHeadersSourcePath,
} from "./security-benchmark-signals.js";
import {
  buildSeoBenchmarkSignalsFromArtifacts,
  resolveSeoLinksSourcePath,
  resolveSeoResultsSourcePath,
} from "./seo-benchmark-signals.js";
import type { MultiBenchmarkSignalsFileV1 } from "./engine-contracts/signals/index.js";

export type BenchmarkAutoBridgeSkip = {
  readonly family: MultiBenchmarkSourceIdV1 | "issue-mapping";
  readonly reason: string;
};

export type BenchmarkAutoBridgeResult = {
  readonly bridgeDir: string;
  readonly signalPaths: readonly string[];
  readonly families: readonly MultiBenchmarkSourceIdV1[];
  readonly skipped: readonly BenchmarkAutoBridgeSkip[];
};

type BenchmarkIssueMapping = {
  readonly defaultIssueId?: string;
  readonly routeIssueIdByPath: Readonly<Record<string, string>>;
};

const BRIDGE_DIR = "runners/benchmark-bridge";

const BRIDGE_FILES: Readonly<Record<MultiBenchmarkSourceIdV1, string>> = {
  "accessibility-extended": "accessibility-extended.json",
  "security-baseline": "security-baseline.json",
  "reliability-slo": "reliability-slo.json",
  "seo-technical": "seo-technical.json",
  "cross-browser-parity": "cross-browser-parity.json",
};

async function artifactExists(outputDir: string, id: string): Promise<boolean> {
  try {
    await stat(await resolveArtifactPath(outputDir, id));
    return true;
  } catch {
    return false;
  }
}

async function readJsonArtifact(outputDir: string, id: string): Promise<unknown> {
  const path = await resolveArtifactPath(outputDir, id);
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as unknown;
}

async function resolveBenchmarkIssueMapping(outputDir: string): Promise<BenchmarkIssueMapping> {
  for (const artifactId of ["issues", "performance-triage"] as const) {
    if (!(await artifactExists(outputDir, artifactId))) {
      continue;
    }
    const raw = await readJsonArtifact(outputDir, artifactId);
    const mapping = deriveSecurityIssueMapping(raw);
    if (mapping.defaultIssueId !== undefined || Object.keys(mapping.routeIssueIdByPath).length > 0) {
      return mapping;
    }
  }

  if (await artifactExists(outputDir, "suggestions")) {
    const raw = await readJsonArtifact(outputDir, "suggestions");
    if (isSuggestionsV3(raw) && raw.suggestions.length > 0) {
      return {
        defaultIssueId: raw.suggestions[0]?.id,
        routeIssueIdByPath: {},
      };
    }
  }

  return {
    defaultIssueId: "signaler:quality-bridge",
    routeIssueIdByPath: {},
  };
}

function recordCount(fixture: MultiBenchmarkSignalsFileV1): number {
  return fixture.sources.reduce((total, source) => total + source.records.length, 0);
}

async function writeBridgeFile(params: {
  readonly bridgeDir: string;
  readonly sourceId: MultiBenchmarkSourceIdV1;
  readonly fixture: MultiBenchmarkSignalsFileV1;
}): Promise<string | undefined> {
  if (recordCount(params.fixture) === 0) {
    return undefined;
  }
  const outPath = resolve(params.bridgeDir, BRIDGE_FILES[params.sourceId]);
  await writeFile(outPath, `${JSON.stringify(params.fixture, null, 2)}\n`, "utf8");
  return outPath;
}

/**
 * Build MultiBenchmarkSignalsFileV1 fixtures from side-runner artifacts and write
 * them under `.signaler/runners/benchmark-bridge/` for analyze `--benchmark-signals`.
 */
export async function buildAndWriteBenchmarkAutoBridge(params: {
  readonly outputDir: string;
}): Promise<BenchmarkAutoBridgeResult> {
  const outputDir = resolve(params.outputDir);
  const bridgeDir = resolve(outputDir, BRIDGE_DIR);
  await mkdir(bridgeDir, { recursive: true });

  const skipped: BenchmarkAutoBridgeSkip[] = [];
  const signalPaths: string[] = [];
  const families: MultiBenchmarkSourceIdV1[] = [];

  const issueMapping = await resolveBenchmarkIssueMapping(outputDir);
  if (issueMapping.defaultIssueId === "signaler:quality-bridge" && Object.keys(issueMapping.routeIssueIdByPath).length === 0) {
    skipped.push({
      family: "issue-mapping",
      reason: "No issues.json, performance-triage, or suggestions mapping; using fallback defaultIssueId.",
    });
  }

  if (await artifactExists(outputDir, "headers")) {
    try {
      const headersPath = await resolveArtifactPath(outputDir, "headers");
      const fixture = buildSecurityBenchmarkSignalsFromHeadersReport({
        report: await readJsonArtifact(outputDir, "headers"),
        sourceRelPath: resolveSecurityHeadersSourcePath(headersPath),
        defaultIssueId: issueMapping.defaultIssueId,
        routeIssueIdByPath: issueMapping.routeIssueIdByPath,
      });
      const written = await writeBridgeFile({ bridgeDir, sourceId: "security-baseline", fixture });
      if (written) {
        signalPaths.push(written);
        families.push("security-baseline");
      }
    } catch (error: unknown) {
      skipped.push({
        family: "security-baseline",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (await artifactExists(outputDir, "accessibility-summary")) {
    try {
      const summaryPath = await resolveArtifactPath(outputDir, "accessibility-summary");
      const fixture = buildAccessibilityBenchmarkSignalsFromSummary({
        summary: (await readJsonArtifact(outputDir, "accessibility-summary")) as AxeSummary,
        sourceRelPath: resolveAccessibilitySummarySourcePath(summaryPath),
        defaultIssueId: issueMapping.defaultIssueId,
        routeIssueIdByPath: issueMapping.routeIssueIdByPath,
      });
      const written = await writeBridgeFile({ bridgeDir, sourceId: "accessibility-extended", fixture });
      if (written) {
        signalPaths.push(written);
        families.push("accessibility-extended");
      }
    } catch (error: unknown) {
      skipped.push({
        family: "accessibility-extended",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (await artifactExists(outputDir, "health")) {
    try {
      const healthPath = await resolveArtifactPath(outputDir, "health");
      const fixture = buildReliabilityBenchmarkSignalsFromHealthReport({
        report: await readJsonArtifact(outputDir, "health"),
        sourceRelPath: resolveReliabilityHealthSourcePath(healthPath),
        defaultIssueId: issueMapping.defaultIssueId,
        routeIssueIdByPath: issueMapping.routeIssueIdByPath,
      });
      const written = await writeBridgeFile({ bridgeDir, sourceId: "reliability-slo", fixture });
      if (written) {
        signalPaths.push(written);
        families.push("reliability-slo");
      }
    } catch (error: unknown) {
      skipped.push({
        family: "reliability-slo",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (await artifactExists(outputDir, "results")) {
    try {
      const resultsPath = await resolveArtifactPath(outputDir, "results");
      const linksExists = await artifactExists(outputDir, "links");
      const fixture = buildSeoBenchmarkSignalsFromArtifacts({
        resultsReport: await readJsonArtifact(outputDir, "results"),
        linksReport: linksExists ? await readJsonArtifact(outputDir, "links") : undefined,
        sourceRelPath: resolveSeoResultsSourcePath(resultsPath),
        linksSourceRelPath: linksExists
          ? resolveSeoLinksSourcePath(await resolveArtifactPath(outputDir, "links"))
          : undefined,
        defaultIssueId: issueMapping.defaultIssueId,
        routeIssueIdByPath: issueMapping.routeIssueIdByPath,
      });
      const written = await writeBridgeFile({ bridgeDir, sourceId: "seo-technical", fixture });
      if (written) {
        signalPaths.push(written);
        families.push("seo-technical");
      }
    } catch (error: unknown) {
      skipped.push({
        family: "seo-technical",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (await artifactExists(outputDir, "cross-browser-snapshots")) {
    skipped.push({
      family: "cross-browser-parity",
      reason: "cross-browser snapshots present but auto-bridge adapter is not wired in v6A.",
    });
  }

  return {
    bridgeDir,
    signalPaths,
    families,
    skipped,
  };
}
