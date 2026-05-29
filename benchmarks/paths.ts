/**
 * Benchmark output vs committed fixture paths.
 *
 * - `benchmarks/out/` — ephemeral generator output (gitignored).
 * - `benchmarks/fixtures/` — committed snapshots for release preflight and validators.
 */
export const BENCHMARK_OUT_DIR = "benchmarks/out";
export const BENCHMARK_FIXTURES_DIR = "benchmarks/fixtures";

export function fixturePath(...segments: readonly string[]): string {
  return [BENCHMARK_FIXTURES_DIR, ...segments].join("/");
}

export function gateFixturePath(fileName: string): string {
  return fixturePath("gates", fileName);
}

export function evidenceFixturePath(fileName: string): string {
  return fixturePath("evidence", fileName);
}

export function baselineFixturePath(fileName: string): string {
  return fixturePath("baselines", fileName);
}

/** Default paths for committed gate snapshots (used by release preflight / validate scripts). */
export const GATE_FIXTURE_PATHS = {
  v3: gateFixturePath("v3-release-gate.json"),
  phase6: gateFixturePath("phase6-release-gate.json"),
  v63: gateFixturePath("v63-success-gate.json"),
  workstreamJ: gateFixturePath("workstream-j-gate.json"),
} as const;
