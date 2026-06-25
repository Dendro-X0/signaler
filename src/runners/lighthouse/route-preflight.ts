import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export type RoutePreflightStatus = "ok" | "auth-wall" | "unreachable";

export type RoutePreflightResult = {
  readonly path: string;
  readonly status: RoutePreflightStatus;
  readonly httpStatus?: number;
  readonly finalPath?: string;
  readonly reason?: string;
};

const AUTH_PATH_PATTERN =
  /\/(login|signin|sign-in|auth|oauth|session|account\/login)(\/|$)/i;

const DEFAULT_PROTECTED_ROUTE_PREFIXES = ["/dashboard/", "/admin/", "/account/"] as const;

function isProtectedAppRoute(path: string, protectedPathPrefixes?: readonly string[]): boolean {
  const prefixes = protectedPathPrefixes && protectedPathPrefixes.length > 0
    ? protectedPathPrefixes
    : DEFAULT_PROTECTED_ROUTE_PREFIXES;
  return prefixes.some((prefix) => path.startsWith(prefix) || path === prefix.replace(/\/$/, ""));
}

const SERVER_ERROR_BODY_PATTERNS: readonly RegExp[] = [
  /Invalid auth environment variables/i,
  /BETTER_AUTH_SECRET/i,
  /Application error: a server-side exception/i,
  /Internal Server Error/i,
  /This page could not be found/i,
];

const AUTH_WALL_BODY_PATTERNS: readonly RegExp[] = [
  /sign in to continue/i,
  /log in to your account/i,
  /unauthorized/i,
  /access denied/i,
  /better-auth/i,
  /create an account/i,
  /forgot password/i,
];

type ProbeResponse = {
  readonly statusCode: number;
  readonly finalPath: string;
  readonly finalUrl: string;
  readonly bodySample: string;
};

type ProbeRequestOptions = {
  readonly cookieHeader?: string;
  readonly extraHeaders?: Readonly<Record<string, string>>;
};

function bodyIndicatesServerError(bodySample: string): boolean {
  return SERVER_ERROR_BODY_PATTERNS.some((pattern) => pattern.test(bodySample));
}

function bodyIndicatesAuthWall(bodySample: string): boolean {
  return AUTH_WALL_BODY_PATTERNS.some((pattern) => pattern.test(bodySample));
}

