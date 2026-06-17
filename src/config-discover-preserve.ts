import type { ApexConfig } from "./core/types.js";

/** Fields discover must not wipe when rewriting `signaler.config.json`. */
const PRESERVED_DISCOVER_FIELDS: readonly (keyof ApexConfig)[] = [
  "serveEnv",
  "auth",
  "routes",
  "qualityGate",
  "baselineCompare",
  "qualityPack",
  "incrementalSkip",
  "perfIncludeYellow",
  "gitIgnoreSignalerDir",
  "buildId",
  "parallel",
  "warmUp",
  "throttlingMethod",
  "cpuSlowdownMultiplier",
  "sessionIsolation",
  "throughputBackoff",
  "logLevel",
  "auditTimeoutMs",
  "chromePort",
  "query",
] as const;

/**
 * Merge operator-tuned config (auth, serve env, gates) into a freshly discovered config.
 */
export function mergeDiscoveredConfigWithPreserved(
  discovered: ApexConfig,
  preserved: ApexConfig | undefined,
): ApexConfig {
  if (!preserved) {
    return discovered;
  }
  const overlay: Partial<ApexConfig> = {};
  for (const key of PRESERVED_DISCOVER_FIELDS) {
    const value = preserved[key];
    if (value !== undefined) {
      (overlay as Record<string, unknown>)[key] = value;
    }
  }
  return { ...discovered, ...overlay };
}
