import { createHash } from "node:crypto";
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

type Channel = "rc" | "ga" | "patch" | "canary";

type ParsedArgs = {
  readonly command: "generate";
  readonly outPath: string;
  readonly version: string;
  readonly channel: Channel;
  readonly gitCommit?: string;
  readonly assets: readonly string[];
  readonly gateReports: readonly string[];
};

type GateStatus = "ok" | "warn" | "error";

type GateSummary = {
  readonly id: string;
  readonly path: string;
  readonly status: GateStatus;
};

type ReleaseManifest = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly release: {
    readonly version: string;
    readonly channel: Channel;
    readonly gitCommit: string;
  };
  readonly assets: readonly {
    readonly path: string;
    readonly sha256: string;
    readonly sizeBytes: number;
  }[];
  readonly gateReports: readonly GateSummary[];
  readonly environment: {
    readonly nodeVersion: string;
    readonly platform: string;
    readonly packageManager: string;
  };
};

const execFileAsync = promisify(execFile);

function usage(): string {
  return [
    "Usage:",
    "  tsx scripts/v3-release-manifest.ts generate \\",
    "    --version <semver> --channel <rc|ga|patch|canary> \\",
    "    --asset <path> [--asset <path> ...] \\",
    "    --gate <path> [--gate <path> ...] \\",
    "    [--commit <sha>] [--out release/v3/release-manifest.generated.json]",
    "",
    "Example:",
    "  tsx scripts/v3-release-manifest.ts generate --version 3.0.0-rc.1 --channel rc \\",
    "    --asset dist/signaler-3.0.0-rc.1.tgz \\",
    "    --gate benchmarks/out/v3-release-gate.json --gate benchmarks/out/v63-success-gate.json",
  ].join("\n");
}

function parseChannel(value: string): Channel {
  if (value === "rc" || value === "ga" || value === "patch" || value === "canary") {
    return value;
  }
  throw new Error(`Invalid --channel '${value}'. Expected rc|ga|patch|canary.`);
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const command = argv[0];
  if (command !== "generate") {
    throw new Error(`Unknown command '${command ?? ""}'.\n${usage()}`);
  }
  let outPath = resolve("release/v3/release-manifest.generated.json");
  let version = "";
  let channel: Channel | undefined;
  let gitCommit: string | undefined;
  const assets: string[] = [];
  const gateReports: string[] = [];

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--out" && i + 1 < argv.length) {
      outPath = resolve(argv[i + 1] ?? outPath);
      i += 1;
      continue;
    }
    if (arg.startsWith("--out=")) {
      outPath = resolve(arg.slice("--out=".length));
      continue;
    }
    if (arg === "--version" && i + 1 < argv.length) {
      version = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg.startsWith("--version=")) {
      version = arg.slice("--version=".length);
      continue;
    }
    if (arg === "--channel" && i + 1 < argv.length) {
      channel = parseChannel(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg.startsWith("--channel=")) {
      channel = parseChannel(arg.slice("--channel=".length));
      continue;
    }
    if (arg === "--commit" && i + 1 < argv.length) {
      gitCommit = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg.startsWith("--commit=")) {
      gitCommit = arg.slice("--commit=".length);
      continue;
    }
    if (arg === "--asset" && i + 1 < argv.length) {
      assets.push(resolve(argv[i + 1] ?? ""));
      i += 1;
      continue;
    }
    if (arg.startsWith("--asset=")) {
      assets.push(resolve(arg.slice("--asset=".length)));
      continue;
    }
    if (arg === "--gate" && i + 1 < argv.length) {
      gateReports.push(resolve(argv[i + 1] ?? ""));
      i += 1;
      continue;
    }
    if (arg.startsWith("--gate=")) {
      gateReports.push(resolve(arg.slice("--gate=".length)));
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.\n${usage()}`);
  }

  if (version.trim().length === 0) {
    throw new Error(`Missing --version.\n${usage()}`);
  }
  if (channel === undefined) {
    throw new Error(`Missing --channel.\n${usage()}`);
  }
  if (assets.length === 0) {
    throw new Error(`At least one --asset is required.\n${usage()}`);
  }
  if (gateReports.length === 0) {
    throw new Error(`At least one --gate is required.\n${usage()}`);
  }

  return {
    command,
    outPath,
    version,
    channel,
    gitCommit,
    assets,
    gateReports,
  };
}

async function sha256(pathToFile: string): Promise<string> {
  const hash = createHash("sha256");
  hash.update(await readFile(pathToFile));
  return hash.digest("hex");
}

async function resolveGitCommit(explicitCommit?: string): Promise<string> {
  if (explicitCommit !== undefined && explicitCommit.trim().length > 0) {
    return explicitCommit.trim();
  }
  if (process.env.GIT_COMMIT_SHA !== undefined && process.env.GIT_COMMIT_SHA.trim().length > 0) {
    return process.env.GIT_COMMIT_SHA.trim();
  }
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: resolve(".") });
    const commit = stdout.trim();
    if (commit.length >= 7) {
      return commit;
    }
  } catch {
    // fallback below
  }
  return "unknown";
}

async function readGateSummary(pathToFile: string): Promise<GateSummary> {
  const raw = await readFile(pathToFile, "utf8");
  const parsed = JSON.parse(raw) as { readonly status?: unknown };
  const status = parsed.status;
  const normalized: GateStatus = status === "ok" || status === "warn" || status === "error" ? status : "error";
  return {
    id: pathToFile.toLowerCase().includes("v63") ? "v63-success-gate" : pathToFile.toLowerCase().includes("v3-release") ? "v3-release-phase1" : "custom-gate",
    path: pathToFile,
    status: normalized,
  };
}

function detectPackageManager(): string {
  if (process.env.npm_config_user_agent !== undefined) {
    const value = process.env.npm_config_user_agent;
    if (value.startsWith("pnpm/")) return "pnpm";
    if (value.startsWith("npm/")) return "npm";
    if (value.startsWith("yarn/")) return "yarn";
  }
  return "unknown";
}

async function generateManifest(args: ParsedArgs): Promise<ReleaseManifest> {
  const assets = await Promise.all(args.assets.map(async (assetPath) => {
    const fileStat = await stat(assetPath);
    return {
      path: assetPath,
      sha256: await sha256(assetPath),
      sizeBytes: fileStat.size,
    };
  }));
  const gates = await Promise.all(args.gateReports.map((pathToFile) => readGateSummary(pathToFile)));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    release: {
      version: args.version,
      channel: args.channel,
      gitCommit: await resolveGitCommit(args.gitCommit),
    },
    assets,
    gateReports: gates,
    environment: {
      nodeVersion: process.version,
      platform: `${process.platform}-${process.arch}`,
      packageManager: detectPackageManager(),
    },
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.command !== "generate") {
    throw new Error(`Unsupported command '${args.command}'.`);
  }
  const manifest = await generateManifest(args);
  await mkdir(dirname(args.outPath), { recursive: true });
  await writeFile(args.outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`[v3-manifest] written ${args.outPath}`);
  console.log(`[v3-manifest] assets=${manifest.assets.length} gateReports=${manifest.gateReports.length}`);
}

const SCRIPT_PATH = fileURLToPath(import.meta.url);

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[v3-manifest] ${message}`);
    process.exitCode = 1;
  });
}

export type { Channel, ParsedArgs, GateStatus, GateSummary, ReleaseManifest };
export { parseArgs, parseChannel, resolveGitCommit, readGateSummary, detectPackageManager, generateManifest };
