import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathExists } from "../../infrastructure/filesystem/utils.js";
import { buildLoopbackBaseUrl, resolveNextAppRoot } from "../serve/resolve-serve-plan.js";
import { probeUrlListening } from "../serve/url-probe.js";

const COMMON_DEV_PORTS: readonly number[] = [
  3000, 3001, 3002, 3003, 4000, 4173, 4200, 4321, 5000, 5173, 8000, 8080,
];

const PORT_TOKEN = /(?:^|[\s"'`=(])(?:PORT|VITE_PORT|NEXT_PUBLIC_PORT|NUXT_PORT|WEB_PORT)[\s]*[=:]\s*['"]?(\d{2,5})/gim;
const SCRIPT_PORT = /(?:--port|-p)\s+['"]?(\d{2,5})|:(\d{2,5})(?:\s|$)/g;

function parsePort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1 || n > 65_535) return undefined;
  return n;
}

function collectPortsFromText(text: string, into: Set<number>): void {
  for (const match of text.matchAll(PORT_TOKEN)) {
    const port = parsePort(match[1]);
    if (port) into.add(port);
  }
  for (const match of text.matchAll(SCRIPT_PORT)) {
    const port = parsePort(match[1] ?? match[2]);
    if (port) into.add(port);
  }
}

async function readTextIfExists(path: string): Promise<string | undefined> {
  if (!(await pathExists(path))) return undefined;
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

/**
 * Collect developer-configured port hints from env files and package scripts.
 */
export async function resolveConfiguredPortHints(projectRoot: string): Promise<readonly number[]> {
  const hints = new Set<number>(COMMON_DEV_PORTS);
  const roots = new Set<string>([projectRoot]);
  try {
    roots.add(await resolveNextAppRoot(projectRoot));
  } catch {
    // keep project root only
  }

  const envNames = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
  ];

  for (const root of roots) {
    for (const envName of envNames) {
      const text = await readTextIfExists(join(root, envName));
      if (text) collectPortsFromText(text, hints);
    }
    const pkgText = await readTextIfExists(join(root, "package.json"));
    if (pkgText) {
      collectPortsFromText(pkgText, hints);
      try {
        const parsed = JSON.parse(pkgText) as { readonly scripts?: Record<string, string> };
        for (const script of Object.values(parsed.scripts ?? {})) {
          collectPortsFromText(script, hints);
        }
      } catch {
        // ignore invalid package.json
      }
    }
  }

  return [...hints].sort((a, b) => a - b);
}

export type LocalServerDiscovery = {
  readonly baseUrl: string;
  readonly port: number;
  readonly source: "configured" | "scan";
};

/**
 * Find an already-running loopback HTTP server for this repo.
 * Probes configured ports first, then common dev ports.
 */
export async function discoverLocalServer(params: {
  readonly projectRoot: string;
  readonly preferredPort?: number;
  readonly probeTimeoutMs?: number;
}): Promise<LocalServerDiscovery | undefined> {
  const timeoutMs = params.probeTimeoutMs ?? 750;
  const ordered = new Set<number>();
  if (typeof params.preferredPort === "number") {
    ordered.add(params.preferredPort);
  }
  for (const port of await resolveConfiguredPortHints(params.projectRoot)) {
    ordered.add(port);
  }

  for (const port of ordered) {
    const baseUrl = buildLoopbackBaseUrl(port);
    const healthUrl = `${baseUrl}/`;
    if (await probeUrlListening(healthUrl, timeoutMs)) {
      return {
        baseUrl,
        port,
        source: typeof params.preferredPort === "number" && port === params.preferredPort
          ? "configured"
          : "scan",
      };
    }
  }
  return undefined;
}
