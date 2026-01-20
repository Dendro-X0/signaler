import type { ApexDevice, MetricValues, RunMeta, RunSummary } from "./core/types.js";
import type { EngineExportBundle } from "./engine-export-bundle-schema.js";
import { stripUrl } from "./strip-url.js";

type ExportBundleMeta = EngineExportBundle["meta"];
type ExportBundle = EngineExportBundle;

function getFileNameFromPath(input: string): string {
  const normalized: string = input.replace(/\\/g, "/");
  const parts: readonly string[] = normalized.split("/").filter((p) => p.length > 0);
  return parts.length === 0 ? "" : (parts[parts.length - 1] ?? "");
}

function buildExportMeta(meta: RunMeta): ExportBundleMeta {
  const configFileName: string = getFileNameFromPath(meta.configPath);
  return {
    configFileName,
    buildId: meta.buildId,
    incremental: meta.incremental,
    resolvedParallel: meta.resolvedParallel,
    totalSteps: meta.totalSteps,
    comboCount: meta.comboCount,
    executedCombos: meta.executedCombos,
    cachedCombos: meta.cachedCombos,
    runsPerCombo: meta.runsPerCombo,
    executedSteps: meta.executedSteps,
    cachedSteps: meta.cachedSteps,
    warmUp: meta.warmUp,
    throttlingMethod: meta.throttlingMethod,
    cpuSlowdownMultiplier: meta.cpuSlowdownMultiplier,
    startedAt: meta.startedAt,
    completedAt: meta.completedAt,
    elapsedMs: meta.elapsedMs,
    averageStepMs: meta.averageStepMs,
  };
}

/**
 * Build a shareable export payload from a run summary.
 */
export function buildExportBundle(summary: RunSummary): ExportBundle {
  const generatedAt: string = new Date().toISOString();
  const results: ExportBundle["results"] = summary.results.map((r) => {
    return {
      label: r.label,
      path: r.path,
      device: r.device,
      url: stripUrl(r.url),
      scores: r.scores,
      metrics: r.metrics,
      runtimeErrorMessage: r.runtimeErrorMessage,
    };
  });
  const meta: ExportBundleMeta = buildExportMeta(summary.meta);
  return { schemaVersion: 1, generatedAt, meta, results };
}
