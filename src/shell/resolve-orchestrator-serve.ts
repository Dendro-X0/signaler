import type { ApexServeConfig } from "../core/types.js";
import {
  resolveManagedServeModeFromEnv,
  type ManagedServeMode,
} from "../engine/serve/index.js";
import type { OrchestratorServeOptions } from "./orchestrator-serve-options.js";

export type ResolvedOrchestratorServe = {
  readonly managedServe: boolean;
  readonly managedServeMode: ManagedServeMode;
};

function serveModeEnablesManagedServe(mode: ApexServeConfig["mode"] | undefined): boolean {
  return mode === "managed" || mode === "dev" || mode === "production";
}

function serveModeToManagedServeMode(mode: ApexServeConfig["mode"] | undefined): ManagedServeMode | undefined {
  if (mode === "dev") {
    return "dev";
  }
  if (mode === "production" || mode === "managed") {
    return "production";
  }
  return undefined;
}

/**
 * Merge CLI flags, config `serve.mode`, and SIGNALER_MANAGED_SERVE env.
 * Default: attach-first (managed serve off).
 */
export function resolveEffectiveOrchestratorServe(params: {
  readonly options: OrchestratorServeOptions;
  readonly configServe?: ApexServeConfig;
}): ResolvedOrchestratorServe {
  let managedServe: boolean;
  if (params.options.managedServeSetByCli) {
    managedServe = params.options.managedServe;
  } else if (params.configServe?.mode !== undefined) {
    managedServe = serveModeEnablesManagedServe(params.configServe.mode);
  } else if (process.env.SIGNALER_MANAGED_SERVE === "1") {
    managedServe = true;
  } else if (process.env.SIGNALER_MANAGED_SERVE === "0") {
    managedServe = false;
  } else {
    managedServe = false;
  }

  let managedServeMode: ManagedServeMode;
  if (params.options.managedServeModeSetByCli) {
    managedServeMode = params.options.managedServeMode;
  } else {
    const fromConfig = serveModeToManagedServeMode(params.configServe?.mode);
    managedServeMode = fromConfig ?? resolveManagedServeModeFromEnv() ?? "production";
  }

  return { managedServe, managedServeMode };
}
