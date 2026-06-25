import type { ApexConfig, ApexDevice, ApexPageConfig } from "../../core/types.js";
import type { RepoExploreManifest } from "./repo-explore.js";

export type AutoConfigBaseUrlSource =
  | "cli"
  | "explore-healthy"
  | "explore-recommended"
  | "port-hint"
  | "fallback";

export type AutoConfigPlan = {
  readonly stack: string;
  readonly baseUrl: string;
  readonly baseUrlSource: AutoConfigBaseUrlSource;
  readonly serveMode: "attach";
  readonly routeCount: number;
  readonly hasRunningServer: boolean;
  readonly notes: readonly string[];
};

const DEFAULT_DEVICES: readonly ApexDevice[] = ["mobile", "desktop"];
const DEFAULT_PORT = 3000;

/**
 * Build an optimal `signaler.config.json` from an explore manifest.
 * Uses native route scan + loopback probes — stack-agnostic (Next, Nuxt, Remix, SPA, etc.).
 */
export function buildAutoConfigFromExplore(params: {
  readonly manifest: RepoExploreManifest;
  readonly baseUrlOverride?: string;
  readonly routeLimit?: number;
}): { readonly config: ApexConfig; readonly plan: AutoConfigPlan } {
  const notes: string[] = [];
  const limit = params.routeLimit ?? 200;
  const hasHealthyServer = params.manifest.runningServers.some((server) => server.healthy);
  const hasAnyServer = params.manifest.runningServers.length > 0;

  let baseUrl = params.baseUrlOverride?.replace(/\/$/, "");
  let baseUrlSource: AutoConfigBaseUrlSource = "cli";

  if (!baseUrl) {
    const healthy = params.manifest.runningServers.find((server) => server.healthy);
    if (healthy) {
      baseUrl = healthy.baseUrl;
      baseUrlSource = "explore-healthy";
    } else if (params.manifest.recommendedBaseUrl) {
      baseUrl = params.manifest.recommendedBaseUrl;
      baseUrlSource = "explore-recommended";
      if (!hasHealthyServer && hasAnyServer) {
        notes.push("Loopback server responded but health check failed — verify env or use --managed-serve-reuse.");
      }
    } else {
      const port = params.manifest.portHints[0] ?? DEFAULT_PORT;
      baseUrl = `http://127.0.0.1:${port}`;
      baseUrlSource = params.manifest.portHints.length > 0 ? "port-hint" : "fallback";
      notes.push(
        `No loopback server detected yet — start your dev server, then rerun Signaler (expected ${baseUrl}).`,
      );
    }
  }

  const routeSource =
    params.manifest.routes.length > 0
      ? params.manifest.routes.slice(0, limit)
      : [{ path: "/", label: "home", source: "fallback" }];

  const pages: ApexPageConfig[] = routeSource.map((route) => ({
    path: route.path,
    label: route.label,
    devices: [...DEFAULT_DEVICES],
  }));

  const stack =
    params.manifest.detectorId ??
    (params.manifest.nextAppRoot ? "next-app" : "web-app");

  if (params.manifest.recommendAuditBypass) {
    notes.push(
      "Auth stack detected — use managed serve with lab env consent for protected routes, or configure auth.warmupUrl.",
    );
  }

  if (params.manifest.message) {
    notes.push(params.manifest.message);
  }

  const config: ApexConfig = {
    baseUrl,
    pages,
    runs: 1,
    perfIncludeYellow: false,
    routePreflight: true,
    serve: {
      mode: "attach",
      portHints: params.manifest.portHints.length > 0 ? params.manifest.portHints : undefined,
    },
  };

  return {
    config,
    plan: {
      stack,
      baseUrl,
      baseUrlSource,
      serveMode: "attach",
      routeCount: pages.length,
      hasRunningServer: hasAnyServer,
      notes,
    },
  };
}

export function formatAutoConfigSummary(plan: AutoConfigPlan): string {
  const lines = [
    `Stack: ${plan.stack}`,
    `Base URL: ${plan.baseUrl} (${plan.baseUrlSource})`,
    `Routes: ${plan.routeCount}`,
    `Serve: ${plan.serveMode}${plan.hasRunningServer ? " (loopback server detected)" : " (start dev server, then rerun)"}`,
  ];
  for (const note of plan.notes) {
    lines.push(`• ${note}`);
  }
  return lines.join("\n");
}
