import type { ApexPageConfig } from "../core/types.js";
import { probeRoute } from "../runners/lighthouse/route-preflight.js";
import type { RoutePreflightResult } from "../runners/lighthouse/route-preflight.js";
import { resolveSessionForPage } from "./resolve-auth-session.js";
import type { LabAuthPlan } from "./types.js";

export async function probePagesWithSessions(params: {
  readonly baseUrl: string;
  readonly pages: readonly ApexPageConfig[];
  readonly query?: string;
  readonly plan: LabAuthPlan;
  readonly concurrency?: number;
}): Promise<Map<string, RoutePreflightResult>> {
  const concurrency = Math.max(1, Math.min(16, params.concurrency ?? 8));
  const uniquePaths = [...new Set(params.pages.map((page) => page.path))];
  const pathToProfile = new Map(params.pages.map((page) => [page.path, page.authProfile]));
  const results = new Map<string, RoutePreflightResult>();
  let index = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const current = index;
      index += 1;
      if (current >= uniquePaths.length) {
        return;
      }
      const path = uniquePaths[current]!;
      const session = resolveSessionForPage({
        plan: params.plan,
        authProfile: pathToProfile.get(path),
      });
      const result = await probeRoute({
        baseUrl: params.baseUrl,
        path,
        query: params.query,
        cookieHeader: session.cookieHeader,
        extraHeaders: session.headers,
        protectedPathPrefixes: params.plan.protectedPathPrefixes,
      });
      results.set(path, result);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, uniquePaths.length) }, () => worker()));
  return results;
}
