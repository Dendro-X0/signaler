import { probeUrlReachable } from "../serve/url-probe.js";
import type { RepoExploreManifest } from "./repo-explore.js";
import { pickBaseUrlFromExplore } from "./repo-explore.js";

export type { ServerNotReadyParams, ServerNotReadyReason } from "./server-not-ready-guidance.js";
export { formatServerNotReadyGuidance, reportServerNotReady } from "./server-not-ready-guidance.js";

export type AttachResolution = {
  readonly baseUrl: string;
  readonly attached: boolean;
  readonly source: "explore-healthy" | "explore-any" | "requested" | "probe";
};

/**
 * Resolve base URL for attach-first audit: prefer healthy explore hit, then requested URL probe.
 */
export async function resolveAttachBaseUrl(params: {
  readonly explore: RepoExploreManifest;
  readonly requestedBaseUrl: string;
  readonly allowUnhealthy?: boolean;
}): Promise<AttachResolution | undefined> {
  const healthy = params.explore.runningServers.find((server) => server.healthy);
  if (healthy) {
    return { baseUrl: healthy.baseUrl, attached: true, source: "explore-healthy" };
  }

  const picked = pickBaseUrlFromExplore(params.explore);
  if (picked && params.allowUnhealthy) {
    const any = params.explore.runningServers.find((server) => server.baseUrl === picked);
    if (any) {
      return { baseUrl: picked, attached: true, source: "explore-any" };
    }
  }

  if (await probeUrlReachable(`${params.requestedBaseUrl.replace(/\/$/, "")}/`)) {
    return { baseUrl: params.requestedBaseUrl.replace(/\/$/, ""), attached: true, source: "probe" };
  }

  return undefined;
}
