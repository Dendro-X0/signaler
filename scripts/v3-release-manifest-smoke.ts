import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateManifest, type Channel, type ParsedArgs } from "./v3-release-manifest.js";
import { parseArgs as parseValidateArgs, validateReleaseManifestFile } from "./v3-release-manifest-validate.js";

type SmokeArgs = {
  readonly outManifestPath: string;
  readonly packDir: string;
  readonly version?: string;
  readonly channel?: Channel;
  readonly rootDir: string;
};

function usage(): string {
  return [
    "Usage:",
    "  tsx scripts/v3-release-manifest-smoke.ts [flags]",
    "",
    "Flags:",
    "  --out <path>      Output manifest path (default release/v3/release-manifest.generated.json)",
    "  --pack-dir <path> Pack destination dir for tgz artifact (default release/v3/tmp)",
    "  --version <semver> Optional manifest release.version override (default package.json version)",
    "  --channel <rc|ga|patch|canary> Optional channel override",
    "  --root <path>     Root directory (default .)",
  ].join("\n");
}

function parseSmokeArgs(argv: readonly string[]): SmokeArgs {
  let outManifestPath = resolve("release/v3/release-manifest.generated.json");
  let packDir = resolve("release/v3/tmp");
  let version: string | undefined;
  let channel: Channel | undefined;
  let rootDir = resolve(".");

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--out" && i + 1 < argv.length) {
      outManifestPath = resolve(argv[i + 1] ?? outManifestPath);
      i += 1;
      continue;
    }
    if (arg.startsWith("--out=")) {
      outManifestPath = resolve(arg.slice("--out=".length));
      continue;
    }
    if (arg === "--pack-dir" && i + 1 < argv.length) {
      packDir = resolve(argv[i + 1] ?? packDir);
      i += 1;
      continue;
    }
    if (arg.startsWith("--pack-dir=")) {
      packDir = resolve(arg.slice("--pack-dir=".length));
      continue;
    }
    if (arg === "--version" && i + 1 < argv.length) {
      version = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--version=")) {
      version = arg.slice("--version=".length);
      continue;
    }
    if (arg === "--channel" && i + 1 < argv.length) {
      const candidate = argv[i + 1] as Channel;
      if (candidate !== "rc" && candidate !== "ga" && candidate !== "patch" && candidate !== "canary") {
        throw new Error(`Invalid --channel '${candidate}'. Expected rc|ga|patch|canary.`);
      }
      channel = candidate;
      i += 1;
      continue;
    }
    if (arg.startsWith("--channel=")) {
      const candidate = arg.slice("--channel=".length) as Channel;
      if (candidate !== "rc" && candidate !== "ga" && candidate !== "patch" && candidate !== "canary") {
        throw new Error(`Invalid --channel '${candidate}'. Expected rc|ga|patch|canary.`);
      }
      channel = candidate;
      continue;
    }
    if (arg === "--root" && i + 1 < argv.length) {
      rootDir = resolve(argv[i + 1] ?? rootDir);
      i += 1;
      continue;
    }
    if (arg.startsWith("--root=")) {
      rootDir = resolve(arg.slice("--root=".length));
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.\n${usage()}`);
  }

  return { outManifestPath, packDir, version, channel, rootDir };
}

async function runProcess(params: {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly shell?: boolean;
}): Promise<void> {
  await new Promise<void>((resolveProcess, rejectProcess) => {
    const child = spawn(params.command, params.args, {
      cwd: params.cwd,
      shell: params.shell ?? false,
      stdio: "inherit",
    });
    child.on("error", rejectProcess);
    child.on("close", (code) => {
      if (code === 0) {
        resolveProcess();
        return;
      }
      rejectProcess(new Error(`${params.command} exited with code ${code ?? 1}`));
    });
  });
}

function inferChannelFromVersion(version: string): Channel {
  const normalized = version.toLowerCase();
  if (normalized.includes("-rc.")) return "rc";
  if (normalized.includes("canary")) return "canary";
  if (normalized.includes("-")) return "patch";
  return "ga";
}

async function readPackageVersion(rootDir: string): Promise<string> {
  const raw = await readFile(resolve(rootDir, "package.json"), "utf8");
  const parsed = JSON.parse(raw) as { readonly version?: unknown };
  if (typeof parsed.version !== "string" || parsed.version.length === 0) {
    throw new Error("package.json version is missing.");
  }
  return parsed.version;
}

async function resolveLatestTgz(packDir: string): Promise<string> {
  const entries = await readdir(packDir, { withFileTypes: true });
  const tgzFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".tgz"));
  if (tgzFiles.length === 0) {
    throw new Error(`No .tgz files found in ${packDir}.`);
  }
  const withStats = await Promise.all(
    tgzFiles.map(async (entry) => {
      const fullPath = resolve(packDir, entry.name);
      const fileStat = await stat(fullPath);
      return { fullPath, mtimeMs: fileStat.mtimeMs };
    }),
  );
  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return withStats[0]?.fullPath ?? resolve(packDir, tgzFiles[0]!.name);
}

async function main(): Promise<void> {
  const args = parseSmokeArgs(process.argv.slice(2));
  await mkdir(args.packDir, { recursive: true });
  const packDestinationArg = relative(args.rootDir, args.packDir).replace(/\\/g, "/");
  if (process.platform === "win32") {
    await runProcess({
      command: "cmd.exe",
      args: ["/d", "/c", `npm pack --silent --pack-destination ${packDestinationArg}`],
      cwd: args.rootDir,
    });
  } else {
    await runProcess({
      command: "npm",
      args: ["pack", "--silent", "--pack-destination", packDestinationArg],
      cwd: args.rootDir,
    });
  }

  const tgzPath = await resolveLatestTgz(args.packDir);
  const version = args.version ?? await readPackageVersion(args.rootDir);
  const channel = args.channel ?? inferChannelFromVersion(version);

  const requiredGateReports = [
    resolve(args.rootDir, "benchmarks/out/v3-release-gate.json"),
    resolve(args.rootDir, "benchmarks/out/v63-success-gate.json"),
  ];
  const manifestArgs: ParsedArgs = {
    command: "generate",
    outPath: args.outManifestPath,
    version,
    channel,
    assets: [tgzPath, requiredGateReports[0]],
    gateReports: requiredGateReports,
  };
  const manifest = await generateManifest(manifestArgs);
  await mkdir(dirname(args.outManifestPath), { recursive: true });
  await writeFile(args.outManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const validateArgs = parseValidateArgs([
    "--manifest",
    args.outManifestPath,
    "--root",
    args.rootDir,
  ]);
  const validation = await validateReleaseManifestFile(validateArgs);
  if (!validation.ok) {
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    for (const warning of validation.warnings) {
      console.warn(`- [warn] ${warning}`);
    }
    process.exitCode = 1;
    return;
  }
  for (const warning of validation.warnings) {
    console.warn(`- [warn] ${warning}`);
  }
  console.log(`[v3-manifest-smoke] written ${args.outManifestPath}`);
  console.log(`[v3-manifest-smoke] tgz=${tgzPath}`);
  console.log("[v3-manifest-smoke] manifest policy validation passed");
}

const SCRIPT_PATH = fileURLToPath(import.meta.url);

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[v3-manifest-smoke] ${message}`);
    process.exitCode = 1;
  });
}

export { parseSmokeArgs, inferChannelFromVersion, resolveLatestTgz };
export type { SmokeArgs };
