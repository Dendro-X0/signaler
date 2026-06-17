import { dirname } from "node:path";
import type { ApexConfig, ApexPageConfig } from "../core/types.js";
import { prepareLabAuth } from "../lab-auth/resolve-auth-session.js";
import { probePagesWithSessions } from "../lab-auth/probe-pages.js";
import {
  probeAppHealth,
  type RoutePreflightResult,
  type RoutePreflightStatus,
} from "../runners/lighthouse/route-preflight.js";

export type ExcludedPageAtInit = {
  readonly label: string;
  readonly path: string;
  readonly status: Exclude<RoutePreflightStatus, "ok">;
  readonly reason: string;
};

export type PartitionAuditablePagesResult = {
  readonly auditable: readonly ApexPageConfig[];
  readonly excluded: readonly ExcludedPageAtInit[];
};

export function partitionPagesByPreflight(
  pages: readonly ApexPageConfig[],
  preflightByPath: ReadonlyMap<string, RoutePreflightResult>,
): PartitionAuditablePagesResult {
  const auditable: ApexPageConfig[] = [];
  const excluded: ExcludedPageAtInit[] = [];
  for (const page of pages) {
    const preflight = preflightByPath.get(page.path);
    if (!preflight || preflight.status === "ok") {
      auditable.push(page);
      continue;
    }
    excluded.push({
      label: page.label,
      path: page.path,
      status: preflight.status,
      reason: preflight.reason ?? preflight.status,
    });
  }
  return { auditable, excluded };
}

export function countExcludedCombos(
  pages: readonly ApexPageConfig[],
  excluded: readonly ExcludedPageAtInit[],
): number {
  const excludedPaths = new Set(excluded.map((entry) => entry.path));
  return pages.reduce((sum, page) => {
    if (!excludedPaths.has(page.path)) {
      return sum;
    }
    return sum + page.devices.length;
  }, 0);
}

export async function probePagesForAuditability(params: {
  readonly config: ApexConfig;
  readonly configDir: string;
  readonly labAuthPlan: Awaited<ReturnType<typeof prepareLabAuth>>;
  readonly pages: readonly ApexPageConfig[];
}): Promise<Map<string, RoutePreflightResult>> {
  if (params.config.routePreflight === false || params.pages.length === 0) {
    return new Map();
  }
  return probePagesWithSessions({
    baseUrl: params.config.baseUrl,
    pages: params.pages,
    query: params.config.query,
    plan: params.labAuthPlan,
    concurrency: 12,
  });
}

export async function resolveAuditablePagesAtInit(params: {
  readonly config: ApexConfig;
  readonly configPath: string;
  readonly labAuthFlag?: boolean;
  readonly pages: readonly ApexPageConfig[];
}): Promise<PartitionAuditablePagesResult & { readonly preflightByPath: Map<string, RoutePreflightResult> }> {
  const configDir = dirname(params.configPath);
  const labAuthPlan = await prepareLabAuth({
    config: params.config,
    configDir,
    labAuthFlag: params.labAuthFlag,
    pages: params.pages,
  });
  const preflightByPath = await probePagesForAuditability({
    config: params.config,
    configDir,
    labAuthPlan,
    pages: params.pages,
  });
  const partition = partitionPagesByPreflight(params.pages, preflightByPath);
  return { ...partition, preflightByPath };
}

export async function filterAuditablePagesAtDiscover(params: {
  readonly config: ApexConfig;
  readonly configPath: string;
  readonly labAuthFlag?: boolean;
}): Promise<PartitionAuditablePagesResult & { readonly probed: boolean }> {
  const health = await probeAppHealth({ baseUrl: params.config.baseUrl });
  if (!health.ok) {
    return { auditable: params.config.pages, excluded: [], probed: false };
  }
  try {
    const resolved = await resolveAuditablePagesAtInit({
      config: params.config,
      configPath: params.configPath,
      labAuthFlag: params.labAuthFlag,
      pages: params.config.pages,
    });
    return {
      auditable: resolved.auditable,
      excluded: resolved.excluded,
      probed: true,
    };
  } catch {
    return { auditable: params.config.pages, excluded: [], probed: false };
  }
}

export function formatExcludedAtInitLog(excluded: readonly ExcludedPageAtInit[]): readonly string[] {
  return excluded.slice(0, 8).map((entry) => {
    const tag = entry.status === "auth-wall" ? "auth" : "err";
    return `  [${tag}] ${entry.path}${entry.reason ? ` — ${entry.reason}` : ""}`;
  });
}
