export type RustNetworkMode = "health" | "headers" | "links" | "console";

export type RustNetworkRetryPolicy = "off" | "auto" | "aggressive";

export type RustNetworkTask = Record<string, unknown>;

export type RustNetworkInput = {
  readonly schemaVersion: 1;
  readonly mode: RustNetworkMode;
  readonly baseUrl: string;
  readonly parallel: number;
  readonly timeoutMs: number;
  readonly retryPolicy: RustNetworkRetryPolicy;
  readonly tasks: readonly RustNetworkTask[];
  readonly options: Record<string, unknown>;
};

export type RustNetworkStats = {
  readonly attempted: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly retries: number;
  readonly cooldownPauses: number;
};

export type RustNetworkOutput = {
  readonly schemaVersion: 1;
  readonly status: "ok" | "warn" | "error";
  readonly mode: RustNetworkMode;
  readonly elapsedMs: number;
  readonly usedFallbackSafeDefaults: boolean;
  readonly results: readonly RustNetworkTask[];
  readonly stats: RustNetworkStats;
  readonly errorMessage?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMode(value: unknown): value is RustNetworkMode {
  return value === "health" || value === "headers" || value === "links" || value === "console";
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function validateStats(value: unknown): RustNetworkStats | undefined {
  if (!isObject(value)) {
    return undefined;
  }
  const attempted: number | undefined = asFiniteNumber(value.attempted);
  const succeeded: number | undefined = asFiniteNumber(value.succeeded);
  const failed: number | undefined = asFiniteNumber(value.failed);
  const retries: number | undefined = asFiniteNumber(value.retries);
  const cooldownPauses: number | undefined = asFiniteNumber(value.cooldownPauses);
  if (
    attempted === undefined ||
    succeeded === undefined ||
    failed === undefined ||
    retries === undefined ||
    cooldownPauses === undefined
  ) {
    return undefined;
  }
  return {
    attempted,
    succeeded,
    failed,
    retries,
    cooldownPauses,
  };
}

export function validateRustNetworkOutput(raw: unknown, expectedMode: RustNetworkMode): RustNetworkOutput | undefined {
  if (!isObject(raw)) {
    return undefined;
  }
  if (raw.schemaVersion !== 1) {
    return undefined;
  }
  if (!isMode(raw.mode) || raw.mode !== expectedMode) {
    return undefined;
  }
  const status: unknown = raw.status;
  if (status !== "ok" && status !== "warn" && status !== "error") {
    return undefined;
  }
  const elapsedMs: number | undefined = asFiniteNumber(raw.elapsedMs);
  if (elapsedMs === undefined) {
    return undefined;
  }
  if (typeof raw.usedFallbackSafeDefaults !== "boolean") {
    return undefined;
  }
  if (!Array.isArray(raw.results)) {
    return undefined;
  }
  const stats: RustNetworkStats | undefined = validateStats(raw.stats);
  if (!stats) {
    return undefined;
  }
  if (raw.errorMessage !== undefined && raw.errorMessage !== null && typeof raw.errorMessage !== "string") {
    return undefined;
  }
  return {
    schemaVersion: 1,
    mode: raw.mode,
    status,
    elapsedMs,
    usedFallbackSafeDefaults: raw.usedFallbackSafeDefaults,
    results: raw.results as readonly RustNetworkTask[],
    stats,
    errorMessage: typeof raw.errorMessage === "string" ? raw.errorMessage : undefined,
  };
}
