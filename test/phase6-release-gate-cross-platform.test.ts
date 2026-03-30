import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { evaluateReleaseGate } from "../benchmarks/phase6/evaluate-release-gate.js";

const REQUIRED_DOCS = [
  "docs/operations/production-playbook.md",
  "docs/operations/launch-checklist.md",
  "docs/operations/release-notes.md",
  "docs/guides/known-limits.md",
  "docs/README.md",
  "docs/guides/getting-started.md",
  "docs/reference/cli.md",
  "docs/guides/migration.md",
] as const;

const REQUIRED_BENCHMARKS = [
  "benchmarks/out/phase0-baseline.json",
  "benchmarks/out/phase0-baseline.md",
  "benchmarks/out/phase4-baseline.json",
  "benchmarks/out/phase4-baseline.md",
] as const;

const REQUIRED_TEMPLATES = [
  ".github/workflow-templates/signaler-audit-pnpm.yml",
  ".github/workflow-templates/signaler-audit-pnpm.properties.json",
  ".github/workflow-templates/signaler-audit-npm.yml",
  ".github/workflow-templates/signaler-audit-npm.properties.json",
  ".github/workflow-templates/signaler-audit-yarn.yml",
  ".github/workflow-templates/signaler-audit-yarn.properties.json",
] as const;

const ENV_KEYS = [
  "PHASE6_NEED_TEST",
  "PHASE6_NEED_QUALITY",
  "PHASE6_NEED_PHASE0_BENCHMARK",
  "PHASE6_NEED_CROSS_PLATFORM",
] as const;

type GateCheck = {
  readonly id: string;
  readonly status: "ok" | "warn" | "error";
};

const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {
  PHASE6_NEED_TEST: process.env.PHASE6_NEED_TEST,
  PHASE6_NEED_QUALITY: process.env.PHASE6_NEED_QUALITY,
  PHASE6_NEED_PHASE0_BENCHMARK: process.env.PHASE6_NEED_PHASE0_BENCHMARK,
  PHASE6_NEED_CROSS_PLATFORM: process.env.PHASE6_NEED_CROSS_PLATFORM,
};

afterEach(() => {
  for (const key of ENV_KEYS) {
    const previous = originalEnv[key];
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
});

async function writeText(root: string, relPath: string, contents: string): Promise<void> {
  const absolutePath = resolve(root, relPath);
  await mkdir(resolve(absolutePath, ".."), { recursive: true });
  await writeFile(absolutePath, contents, "utf8");
}

function findCheck(checks: readonly GateCheck[], id: string): GateCheck | undefined {
  return checks.find((entry) => entry.id === id);
}

async function seedPhase6Fixture(root: string): Promise<void> {
  for (const relPath of REQUIRED_DOCS) {
    await writeText(root, relPath, "# stub\n");
  }
  for (const relPath of REQUIRED_BENCHMARKS) {
    await writeText(root, relPath, "{}\n");
  }
  for (const relPath of REQUIRED_TEMPLATES) {
    await writeText(root, relPath, "name: stub\n");
  }

  await writeText(
    root,
    "README.md",
    [
      "# Signaler",
      "discover -> run -> report",
      "",
    ].join("\n"),
  );

  await writeText(
    root,
    "docs/guides/getting-started.md",
    [
      "# Getting Started",
      "discover -> run -> report",
      "",
    ].join("\n"),
  );

  await writeText(
    root,
    "docs/reference/cli.md",
    [
      "# CLI and CI",
      "discover -> run -> report",
      "node ./dist/bin.js run --contract v3 --mode throughput",
      "",
    ].join("\n"),
  );

  await writeText(
    root,
    "docs/README.md",
    [
      "# Docs",
      "- [Migration](guides/migration.md)",
      "- [Release notes](operations/release-notes.md)",
      "",
    ].join("\n"),
  );

  await writeText(root, "docs/archive/release-notes/RELEASE-NOTES-v2.6.4.md", "# notes\n");
  await writeText(
    root,
    "package.json",
    JSON.stringify(
      {
        name: "@signaler/cli",
        version: "2.6.4",
      },
      null,
      2,
    ),
  );
  await writeText(
    root,
    ".github/workflows/ci.yml",
    [
      "name: ci",
      "jobs:",
      "  cross-platform-smoke:",
      "    runs-on: ubuntu-latest",
      "    strategy:",
      "      matrix:",
      "        os: [ubuntu-latest, windows-latest, macos-latest]",
      "  phase6-release-gate:",
      "    runs-on: ubuntu-latest",
      "",
    ].join("\n"),
  );

  await writeText(
    root,
    "release/v3/dogfood-evidence.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        entries: [
          { repo: "a", owner: "o", startDate: "2026-01-01", endDate: "2026-01-20", notes: "ok" },
          { repo: "b", owner: "o", startDate: "2026-01-01", endDate: "2026-01-20", notes: "ok" },
          { repo: "c", owner: "o", startDate: "2026-01-01", endDate: "2026-01-20", notes: "ok" },
        ],
      },
      null,
      2,
    ),
  );
}

