import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseArgs, runPreflight } from "../scripts/release.js";

const REQUIRED_DOCS = [
  "README.md",
  "docs/README.md",
  "docs/reference/cli.md",
  "docs/operations/launch-checklist.md",
  "docs/roadmap/active-roadmap.md",
  "docs/operations/release-playbook.md",
  "docs/operations/release-notes.md",
];

const REQUIRED_RELEASE_ASSETS = [
  "release/v3/dogfood-evidence.json",
  "release/v3/release-manifest.schema.json",
  "release/v3/release-manifest.example.json",
];

const REQUIRED_GATES = [
  "benchmarks/out/v3-release-gate.json",
  "benchmarks/out/phase6-release-gate.json",
  "benchmarks/out/v63-success-gate.json",
];

const WORKSTREAM_J_OVERHEAD = "benchmarks/out/workstream-j-optional-input-overhead.json";
const WORKSTREAM_K_RUST_BENCHMARK = "benchmarks/out/workstream-k-rust-benchmark-normalizer-perf.json";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

async function writeJson(relPath: string, data: unknown, root: string): Promise<void> {
  const filePath = resolve(root, relPath);
  await mkdir(resolve(filePath, ".."), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function setupRepoFixture(params: {
  readonly gateStatus?: "ok" | "warn";
  readonly includeWorkstreamJOverhead?: boolean;
  readonly workstreamJOverheadStatus?: "pass" | "fail";
  readonly includeWorkstreamKRustBenchmark?: boolean;
  readonly workstreamKRustBenchmarkStatus?: "pass" | "fail";
} = {}): Promise<string> {
  const gateStatus = params.gateStatus ?? "ok";
  const includeWorkstreamJOverhead = params.includeWorkstreamJOverhead ?? true;
  const workstreamJOverheadStatus = params.workstreamJOverheadStatus ?? "pass";
  const includeWorkstreamKRustBenchmark = params.includeWorkstreamKRustBenchmark ?? true;
  const workstreamKRustBenchmarkStatus = params.workstreamKRustBenchmarkStatus ?? "pass";
  const root = await mkdtemp(join(tmpdir(), "signaler-release-script-"));
  await writeJson("package.json", { version: "3.0.0-rc.1" }, root);
  await writeJson("jsr.json", { version: "3.0.0-rc.1" }, root);

  for (const relPath of REQUIRED_DOCS) {
    const filePath = resolve(root, relPath);
    await mkdir(resolve(filePath, ".."), { recursive: true });
    await writeFile(filePath, "# fixture\n", "utf8");
  }
  for (const relPath of REQUIRED_RELEASE_ASSETS) {
    await writeJson(relPath, { fixture: true }, root);
  }
  for (const relPath of REQUIRED_GATES) {
    await writeJson(relPath, { status: gateStatus }, root);
  }
  if (includeWorkstreamJOverhead) {
    await writeJson(
      WORKSTREAM_J_OVERHEAD,
      {
        schemaVersion: 1,
        status: workstreamJOverheadStatus,
        overhead: { medianMs: 4, p95Ms: 16 },
        budgets: { maxMedianOverheadMs: 30, maxP95OverheadMs: 60 },
        assertions: {
          baselineHasNoBenchmarkMerge: true,
          benchmarkHasAcceptedRecords: true,
          medianOverheadWithinBudget: true,
          p95OverheadWithinBudget: true,
        },
      },
      root,
    );
  }
  if (includeWorkstreamKRustBenchmark) {
    await writeJson(
      WORKSTREAM_K_RUST_BENCHMARK,
      {
        schemaVersion: 1,
        status: workstreamKRustBenchmarkStatus,
        delta: { medianMs: -6, p95Ms: -2 },
        assertions: {
          nodeOutputStable: true,
          rustOutputStable: true,
          parityMatched: true,
          rustUsedEveryIteration: true,
        },
      },
      root,
    );
  }

  return root;
}

describe("release script", () => {
  it("parses arguments for strict and cross-platform modes", () => {
    const parsed = parseArgs([
      "--",
      "--target-version",
      "3.0.0-rc.1",
      "--require-cross-platform",
      "--strict",
      "--dry-run",
      "--report",
      "tmp/preflight.json",
    ]);
    expect(parsed.targetVersion).toBe("3.0.0-rc.1");
    expect(parsed.requireCrossPlatform).toBe(true);
    expect(parsed.strict).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.reportPath).toBe("tmp/preflight.json");
  });

  it("returns warn when cross-platform evidence is missing in non-required mode", async () => {
    const root = await setupRepoFixture({ gateStatus: "ok" });
    try {
      process.chdir(root);
      const summary = runPreflight(["--skip-commands", "--dry-run"]);
      expect(summary.status).toBe("warn");
      expect(summary.warnings.some((entry) => entry.includes("cross-platform evidence"))).toBe(true);
    } finally {
      process.chdir(originalCwd);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails when strict mode is used and gate status is warn", async () => {
    const root = await setupRepoFixture({ gateStatus: "warn" });
    try {
      process.chdir(root);
      const summary = runPreflight(["--skip-commands", "--strict", "--dry-run"]);
      expect(summary.status).toBe("error");
      expect(summary.failures.some((entry) => entry.includes("strict mode"))).toBe(true);
    } finally {
      process.chdir(originalCwd);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("records workstream-j overhead status in preflight summary", async () => {
    const root = await setupRepoFixture({ gateStatus: "ok", workstreamJOverheadStatus: "pass" });
    try {
      process.chdir(root);
      const summary = runPreflight(["--skip-commands", "--dry-run"]);
      expect(summary.workstreamJOverhead?.status).toBe("ok");
      expect(String(summary.workstreamJOverhead?.details ?? "")).toContain("passing");
      expect(summary.checks.some((entry) => entry.id === "workstream-j-overhead-evidence" && entry.status === "ok")).toBe(true);
    } finally {
      process.chdir(originalCwd);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("warns when workstream-j overhead evidence is missing", async () => {
    const root = await setupRepoFixture({ gateStatus: "ok", includeWorkstreamJOverhead: false });
    try {
      process.chdir(root);
      const summary = runPreflight(["--skip-commands", "--dry-run"]);
      expect(summary.status).toBe("warn");
      expect(summary.workstreamJOverhead?.status).toBe("warn");
      expect(summary.warnings.some((entry) => entry.includes("Workstream J overhead evidence"))).toBe(true);
      expect(summary.checks.some((entry) => entry.id === "workstream-j-overhead-evidence" && entry.status === "warn")).toBe(true);
    } finally {
      process.chdir(originalCwd);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("records workstream-k benchmark status in preflight summary", async () => {
    const root = await setupRepoFixture({ gateStatus: "ok", workstreamKRustBenchmarkStatus: "pass" });
    try {
      process.chdir(root);
      const summary = runPreflight(["--skip-commands", "--dry-run"]);
      expect(summary.workstreamKRustBenchmark?.status).toBe("ok");
      expect(String(summary.workstreamKRustBenchmark?.details ?? "")).toContain("passing");
      expect(summary.checks.some((entry) => entry.id === "workstream-k-rust-benchmark-evidence" && entry.status === "ok")).toBe(true);
    } finally {
      process.chdir(originalCwd);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("warns when workstream-k benchmark evidence is missing", async () => {
    const root = await setupRepoFixture({ gateStatus: "ok", includeWorkstreamKRustBenchmark: false });
    try {
      process.chdir(root);
      const summary = runPreflight(["--skip-commands", "--dry-run"]);
      expect(summary.status).toBe("warn");
      expect(summary.workstreamKRustBenchmark?.status).toBe("warn");
      expect(summary.warnings.some((entry) => entry.includes("Workstream K benchmark evidence"))).toBe(true);
      expect(summary.checks.some((entry) => entry.id === "workstream-k-rust-benchmark-evidence" && entry.status === "warn")).toBe(true);
    } finally {
      process.chdir(originalCwd);
      await rm(root, { recursive: true, force: true });
    }
  });
});
