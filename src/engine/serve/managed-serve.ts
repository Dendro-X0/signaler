import { ensureManagedDevServer } from "./managed-dev-server.js";
import { ensureManagedProductionServer } from "./managed-production-server.js";
import { resolveDevServePlan } from "./resolve-serve-plan.js";

export type ManagedServeMode = "dev" | "production" | "auto";

export type ManagedServerHandle = {
  readonly baseUrl: string;
  readonly startedBySignaler: boolean;
  readonly builtBySignaler: boolean;
  readonly mode: "dev" | "production";
  readonly stop: () => Promise<void>;
};

export type EnsureManagedServerOptions = {
  readonly projectRoot: string;
  readonly baseUrl?: string;
  readonly mode?: ManagedServeMode;
  readonly skipBuild?: boolean;
  readonly reuseUnhealthy?: boolean;
  readonly buildTimeoutMs?: number;
  readonly startTimeoutMs?: number;
};

export function parseManagedServeMode(raw: string | undefined): ManagedServeMode {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === undefined || normalized.length === 0) {
    return "auto";
  }
  if (normalized === "dev" || normalized === "production" || normalized === "auto") {
    return normalized;
  }
  throw new Error(`Invalid managed serve mode: ${raw}. Expected dev, production, or auto.`);
}

export function resolveManagedServeModeFromEnv(): ManagedServeMode | undefined {
  const raw = process.env.SIGNALER_MANAGED_SERVE_MODE?.trim();
  if (!raw) {
    return undefined;
  }
  return parseManagedServeMode(raw);
}

async function canUseDevServe(projectRoot: string): Promise<boolean> {
  try {
    await resolveDevServePlan({ projectRoot });
    return true;
  } catch {
    return false;
  }
}

async function resolveEffectiveMode(
  projectRoot: string,
  mode: ManagedServeMode,
): Promise<"dev" | "production"> {
  if (mode === "dev") {
    return "dev";
  }
  if (mode === "production") {
    return "production";
  }
  return (await canUseDevServe(projectRoot)) ? "dev" : "production";
}

export async function ensureManagedServer(
  options: EnsureManagedServerOptions,
): Promise<ManagedServerHandle> {
  const mode: ManagedServeMode = options.mode ?? resolveManagedServeModeFromEnv() ?? "auto";
  const effective = await resolveEffectiveMode(options.projectRoot, mode);

  if (effective === "dev") {
    const dev = await ensureManagedDevServer({
      projectRoot: options.projectRoot,
      baseUrl: options.baseUrl,
      reuseUnhealthy: options.reuseUnhealthy,
      startTimeoutMs: options.startTimeoutMs,
    });
    return {
      baseUrl: dev.baseUrl,
      startedBySignaler: dev.startedBySignaler,
      builtBySignaler: false,
      mode: "dev",
      stop: dev.stop,
    };
  }

  const production = await ensureManagedProductionServer({
    projectRoot: options.projectRoot,
    baseUrl: options.baseUrl,
    skipBuild: options.skipBuild,
    reuseUnhealthy: options.reuseUnhealthy,
    buildTimeoutMs: options.buildTimeoutMs,
    startTimeoutMs: options.startTimeoutMs,
  });
  return {
    baseUrl: production.baseUrl,
    startedBySignaler: production.startedBySignaler,
    builtBySignaler: production.builtBySignaler,
    mode: "production",
    stop: production.stop,
  };
}
