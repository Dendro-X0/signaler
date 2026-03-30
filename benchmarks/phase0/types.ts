export type BaselineEnvironment = "ci-linux" | "local-6c12t";
export type BenchmarkRunMode = "throughput" | "fidelity";
export type BenchmarkStatus = "ok" | "warn" | "error";

export type BenchmarkRoute = {
  readonly path: string;
  readonly label: string;
};

export type BenchmarkModeConfig = {
  readonly parallel?: number;
  readonly warmUp?: boolean;
  readonly runs?: number;
  readonly throttlingMethod?: "simulate" | "devtools";
};

export type BenchmarkExpectedDetection = {
  readonly detected: number;
  readonly selected: number;
  readonly excludedDynamic: number;
  readonly excludedByFilter: number;
  readonly excludedByScope: number;
};

export type BenchmarkExclusionRules = {
  readonly dynamicRoutePatterns?: readonly string[];
  readonly pathFilters?: readonly string[];
  readonly scopeNotes?: readonly string[];
};

export type BenchmarkProfile = {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: "synthetic" | "real";
  readonly description: string;
  readonly projectRoot: string;
  readonly baseUrl: string;
  readonly routes: readonly BenchmarkRoute[];
  readonly devices: readonly ("mobile" | "desktop")[];
  readonly runModes: readonly BenchmarkRunMode[];
  readonly modeConfig?: Partial<Record<BenchmarkRunMode, BenchmarkModeConfig>>;
  readonly exclusionRules?: BenchmarkExclusionRules;
  readonly expectedDetection?: BenchmarkExpectedDetection;
  readonly expectedCombos?: number;
};

export type Phase0RunnerStability = {
  readonly totalAttempts: number;
  readonly totalFailures: number;
  readonly totalRetries: number;
  readonly reductions: number;
  readonly cooldownPauses: number;
  readonly initialParallel: number;
  readonly finalParallel: number;
  readonly failureRate?: number;
  readonly retryRate?: number;
  readonly maxConsecutiveRetries?: number;
  readonly cooldownMsTotal?: number;
  readonly recoveryIncreases?: number;
  readonly status?: "stable" | "degraded" | "unstable";
};

export type Phase0DiscoveryMetrics = {
  readonly detected: number;
  readonly selected: number;
  readonly excludedDynamic: number;
  readonly excludedByFilter: number;
  readonly excludedByScope: number;
};

export type Phase0ArtifactSizes = {
  readonly runJsonBytes: number;
  readonly summaryJsonBytes: number;
  readonly resultsJsonBytes?: number;
  readonly suggestionsJsonBytes?: number;
};

export type Phase0Toolchain = {
  readonly nodeVersion: string;
  readonly rustVersion?: string;
};

export type RustProbeResult = {
  readonly enabled: boolean;
  readonly status: "ok" | "skipped" | "error";
  readonly elapsedMs?: number;
  readonly outputPath?: string;
  readonly message?: string;
};

export type Phase0ReportEntry = {
  readonly environment: BaselineEnvironment;
  readonly profileId: string;
  readonly runMode: BenchmarkRunMode;
  readonly toolchain: Phase0Toolchain;
  readonly metrics: {
    readonly elapsedMs: number;
    readonly avgStepMs: number;
    readonly comboCount: number;
    readonly resolvedParallel: number;
    readonly runnerStability?: Phase0RunnerStability;
  };
  readonly discovery?: Phase0DiscoveryMetrics;
  readonly artifactSizes: Phase0ArtifactSizes;
  readonly status: BenchmarkStatus;
  readonly notes?: readonly string[];
  readonly rustProbe?: RustProbeResult;
};

export type Phase0BaselineReport = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly entries: readonly Phase0ReportEntry[];
  readonly summary: {
    readonly total: number;
    readonly ok: number;
    readonly warn: number;
    readonly error: number;
  };
};