async function writeCrossPlatformEvidence(root: string, os: string): Promise<void> {
  await writeText(
    root,
    `benchmarks/out/cross-platform-smoke-${os}.json`,
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        os,
        smoke: {
          testSmokePassed: true,
          phase6SmokePassed: true,
        },
      },
      null,
      2,
    ),
  );
}

describe("phase6 cross-platform evidence gate behavior", () => {
  it("passes in local mode without cross-platform evidence files", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-phase6-local-"));
    await seedPhase6Fixture(root);

    const report = await evaluateReleaseGate({
      rootDir: root,
      outJsonPath: resolve(root, "out/report.json"),
      outMarkdownPath: resolve(root, "out/report.md"),
    });

    expect(report.status).toBe("ok");
    const crossPlatformCheck = findCheck(report.checks as readonly GateCheck[], "cross-platform-smoke-evidence");
    expect(crossPlatformCheck?.status).toBe("ok");
    await rm(root, { recursive: true, force: true });
  });

  it("fails in CI mode when cross-platform evidence is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-phase6-ci-missing-"));
    await seedPhase6Fixture(root);
    process.env.PHASE6_NEED_TEST = "success";
    process.env.PHASE6_NEED_QUALITY = "success";
    process.env.PHASE6_NEED_PHASE0_BENCHMARK = "success";
    process.env.PHASE6_NEED_CROSS_PLATFORM = "success";

    const report = await evaluateReleaseGate({
      rootDir: root,
      outJsonPath: resolve(root, "out/report.json"),
      outMarkdownPath: resolve(root, "out/report.md"),
    });

    expect(report.status).toBe("error");
    const crossPlatformCheck = findCheck(report.checks as readonly GateCheck[], "cross-platform-smoke-evidence");
    expect(crossPlatformCheck?.status).toBe("error");
    await rm(root, { recursive: true, force: true });
  });

  it("passes in CI mode when all expected cross-platform evidence exists", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-phase6-ci-complete-"));
    await seedPhase6Fixture(root);
    process.env.PHASE6_NEED_TEST = "success";
    process.env.PHASE6_NEED_QUALITY = "success";
    process.env.PHASE6_NEED_PHASE0_BENCHMARK = "success";
    process.env.PHASE6_NEED_CROSS_PLATFORM = "success";
    await writeCrossPlatformEvidence(root, "ubuntu-latest");
    await writeCrossPlatformEvidence(root, "windows-latest");
    await writeCrossPlatformEvidence(root, "macos-latest");

    const report = await evaluateReleaseGate({
      rootDir: root,
      outJsonPath: resolve(root, "out/report.json"),
      outMarkdownPath: resolve(root, "out/report.md"),
    });

    expect(report.status).toBe("ok");
    const crossPlatformCheck = findCheck(report.checks as readonly GateCheck[], "cross-platform-smoke-evidence");
    expect(crossPlatformCheck?.status).toBe("ok");
    await rm(root, { recursive: true, force: true });
  });
});
