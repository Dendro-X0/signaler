import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathExists } from "../../infrastructure/filesystem/utils.js";
import { resolveNextAppRoot } from "../serve/resolve-serve-plan.js";

/**
 * Infers audit-lab environment variables for Signaler's **managed serve child only**.
 *
 * These values are never written to project `.env` files. Signaler is offline/local:
 * injection applies on loopback during your audit to score protected routes, then the
 * child process is stopped (cleanup). Use `resolveServeEnvWithConsent` for user confirmation.
 */
const AUTH_ENV_MARKERS = [
  /BETTER_AUTH_SECRET/i,
  /DEMO_AUTH_BYPASS/i,
  /AUDIT_BYPASS/i,
  /SIGNALER_AUDIT/i,
  /AUTH_SECRET/i,
] as const;

const BYPASS_ENV_KEYS = [
  "DEMO_AUTH_BYPASS",
  "SIGNALER_AUDIT_MODE",
  "AUDIT_BYPASS",
] as const;

async function readTextIfExists(path: string): Promise<string | undefined> {
  if (!(await pathExists(path))) return undefined;
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

function textIndicatesAuthSetup(text: string): boolean {
  return AUTH_ENV_MARKERS.some((pattern) => pattern.test(text));
}

function packageJsonIndicatesAuth(text: string): boolean {
  return /better-auth|@clerk\/|next-auth|lucia|auth\.js/i.test(text);
}

/**
 * Infer lab-only env vars for managed serve when the target app documents auth bypass
 * or uses common auth stacks that typically support audit bypass flags.
 */
export async function inferAuditServeEnv(projectRoot: string): Promise<Readonly<Record<string, string>> | undefined> {
  const roots = new Set<string>([projectRoot]);
  try {
    roots.add(await resolveNextAppRoot(projectRoot));
  } catch {
    // ignore
  }

  let shouldBypass = false;
  const filesToScan = [
    ".env.example",
    ".env.local.example",
    "ENV_SETUP.md",
    "README.md",
    "docs/ENV_SETUP.md",
  ];

  for (const root of roots) {
    const pkg = await readTextIfExists(join(root, "package.json"));
    if (pkg && packageJsonIndicatesAuth(pkg)) {
      shouldBypass = true;
    }
    for (const name of filesToScan) {
      const text = await readTextIfExists(join(root, name));
      if (text && textIndicatesAuthSetup(text)) {
        shouldBypass = true;
      }
    }
    if (shouldBypass) break;
  }

  if (!shouldBypass) {
    return undefined;
  }

  const env: Record<string, string> = {};
  for (const key of BYPASS_ENV_KEYS) {
    env[key] = "true";
  }
  return env;
}
