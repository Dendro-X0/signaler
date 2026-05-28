const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function normalizePort(protocol: string, port: string): string {
  if (port.length > 0) {
    return port;
  }
  return protocol === "https:" ? "443" : "80";
}

export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

/** Treat localhost and 127.0.0.1 (same port/protocol) as the same origin for local audits. */
export function originsEquivalent(originA: string, originB: string): boolean {
  if (originA === originB) {
    return true;
  }
  try {
    const a: URL = new URL(originA);
    const b: URL = new URL(originB);
    if (a.protocol !== b.protocol) {
      return false;
    }
    if (normalizePort(a.protocol, a.port) !== normalizePort(b.protocol, b.port)) {
      return false;
    }
    return isLoopbackHostname(a.hostname) && isLoopbackHostname(b.hostname);
  } catch {
    return false;
  }
}

/** Keep same-origin (including loopback-equivalent) URLs; rewrite host to the audit base origin. */
export function resolveInternalUrl(rawUrl: string, baseOrigin: string): string | undefined {
  try {
    const parsed: URL = new URL(rawUrl);
    if (!originsEquivalent(parsed.origin, baseOrigin)) {
      return undefined;
    }
    const normalized: URL = new URL(`${parsed.pathname}${parsed.search}`, baseOrigin);
    normalized.hash = "";
    return normalized.toString();
  } catch {
    return undefined;
  }
}
