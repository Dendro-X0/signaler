export interface VerifyThresholdsV6 {
  readonly minScoreDelta?: number;
  readonly minLcpDeltaMs?: number;
  readonly minTbtDeltaMs?: number;
  readonly minClsDelta?: number;
  readonly minBytesDelta?: number;
}

export interface VerifyCheckV6 {
  readonly actionId: string;
  readonly actionTitle: string;
  readonly status: "pass" | "fail" | "skipped";
  readonly reason?: string;
  readonly before: {
    readonly score?: number;
    readonly lcpMs?: number;
    readonly tbtMs?: number;
    readonly cls?: number;
    readonly bytes?: number;
  };
  readonly after: {
    readonly score?: number;
    readonly lcpMs?: number;
    readonly tbtMs?: number;
    readonly cls?: number;
    readonly bytes?: number;
  };
  readonly delta: {
    readonly score?: number;
    readonly lcpMs?: number;
    readonly tbtMs?: number;
    readonly cls?: number;
    readonly bytes?: number;
  };
  readonly threshold: {
    readonly minScoreDelta?: number;
    readonly minLcpDeltaMs?: number;
    readonly minTbtDeltaMs?: number;
    readonly minClsDelta?: number;
    readonly minBytesDelta?: number;
  };
  readonly evidence: readonly {
    readonly sourceRelPath: string;
    readonly pointer: string;
    readonly artifactRelPath?: string;
  }[];
}

export interface VerifyReportV6 {
  readonly schemaVersion: 1;
  readonly verifyRunId: string;
  readonly generatedAt: string;
  readonly baseline: {
    readonly dir: string;
    readonly comparabilityHash: string;
    readonly mode: "fidelity" | "throughput";
  };
  readonly rerun: {
    readonly dir: string;
    readonly comparabilityHash: string;
    readonly mode: "fidelity" | "throughput";
    readonly elapsedMs: number;
  };
  readonly comparability: {
    readonly strict: boolean;
    readonly matched: boolean;
    readonly reason?: string;
  };
  readonly checks: readonly VerifyCheckV6[];
  readonly summary: {
    readonly totalChecks: number;
    readonly passed: number;
    readonly failed: number;
    readonly skipped: number;
    readonly status: "pass" | "fail";
    readonly warnings: readonly string[];
  };
}
