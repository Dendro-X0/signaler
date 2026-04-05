import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateSuccessGate } from "../benchmarks/v63/evaluate-success-gate.js";

async function writeText(pathToFile: string, content: string): Promise<void> {
  await mkdir(dirname(pathToFile), { recursive: true });
  await writeFile(pathToFile, content, "utf8");
}

async function scaffoldGateRoot(root: string): Promise<void> {
  await writeText(
    resolve(root, "README.md"),
    "# Readme\n\ndiscover -> run -> analyze -> verify -> report\n",
  );
  await writeText(
    resolve(root, "docs/guides/getting-started.md"),
    "# Getting Started\n\nnode ./dist/bin.js run\n\ndiscover -> run -> analyze -> verify -> report\n",
  );
  await writeText(
    resolve(root, "docs/reference/cli.md"),
    "# CLI\n\nnode ./dist/bin.js analyze\n\ndiscover -> run -> analyze -> verify -> report\n",
  );
  await writeText(
    resolve(root, "docs/roadmap/active-roadmap.md"),
    "# Active Roadmap\n\n## Success Gate\n\n- [x] baseline\n",
  );
  await writeText(resolve(root, "src/analyze-cli.ts"), "const elapsedMs = 1;\n");
  await writeText(resolve(root, "src/verify-cli.ts"), "const plannedCombos = 1;\nconst executedCombos = 1;\nconst flag = '--runtime-budget-ms';\n");
  await writeText(resolve(root, "src/cli.ts"), "const text = 'Low-memory guidance:';\n");
  await writeText(resolve(root, "src/shell-cli.ts"), "const flag = '--runtime-budget-ms';\n");
  await writeText(resolve(root, "test/analyze-cli-v6.test.ts"), "const elapsedMs = 1;\n");
  await writeText(resolve(root, "test/verify-cli-v6.test.ts"), "const a = '--runtime-budget-ms';\nconst plannedCombos = 1;\nconst executedCombos = 1;\n");
}

function checkStatus(
  checks: readonly { readonly id: string; readonly status: string; readonly details: string }[],
  id: string,
): { readonly id: string; readonly status: string; readonly details: string } {
  const found = checks.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Missing gate check: ${id}`);
  }
  return found;
}

describe("v6.3 success gate workstream-k benchmark evidence check", () => {
  it("marks check ok when workstream-k benchmark evidence is pass", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-v63-gate-k-evidence-ok-"));
    try {
      await scaffoldGateRoot(root);
      await writeText(
        resolve(root, "benchmarks/out/workstream-k-rust-benchmark-normalizer-perf.json"),
        JSON.stringify(
          {
            schemaVersion: 1,
            status: "pass",
            delta: { medianMs: -7, p95Ms: -4 },
            assertions: {
              nodeOutputStable: true,
              rustOutputStable: true,
              parityMatched: true,
              rustUsedEveryIteration: true,
            },
          },
          null,
          2,
        ),
      );

      const report = await evaluateSuccessGate({
        rootDir: root,
        outJsonPath: resolve(root, "out.json"),
        outMarkdownPath: resolve(root, "out.md"),
      });
      const check = checkStatus(report.checks, "workstream-k-rust-benchmark-evidence");
      expect(check.status).toBe("ok");
      expect(check.details).toContain("passing");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("marks check warn when workstream-k benchmark evidence is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-v63-gate-k-evidence-warn-"));
    try {
      await scaffoldGateRoot(root);
      const report = await evaluateSuccessGate({
        rootDir: root,
        outJsonPath: resolve(root, "out.json"),
        outMarkdownPath: resolve(root, "out.md"),
      });
      const check = checkStatus(report.checks, "workstream-k-rust-benchmark-evidence");
      expect(check.status).toBe("warn");
      expect(check.details).toContain("not found");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("marks check warn when evidence exists but median speedup is not met", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-v63-gate-k-evidence-no-speedup-"));
    try {
      await scaffoldGateRoot(root);
      await writeText(
        resolve(root, "benchmarks/out/workstream-k-rust-benchmark-normalizer-perf.json"),
        JSON.stringify(
          {
            schemaVersion: 1,
            status: "pass",
            delta: { medianMs: 22, p95Ms: 104 },
            assertions: {
              nodeOutputStable: true,
              rustOutputStable: true,
              parityMatched: true,
              rustUsedEveryIteration: true,
            },
          },
          null,
          2,
        ),
      );

      const report = await evaluateSuccessGate({
        rootDir: root,
        outJsonPath: resolve(root, "out.json"),
        outMarkdownPath: resolve(root, "out.md"),
      });
      const check = checkStatus(report.checks, "workstream-k-rust-benchmark-evidence");
      expect(check.status).toBe("warn");
      expect(check.details).toContain("speedup is not met");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
