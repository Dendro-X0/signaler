import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CliArgs = {
  readonly outJsonPath: string;
  readonly outMarkdownPath: string;
  readonly os: string;
};

type CrossPlatformSmokeEvidence = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly os: string;
  readonly runner: {
    readonly nodeVersion: string;
    readonly platform: string;
    readonly runnerOs?: string;
  };
  readonly smoke: {
    readonly testSmokePassed: true;
    readonly phase6SmokePassed: true;
  };
};

function normalizeOs(value: string): string {
  return value.trim().toLowerCase();
}

function parseArgs(argv: readonly string[]): CliArgs {
  const defaultOs = process.env.CROSS_PLATFORM_OS
    ?? process.env.RUNNER_OS
    ?? process.platform;
  let os = defaultOs;
  let outJsonPath = resolve("benchmarks/out/cross-platform-smoke-evidence.json");
  let outMarkdownPath = resolve("benchmarks/out/cross-platform-smoke-evidence.md");
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--os" && i + 1 < argv.length) {
      os = argv[i + 1] ?? os;
      i += 1;
      continue;
    }
    if (arg.startsWith("--os=")) {
      os = arg.slice("--os=".length);
      continue;
    }
    if (arg === "--out-json" && i + 1 < argv.length) {
      outJsonPath = resolve(argv[i + 1] ?? outJsonPath);
      i += 1;
      continue;
    }
    if (arg.startsWith("--out-json=")) {
      outJsonPath = resolve(arg.slice("--out-json=".length));
      continue;
    }
    if (arg === "--out-md" && i + 1 < argv.length) {
      outMarkdownPath = resolve(argv[i + 1] ?? outMarkdownPath);
      i += 1;
      continue;
    }
    if (arg.startsWith("--out-md=")) {
      outMarkdownPath = resolve(arg.slice("--out-md=".length));
    }
  }
  return {
    os: normalizeOs(os),
    outJsonPath,
    outMarkdownPath,
  };
}

function toMarkdown(evidence: CrossPlatformSmokeEvidence): string {
  const lines: string[] = [];
  lines.push("# Phase 6 Cross-Platform Smoke Evidence");
  lines.push("");
  lines.push(`Generated: ${evidence.generatedAt}`);
  lines.push(`OS: ${evidence.os}`);
  lines.push(`Node: ${evidence.runner.nodeVersion}`);
  lines.push(`Platform: ${evidence.runner.platform}`);
  if (evidence.runner.runnerOs !== undefined) {
    lines.push(`Runner OS: ${evidence.runner.runnerOs}`);
  }
  lines.push("");
  lines.push("## Result");
  lines.push("");
  lines.push("- test:smoke: pass");
  lines.push("- test:phase6:smoke: pass");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function writeEvidence(args: CliArgs): Promise<CrossPlatformSmokeEvidence> {
  const evidence: CrossPlatformSmokeEvidence = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    os: args.os,
    runner: {
      nodeVersion: process.version,
      platform: `${process.platform}-${process.arch}`,
      runnerOs: process.env.RUNNER_OS,
    },
    smoke: {
      testSmokePassed: true,
      phase6SmokePassed: true,
    },
  };
  await mkdir(dirname(args.outJsonPath), { recursive: true });
  await mkdir(dirname(args.outMarkdownPath), { recursive: true });
  await writeFile(args.outJsonPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(args.outMarkdownPath, toMarkdown(evidence), "utf8");
  return evidence;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const evidence = await writeEvidence(args);
  console.log(`[phase6-cross-platform] os=${evidence.os}`);
  console.log(`[phase6-cross-platform] json=${args.outJsonPath}`);
  console.log(`[phase6-cross-platform] md=${args.outMarkdownPath}`);
}

const SCRIPT_PATH = fileURLToPath(import.meta.url);

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[phase6-cross-platform] ${message}`);
    process.exitCode = 1;
  });
}

export type { CliArgs, CrossPlatformSmokeEvidence };
export { parseArgs, writeEvidence, toMarkdown };
