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

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

async function writeJson(relPath: string, data: unknown, root: string): Promise<void> {
  const filePath = resolve(root, relPath);
  await mkdir(resolve(filePath, ".."), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function setupRepoFixture(gateStatus: "ok" | "warn" = "ok"): Promise<string> {
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
    const root = await setupRepoFixture("ok");
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
    const root = await setupRepoFixture("warn");
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
});
