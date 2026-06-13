import { parseManagedServeMode, resolveManagedServeModeFromEnv, type ManagedServeMode } from "../engine/serve/index.js";

export type OrchestratorServeOptions = {
  inProcess: boolean;
  managedServe: boolean;
  managedServeMode: ManagedServeMode;
  managedServeSkipBuild: boolean;
  managedServeReuse: boolean;
};

/** Shared defaults for audit, job, and run when auto-serving the target app. */
export function createOrchestratorServeDefaults(): OrchestratorServeOptions {
  return {
    inProcess: process.env.SIGNALER_JOB_IN_PROCESS !== "0",
    managedServe: process.env.SIGNALER_MANAGED_SERVE !== "0",
    managedServeMode: resolveManagedServeModeFromEnv() ?? "production",
    managedServeSkipBuild: false,
    managedServeReuse: process.env.SIGNALER_MANAGED_SERVE_REUSE === "1",
  };
}

/**
 * Apply a managed-serve / in-process flag to `options`.
 * @returns Extra argv index to skip (0 = none, 1 = consumed value), or -1 if unrecognized.
 */
export function applyOrchestratorServeFlag(
  arg: string,
  argv: readonly string[],
  index: number,
  options: OrchestratorServeOptions,
): number {
  if (arg === "--no-in-process") {
    options.inProcess = false;
    return 0;
  }
  if (arg === "--in-process") {
    options.inProcess = true;
    return 0;
  }
  if (arg === "--no-managed-serve") {
    options.managedServe = false;
    return 0;
  }
  if (arg === "--managed-serve" || arg === "--auto-serve") {
    options.managedServe = true;
    return 0;
  }
  if (arg === "--managed-serve-mode") {
    if (index + 1 >= argv.length) {
      throw new Error("--managed-serve-mode requires a value (dev, production, or auto).");
    }
    options.managedServeMode = parseManagedServeMode(argv[index + 1]);
    return 1;
  }
  if (arg === "--managed-serve-skip-build") {
    options.managedServeSkipBuild = true;
    return 0;
  }
  if (arg === "--managed-serve-reuse") {
    options.managedServeReuse = true;
    return 0;
  }
  return -1;
}