async function probeOnce(
  url: string,
  redirectHopsLeft: number,
  options?: ProbeRequestOptions,
): Promise<ProbeResponse> {
  const parsed = new URL(url);
  const client = parsed.protocol === "https:" ? httpsRequest : httpRequest;
  return await new Promise<ProbeResponse>((resolve, reject) => {
    const req = client(
      {
        hostname: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: {
          "User-Agent": "signaler-route-preflight",
          Accept: "text/html,application/xhtml+xml",
          ...(options?.extraHeaders ?? {}),
          ...(options?.cookieHeader ? { Cookie: options.cookieHeader } : {}),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let total = 0;
        const maxBytes = 16_384;
        response.on("data", (chunk: Buffer) => {
          if (total >= maxBytes) {
            return;
          }
          const slice = chunk.subarray(0, maxBytes - total);
          chunks.push(slice);
          total += slice.length;
        });
        response.on("end", () => {
          const statusCode = response.statusCode ?? 0;
          const location = response.headers.location;
          const bodySample = Buffer.concat(chunks).toString("utf8");
          if (
            redirectHopsLeft > 0 &&
            location &&
            (statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307 || statusCode === 308)
          ) {
            const nextUrl = new URL(location, url).toString();
            void probeOnce(nextUrl, redirectHopsLeft - 1, options).then(resolve).catch(reject);
            return;
          }
          const finalUrlParsed = new URL(url);
          resolve({
            statusCode,
            finalPath: finalUrlParsed.pathname,
            finalUrl: url,
            bodySample,
          });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(12_000, () => {
      req.destroy(new Error("Route preflight timeout"));
    });
    req.end();
  });
}

export function classifyPreflightProbe(params: {
  readonly requestedPath: string;
  readonly probe: ProbeResponse;
  readonly protectedPathPrefixes?: readonly string[];
}): RoutePreflightResult {
  const { requestedPath, probe } = params;

  if (bodyIndicatesServerError(probe.bodySample)) {
    return {
      path: requestedPath,
      status: "unreachable",
      httpStatus: probe.statusCode,
      finalPath: probe.finalPath,
      reason: "server error page (check app env / logs)",
    };
  }

  if (probe.statusCode >= 500) {
    return {
      path: requestedPath,
      status: "unreachable",
      httpStatus: probe.statusCode,
      finalPath: probe.finalPath,
      reason: `HTTP ${probe.statusCode}`,
    };
  }
  if (probe.statusCode === 401 || probe.statusCode === 403) {
    return {
      path: requestedPath,
      status: "auth-wall",
      httpStatus: probe.statusCode,
      finalPath: probe.finalPath,
      reason: `HTTP ${probe.statusCode}`,
    };
  }
  const finalPath = probe.finalPath || requestedPath;
  if (AUTH_PATH_PATTERN.test(finalPath) && !AUTH_PATH_PATTERN.test(requestedPath)) {
    return {
      path: requestedPath,
      status: "auth-wall",
      httpStatus: probe.statusCode,
      finalPath,
      reason: `redirected to ${finalPath}`,
    };
  }
  // Redirect-only index routes: in-app redirect to a non-auth path is auditable (Lighthouse follows).
  if (
    finalPath !== requestedPath
    && !AUTH_PATH_PATTERN.test(finalPath)
    && probe.statusCode > 0
    && probe.statusCode < 400
  ) {
    return {
      path: requestedPath,
      status: "ok",
      httpStatus: probe.statusCode,
      finalPath,
      reason: `redirect resolved to ${finalPath}`,
    };
  }
  if (isProtectedAppRoute(requestedPath, params.protectedPathPrefixes) && bodyIndicatesAuthWall(probe.bodySample)) {
    return {
      path: requestedPath,
      status: "auth-wall",
      httpStatus: probe.statusCode,
      finalPath,
      reason: "protected route without session (login HTML detected)",
    };
  }
  if (probe.statusCode >= 400) {
    return {
      path: requestedPath,
      status: "unreachable",
      httpStatus: probe.statusCode,
      finalPath,
      reason: `HTTP ${probe.statusCode}`,
    };
  }
  return {
    path: requestedPath,
    status: "ok",
    httpStatus: probe.statusCode,
    finalPath,
  };
}

export async function probeAppHealth(params: {
  readonly baseUrl: string;
  readonly cookieHeader?: string;
  readonly extraHeaders?: Readonly<Record<string, string>>;
}): Promise<{ readonly ok: boolean; readonly reason?: string }> {
  try {
    const probe = await probeOnce(new URL("/", params.baseUrl).toString(), 3, {
      cookieHeader: params.cookieHeader,
      extraHeaders: params.extraHeaders,
    });
    if (bodyIndicatesServerError(probe.bodySample)) {
      return {
        ok: false,
        reason:
          "App returned a server error page at /. The dev server may be missing auth/env secrets. Signaler can inject audit bypass env on managed serve when the repo supports it (serveEnv / auditBypass), or start the app with your local .env.local and rerun with --no-managed-serve.",
      };
    }
    if (probe.statusCode >= 500) {
      return { ok: false, reason: `App health check failed: HTTP ${probe.statusCode} at /` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function probeRoute(params: {
  readonly baseUrl: string;
  readonly path: string;
  readonly query?: string;
  readonly cookieHeader?: string;
  readonly extraHeaders?: Readonly<Record<string, string>>;
  readonly protectedPathPrefixes?: readonly string[];
}): Promise<RoutePreflightResult> {
  const url = new URL(params.path, params.baseUrl);
  if (params.query) {
    url.search = params.query.startsWith("?") ? params.query.slice(1) : params.query;
  }
  try {
    const probe = await probeOnce(url.toString(), 5, {
      cookieHeader: params.cookieHeader,
      extraHeaders: params.extraHeaders,
    });
    return classifyPreflightProbe({
      requestedPath: params.path,
      probe,
      protectedPathPrefixes: params.protectedPathPrefixes,
    });
  } catch (error) {
    return {
      path: params.path,
      status: "unreachable",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function probeRoutesParallel(params: {
  readonly baseUrl: string;
  readonly paths: readonly string[];
  readonly query?: string;
  readonly concurrency?: number;
  readonly cookieHeader?: string;
  readonly extraHeaders?: Readonly<Record<string, string>>;
  readonly protectedPathPrefixes?: readonly string[];
}): Promise<Map<string, RoutePreflightResult>> {
  const concurrency = Math.max(1, Math.min(16, params.concurrency ?? 8));
  const uniquePaths = [...new Set(params.paths)];
  const results = new Map<string, RoutePreflightResult>();
  let index = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const current = index;
      index += 1;
      if (current >= uniquePaths.length) {
        return;
      }
      const path = uniquePaths[current];
      const result = await probeRoute({
        baseUrl: params.baseUrl,
        path,
        query: params.query,
        cookieHeader: params.cookieHeader,
        extraHeaders: params.extraHeaders,
        protectedPathPrefixes: params.protectedPathPrefixes,
      });
      results.set(path, result);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, uniquePaths.length) }, () => worker()));
  return results;
}

export function formatPreflightSkipMessage(result: RoutePreflightResult): string {
  if (result.status === "auth-wall") {
    return `Skipped (auth-wall): ${result.path}${result.reason ? ` — ${result.reason}` : ""}`;
  }
  return `Skipped (unreachable): ${result.path}${result.reason ? ` — ${result.reason}` : ""}`;
}

export type ComboAuditStatus =
  | "scored"
  | "skipped-auth"
  | "skipped-unreachable"
  | "runner-error"
  | "partial";

export function classifyComboAuditStatus(summary: {
  readonly runtimeErrorMessage?: string;
  readonly scores: {
    readonly performance?: number;
    readonly accessibility?: number;
    readonly bestPractices?: number;
    readonly seo?: number;
  };
}): ComboAuditStatus {
  const message = summary.runtimeErrorMessage;
  if (message?.startsWith("Skipped (auth-wall)")) {
    return "skipped-auth";
  }
  if (message?.startsWith("Skipped (unreachable)")) {
    return "skipped-unreachable";
  }
  if (message?.startsWith("Skipped (")) {
    return "skipped-unreachable";
  }
  if (!message) {
    return "scored";
  }
  if (pageDeviceSummaryHasScores(summary)) {
    return "partial";
  }
  return "runner-error";
}

export function pageDeviceSummaryHasScores(summary: {
  readonly scores: { readonly performance?: number; readonly accessibility?: number; readonly bestPractices?: number; readonly seo?: number };
  readonly runtimeErrorMessage?: string;
}): boolean {
  if (summary.runtimeErrorMessage?.startsWith("Skipped (")) {
    return false;
  }
  const values = [
    summary.scores.performance,
    summary.scores.accessibility,
    summary.scores.bestPractices,
    summary.scores.seo,
  ];
  return values.some((value) => typeof value === "number" && Number.isFinite(value));
}

export function auditScoreCoverage(params: {
  readonly summaries: readonly {
    readonly scores: { readonly performance?: number; readonly accessibility?: number; readonly bestPractices?: number; readonly seo?: number };
    readonly runtimeErrorMessage?: string;
  }[];
}): {
  readonly scored: number;
  readonly total: number;
  readonly skipped: number;
  readonly expectedToScore: number;
  readonly rate: number;
} {
  const total = params.summaries.length;
  const skipped = params.summaries.filter((entry) => entry.runtimeErrorMessage?.startsWith("Skipped (")).length;
  const expectedToScore = total - skipped;
  const scored = params.summaries.filter((entry) => pageDeviceSummaryHasScores(entry)).length;
  const rate = expectedToScore > 0 ? scored / expectedToScore : total > 0 ? scored / total : 0;
  return { scored, total, skipped, expectedToScore, rate };
}

/** Minimum share of non-skipped combos that must produce Lighthouse scores. */
export const MIN_AUDIT_SCORE_COVERAGE_RATE = 0.8;
