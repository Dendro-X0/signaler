import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateWorkstreamJGate } from "../benchmarks/workstream-j/evaluate-gate.js";

async function writeText(pathToFile: string, content: string): Promise<void> {
  await mkdir(dirname(pathToFile), { recursive: true });
  await writeFile(pathToFile, content, "utf8");
}

async function scaffoldRoot(root: string, includeOverheadEvidence: boolean): Promise<void> {
  const requiredFiles = [
    "src/accessibility-benchmark-signals.ts",
    "src/security-benchmark-signals.ts",
    "src/reliability-benchmark-signals.ts",
    "src/seo-benchmark-signals.ts",
    "src/cross-browser-benchmark-signals.ts",
    "src/multi-benchmark-signals.ts",
    "scripts/build-accessibility-benchmark-fixture.ts",
    "scripts/build-security-benchmark-fixture.ts",
    "scripts/build-reliability-benchmark-fixture.ts",
    "scripts/build-seo-benchmark-fixture.ts",
    "scripts/build-cross-browser-benchmark-fixture.ts",
    "benchmarks/workstream-j/optional-input-overhead.ts",
    "test/accessibility-benchmark-signals.test.ts",
    "test/security-benchmark-signals.test.ts",
    "test/reliability-benchmark-signals.test.ts",
    "test/seo-benchmark-signals.test.ts",
    "test/cross-browser-benchmark-signals.test.ts",
    "test/multi-benchmark-signals.test.ts",
    "test/workstream-j-optional-input-overhead.test.ts",
  ] as const;
  for (const relPath of requiredFiles) {
    await writeText(resolve(root, relPath), "// fixture\n");
  }
  await writeText(
    resolve(root, "package.json"),
    JSON.stringify(
      {
        scripts: {
          "bench:workstream-j:overhead": "x",
          "bench:fixture:accessibility": "x",
          "bench:fixture:security": "x",
          "bench:fixture:reliability": "x",
          "bench:fixture:seo": "x",
          "bench:fixture:parity": "x",
        },
      },
      null,
      2,
    ),
  );
  await writeText(
    resolve(root, "docs/reference/cli.md"),
    [
      "bench:fixture:accessibility",
      "bench:fixture:security",
      "bench:fixture:reliability",
      "bench:fixture:seo",
      "bench:fixture:parity",
    ].join("\n"),
  );
  await writeText(resolve(root, "docs/guides/getting-started.md"), "bench:fixture:parity\n");
  await writeText(resolve(root, "docs/reference/testing.md"), "bench:fixture:parity\n");
  await writeText(resolve(root, "docs/specs/workstream-j-implementation-plan.md"), "cross-browser parity fixture adapter\n");

  if (includeOverheadEvidence) {
    await writeText(
      resolve(root, "benchmarks/out/workstream-j-optional-input-overhead.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          status: "pass",
          assertions: {
            baselineHasNoBenchmarkMerge: true,
            benchmarkHasAcceptedRecords: true,
            medianOverheadWithinBudget: true,
            p95OverheadWithinBudget: true,
          },
        },
        null,
        2,
      ),
    );
  }
}

function findCheck(
  checks: readonly { readonly id: string; readonly status: string; readonly details: string }[],
  id: string,
): { readonly id: string; readonly status: string; readonly details: string } {
  const found = checks.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`Missing check: ${id}`);
  }
  return found;
}

describe("workstream-j gate evaluator", () => {
  it("warns when overhead evidence is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-workstream-j-gate-warn-"));
    try {
      await scaffoldRoot(root, false);
      const report = await evaluateWorkstreamJGate({
        rootDir: root,
        outJsonPath: resolve(root, "out.json"),
        outMarkdownPath: resolve(root, "out.md"),
      });
      const check = findCheck(report.checks, "workstream-j-overhead-evidence");
      expect(check.status).toBe("warn");
      expect(check.details).toContain("not found");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("marks overhead evidence check ok when pass report is present", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-workstream-j-gate-ok-"));
    try {
      await scaffoldRoot(root, true);
      const report = await evaluateWorkstreamJGate({
        rootDir: root,
        outJsonPath: resolve(root, "out.json"),
        outMarkdownPath: resolve(root, "out.md"),
      });
      const check = findCheck(report.checks, "workstream-j-overhead-evidence");
      expect(check.status).toBe("ok");
      expect(check.details).toContain("passing");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
