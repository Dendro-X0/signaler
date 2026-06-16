import { classifyPreflightProbe, probeRoute } from "../runners/lighthouse/route-preflight.js";
import type { AuditAuthSession } from "./types.js";

export async function validateLabAuthProbe(params: {
  readonly baseUrl: string;
  readonly probePath: string;
  readonly session: AuditAuthSession;
  readonly protectedPathPrefixes: readonly string[];
}): Promise<boolean> {
  const result = await probeRoute({
    baseUrl: params.baseUrl,
    path: params.probePath,
    cookieHeader: params.session.cookieHeader,
    extraHeaders: params.session.headers,
    protectedPathPrefixes: params.protectedPathPrefixes,
  });
  return result.status === "ok";
}

export async function probeAuthPath(params: {
  readonly baseUrl: string;
  readonly path: string;
  readonly session: AuditAuthSession;
  readonly protectedPathPrefixes?: readonly string[];
}) {
  return probeRoute({
    baseUrl: params.baseUrl,
    path: params.path,
    cookieHeader: params.session.cookieHeader,
    extraHeaders: params.session.headers,
    protectedPathPrefixes: params.protectedPathPrefixes,
  });
}

export function formatProbeResult(result: Awaited<ReturnType<typeof probeRoute>>): string {
  return classifyPreflightProbe({
    requestedPath: result.path,
    probe: {
      statusCode: result.httpStatus ?? 0,
      finalPath: result.finalPath ?? result.path,
      finalUrl: result.path,
      bodySample: "",
    },
  }).reason ?? result.status;
}
