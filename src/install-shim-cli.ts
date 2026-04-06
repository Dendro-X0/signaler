import { chmod, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, join, resolve } from "node:path";

type InstallShimArgs = {
  readonly targetDir: string;
  readonly force: boolean;
  readonly dryRun: boolean;
  readonly json: boolean;
  readonly help: boolean;
};

type InstallShimResult = {
  readonly ok: boolean;
  readonly targetDir: string;
  readonly files: readonly string[];
  readonly dryRun: boolean;
  readonly inPath: boolean;
  readonly pathHint?: string;
};

function parseArgs(argv: readonly string[]): InstallShimArgs {
  let targetDir: string | undefined;
  let force = false;
  let dryRun = false;
  let json = false;
  let help = false;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--dir" && i + 1 < argv.length) {
      targetDir = resolve(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg.startsWith("--dir=")) {
      targetDir = resolve(arg.slice("--dir=".length));
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
  }

  return {
    targetDir: targetDir ?? defaultTargetDir(),
    force,
    dryRun,
    json,
    help,
  };
}

function defaultTargetDir(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (typeof appData === "string" && appData.trim().length > 0) {
      return resolve(appData, "npm");
    }
  }
  return resolve(homedir(), ".local", "bin");
}

function buildBashShim(): string {
  return [
    "#!/usr/bin/env bash",
    "# Signaler shim: allows direct `signaler` command from shell",
    "exec npx jsr run @signaler/cli \"$@\"",
    "",
  ].join("\n");
}

function buildCmdShim(): string {
  return [
    "@echo off",
    "REM Signaler shim: allows direct `signaler` command from shell",
    "npx jsr run @signaler/cli %*",
    "",
  ].join("\r\n");
}

function isInPath(pathToCheck: string): boolean {
  const rawPath = process.env.PATH;
  if (typeof rawPath !== "string" || rawPath.length === 0) return false;
  const normalizedTarget = process.platform === "win32" ? pathToCheck.toLowerCase() : pathToCheck;
  const entries = rawPath.split(delimiter).filter((row) => row.length > 0);
  return entries.some((entry) => {
    const normalizedEntry = process.platform === "win32" ? entry.toLowerCase() : entry;
    return normalizedEntry === normalizedTarget;
  });
}

function printHelp(): void {
  console.log(
    [
      "Usage:",
      "  signaler install-shim [--dir <path>] [--force] [--dry-run] [--json]",
      "",
      "Description:",
      "  Installs a lightweight shell wrapper so `signaler` works directly after JSR installs.",
      "",
      "Defaults:",
      `  Windows: ${join("%APPDATA%", "npm")}`,
      "  Unix/macOS: ~/.local/bin",
    ].join("\n"),
  );
}

function pathHint(targetDir: string): string {
  if (process.platform === "win32") {
    return `Add '${targetDir}' to PATH if needed (PowerShell: setx PATH \"$env:PATH;${targetDir}\").`;
  }
  return `Add '${targetDir}' to PATH if needed (bash/zsh: export PATH=\"${targetDir}:$PATH\").`;
}

async function installShim(args: InstallShimArgs): Promise<InstallShimResult> {
  const targetDir = args.targetDir;
  const files: string[] = [];
  const bashPath = resolve(targetDir, "signaler");
  const cmdPath = resolve(targetDir, "signaler.cmd");

  files.push(bashPath);
  if (process.platform === "win32") {
    files.push(cmdPath);
  }

  if (!args.dryRun) {
    await mkdir(targetDir, { recursive: true });
    await writeFile(bashPath, buildBashShim(), { encoding: "utf8", flag: args.force ? "w" : "wx" });
    try {
      await chmod(bashPath, 0o755);
    } catch {
      // Non-fatal on environments that do not support chmod.
    }

    if (process.platform === "win32") {
      await writeFile(cmdPath, buildCmdShim(), { encoding: "utf8", flag: args.force ? "w" : "wx" });
    }
  }

  const inPath = isInPath(targetDir);
  return {
    ok: true,
    targetDir,
    files,
    dryRun: args.dryRun,
    inPath,
    pathHint: inPath ? undefined : pathHint(targetDir),
  };
}

export async function runInstallShimCli(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  try {
    const result = await installShim(args);
    if (args.json) {
      console.log(JSON.stringify(result));
      return;
    }
    console.log(`${result.dryRun ? "Planned" : "Installed"} Signaler shim in ${result.targetDir}`);
    for (const filePath of result.files) {
      console.log(`- ${filePath}`);
    }
    if (result.pathHint) {
      console.log(result.pathHint);
    }
    console.log("Try: signaler --version");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (args.json) {
      console.log(JSON.stringify({ ok: false, error: message }));
    } else {
      console.error(`[install-shim] ${message}`);
      if (!args.force) {
        console.error("Use --force to overwrite existing shim files.");
      }
    }
    process.exitCode = 1;
  }
}

export type { InstallShimArgs, InstallShimResult };
export { parseArgs as parseInstallShimArgs };
export { installShim };
