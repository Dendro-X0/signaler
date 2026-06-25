import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { detectRoutesWithRust } from "../../rust/discovery-adapter.js";
import {
  resolveConfiguredPortHints,
} from "./local-server-discovery.js";
import { inferAuditServeEnv } from "./infer-audit-serve-env.js";
import { probeUrlListening, probeUrlReachable } from "../serve/url-probe.js";
import { resolveNextAppRoot } from "../serve/resolve-serve-plan.js";

export type ExploreRoute = {
  readonly path: string;
  readonly label: string;
  readonly source: string;
};

export type ExploreRunningServer = {
  readonly baseUrl: string;
  readonly port: number;
  readonly healthy: boolean;
  readonly source: "configured" | "scan";
};

export type RepoExploreManifest = {
  readonly schemaVersion: 1;
  readonly status: "ok" | "error";
  readonly projectRoot: string;
  readonly nextAppRoot?: string;
  readonly detectorId?: string;
  readonly routes: readonly ExploreRoute[];
  readonly portHints: readonly number[];
  readonly runningServers: readonly ExploreRunningServer[];
  readonly recommendAuditBypass: boolean;
  readonly recommendedBaseUrl?: string;
  readonly elapsedMs: number;
  readonly message?: string;
};

export async function runRepoExplore(params: {
  readonly projectRoot: string;
  readonly routeLimit?: number;
  readonly preferredPort?: number;
  readonly extraPortHints?: readonly number[];
}): Promise<RepoExploreManifest> {
  const started = Date.now();
  const projectRoot = resolve(params.projectRoot);

  let nextAppRoot: string | undefined;
  try {
    nextAppRoot = await resolveNextAppRoot(projectRoot);
  } catch {
    nextAppRoot = undefined;
  }

  const portHints = [
    ...new Set([
      ...(await resolveConfiguredPortHints(projectRoot)),
      ...(params.extraPortHints ?? []),
    ]),
  ].sort((a, b) => a - b);
  const runningServers: ExploreRunningServer[] = [];

  for (const port of portHints) {
    const baseUrl = `http://127.0.0.1:${port}`;
    if (!(await probeUrlListening(`${baseUrl}/`, 400))) continue;
    const healthy = await probeUrlReachable(`${baseUrl}/`, 800);
    runningServers.push({
      baseUrl,
      port,
      healthy,
      source:
        typeof params.preferredPort === "number" && port === params.preferredPort
          ? "configured"
          : "scan",
    });
  }

  const rustDiscovery = await detectRoutesWithRust({
    projectRoot: nextAppRoot ?? projectRoot,
    limit: params.routeLimit ?? 200,
  });

  const routes: ExploreRoute[] = rustDiscovery.used
    ? (rustDiscovery.routes ?? []).map((r) => ({
        path: r.path,
        label: r.label,
        source: r.source,
      }))
    : [];

  const inferred = await inferAuditServeEnv(projectRoot);
  const healthyServer = runningServers.find((s) => s.healthy);
  const anyServer = runningServers[0];

  return {
    schemaVersion: 1,
    status: "ok",
    projectRoot,
    nextAppRoot,
    detectorId: rustDiscovery.detectorId,
    routes,
    portHints,
    runningServers,
    recommendAuditBypass: Boolean(inferred && Object.keys(inferred).length > 0),
    recommendedBaseUrl: healthyServer?.baseUrl ?? anyServer?.baseUrl,
    elapsedMs: Date.now() - started,
    message: rustDiscovery.used ? undefined : rustDiscovery.fallbackReason,
  };
}

export async function writeExploreManifest(params: {
  readonly outputDir: string;
  readonly manifest: RepoExploreManifest;
}): Promise<string> {
  const dir = resolve(params.outputDir);
  await mkdir(dir, { recursive: true });
  const path = join(dir, "explore.json");
  await writeFile(path, `${JSON.stringify(params.manifest, null, 2)}\n`, "utf8");
  return path;
}

export async function readExploreManifest(outputDir: string): Promise<RepoExploreManifest | undefined> {
  try {
    const raw = await readFile(join(resolve(outputDir), "explore.json"), "utf8");
    return JSON.parse(raw) as RepoExploreManifest;
  } catch {
    return undefined;
  }
}

export function pickBaseUrlFromExplore(
  manifest: RepoExploreManifest,
  requested?: string,
): string | undefined {
  if (requested) return requested;
  return manifest.recommendedBaseUrl;
}
