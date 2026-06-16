const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export function isLocalBaseUrl(baseUrl: string): boolean {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (LOCAL_HOSTNAMES.has(host)) {
      return true;
    }
    if (host.endsWith(".localhost")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function assertLocalLabAuth(baseUrl: string): void {
  if (!isLocalBaseUrl(baseUrl)) {
    throw new Error(
      `Lab auth is only allowed for local base URLs (localhost / 127.0.0.1). Got: ${baseUrl}`,
    );
  }
}
