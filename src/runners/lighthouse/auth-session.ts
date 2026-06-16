import { readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { resolve } from "node:path";
import type { ApexAuthConfig } from "../../core/types.js";

/** Merge Cookie header fragments; later values override same cookie name. */
export function mergeCookieHeaders(...parts: readonly (string | undefined)[]): string | undefined {
  const jar = new Map<string, string>();
  for (const part of parts) {
    if (!part) {
      continue;
    }
    for (const segment of part.split(";")) {
      const trimmed = segment.trim();
      if (!trimmed || trimmed.toLowerCase().startsWith("path=") || trimmed.toLowerCase().startsWith("expires=")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq <= 0) {
        continue;
      }
      const name = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (name.length > 0) {
        jar.set(name, value);
      }
    }
  }
  if (jar.size === 0) {
    return undefined;
  }
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function parseSetCookieLines(setCookieHeaders: readonly string[]): string | undefined {
  const pairs: string[] = [];
  for (const header of setCookieHeaders) {
    const first = header.split(";")[0]?.trim();
    if (first && first.includes("=")) {
      pairs.push(first);
    }
  }
  return pairs.length > 0 ? pairs.join("; ") : undefined;
}

async function fetchWithCookies(params: {
  readonly url: string;
  readonly cookieHeader?: string;
  readonly redirectHopsLeft: number;
}): Promise<{ readonly setCookies: readonly string[]; readonly cookieHeader?: string }> {
  const parsed = new URL(params.url);
  const client = parsed.protocol === "https:" ? httpsRequest : httpRequest;
  return await new Promise((resolvePromise, reject) => {
    const req = client(
      {
        hostname: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: {
          "User-Agent": "signaler-auth-warmup",
          ...(params.cookieHeader ? { Cookie: params.cookieHeader } : {}),
        },
      },
      (response) => {
        const setCookies: string[] = [];
        const raw = response.headers["set-cookie"];
        if (Array.isArray(raw)) {
          setCookies.push(...raw);
        } else if (typeof raw === "string") {
          setCookies.push(raw);
        }
        const location = response.headers.location;
        const statusCode = response.statusCode ?? 0;
        response.resume();
        response.on("end", () => {
          if (
            params.redirectHopsLeft > 0 &&
            location &&
            (statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307 || statusCode === 308)
          ) {
            const nextCookie = mergeCookieHeaders(params.cookieHeader, parseSetCookieLines(setCookies));
            void fetchWithCookies({
              url: new URL(location, params.url).toString(),
              cookieHeader: nextCookie,
              redirectHopsLeft: params.redirectHopsLeft - 1,
            })
              .then((next) => {
                resolvePromise({
                  setCookies: [...setCookies, ...next.setCookies],
                  cookieHeader: next.cookieHeader ?? nextCookie,
                });
              })
              .catch(reject);
            return;
          }
          resolvePromise({
            setCookies,
            cookieHeader: mergeCookieHeaders(params.cookieHeader, parseSetCookieLines(setCookies)),
          });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(15_000, () => {
      req.destroy(new Error("Auth warmup timeout"));
    });
    req.end();
  });
}

export async function resolveAuditAuthCookieHeader(params: {
  readonly auth?: ApexAuthConfig;
  readonly baseUrl: string;
  readonly configDir: string;
}): Promise<string | undefined> {
  const auth = params.auth;
  if (!auth) {
    return undefined;
  }
  let fromFile: string | undefined;
  if (auth.cookieFile) {
    const path = resolve(params.configDir, auth.cookieFile);
    const raw = await readFile(path, "utf8");
    fromFile = raw.split("\n").map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("#")).join("; ");
  }
  let merged = mergeCookieHeaders(auth.cookies, fromFile);
  if (auth.warmupUrl) {
    const warmupTarget = new URL(auth.warmupUrl, params.baseUrl).toString();
    const warmup = await fetchWithCookies({ url: warmupTarget, cookieHeader: merged, redirectHopsLeft: 5 });
    merged = mergeCookieHeaders(merged, warmup.cookieHeader);
  }
  return merged;
}

export function lighthouseExtraHeaders(cookieHeader: string | undefined): Record<string, string> | undefined {
  return buildLighthouseExtraHeaders({ cookieHeader });
}

export function buildLighthouseExtraHeaders(params: {
  readonly cookieHeader?: string;
  readonly headers?: Readonly<Record<string, string>>;
}): Record<string, string> | undefined {
  const out: Record<string, string> = { ...(params.headers ?? {}) };
  if (params.cookieHeader) {
    out.Cookie = params.cookieHeader;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
