#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function parseArgs(argv = process.argv.slice(2)) {
  const parsed = {
    version: undefined,
    outDir: "release",
    skipBuild: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? "";
    if (token === "--") {
      continue;
    }
    if (token === "--version" && index + 1 < argv.length) {
      parsed.version = argv[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--version=")) {
      parsed.version = token.slice("--version=".length);
      continue;
    }
    if (token === "--out-dir" && index + 1 < argv.length) {
      parsed.outDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--out-dir=")) {
      parsed.outDir = token.slice("--out-dir=".length);
      continue;
    }
    if (token === "--skip-build") {
      parsed.skipBuild = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return parsed;
}

function printHelp() {
  console.log("Create Signaler portable release assets");
  console.log("");
  console.log("Usage:");
  console.log("  node scripts/create-portable-release.js [--version <semver>] [--out-dir <dir>] [--skip-build]");
}

function repoRoot() {
  return resolve(fileURLToPath(new URL("..", import.meta.url)));
}

function readPackageVersion(root) {
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  if (!packageJson || typeof packageJson.version !== "string" || packageJson.version.trim().length === 0) {
    throw new Error("package.json is missing a valid version.");
  }
  return packageJson.version;
}

function runOrFail(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: options.cwd,
    shell: process.platform === "win32" && command.toLowerCase().endsWith(".cmd"),
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status ?? 1}`);
  }
}

function npmCommand(base) {
  return process.platform === "win32" ? `${base}.cmd` : base;
}

function ensureExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`Missing required ${label}: ${path}`);
  }
}

export function createRuntimePackageJson(packageJson) {
  const dependencies = { ...(packageJson.dependencies ?? {}) };
  delete dependencies["@signaler/cli"];

  return {
    name: "@signaler/cli-portable",
    private: true,
    version: packageJson.version,
    description: packageJson.description,
    type: packageJson.type ?? "module",
    license: packageJson.license,
    engines: packageJson.engines,
    dependencies,
  };
}

function createLauncherFiles(packageRoot) {
  const bashLauncher = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "ROOT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"",
    "exec node \"$ROOT_DIR/dist/bin.js\" \"$@\"",
    "",
  ].join("\n");

  const cmdLauncher = [
    "@echo off",
    "setlocal",
    "node \"%~dp0dist\\bin.js\" %*",
    "",
  ].join("\r\n");

  writeFileSync(resolve(packageRoot, "signaler"), bashLauncher, "utf8");
  writeFileSync(resolve(packageRoot, "signalar"), bashLauncher, "utf8");
  writeFileSync(resolve(packageRoot, "signaler.cmd"), cmdLauncher, "ascii");
  writeFileSync(resolve(packageRoot, "signalar.cmd"), cmdLauncher, "ascii");

  if (process.platform !== "win32") {
    runOrFail("chmod", ["+x", resolve(packageRoot, "signaler")]);
    runOrFail("chmod", ["+x", resolve(packageRoot, "signalar")]);
  }
}

function createInstallReadme(packageRoot, version) {
  const content = [
    `Signaler CLI v${version} - Portable Install`,
    "=======================================",
    "",
    "Requirements:",
    "- Node.js 18 or higher",
    "",
    "Use one of these commands after extracting or installing through the GitHub Release installer:",
    "",
    "  signaler --version",
    "  signalar --version",
    "",
    "Global lifecycle commands:",
    "",
    "  signaler upgrade",
    "  signaler uninstall --global",
    "",
    "This portable package is intended for the GitHub Release installer flow.",
    "",
  ].join("\n");
  writeFileSync(resolve(packageRoot, "INSTALL.txt"), content, "utf8");
}

function buildPortablePackage({ root, version, outDir, skipBuild }) {
  const releaseDir = resolve(root, outDir);
  const packageDirName = `signaler-${version}-portable`;
  const packageRoot = resolve(releaseDir, packageDirName);
  const zipPath = resolve(releaseDir, `${packageDirName}.zip`);

  rmSync(packageRoot, { recursive: true, force: true });
  rmSync(zipPath, { force: true });
  mkdirSync(packageRoot, { recursive: true });

  if (!skipBuild) {
    console.log("[portable-release] building package...");
    runOrFail(npmCommand("pnpm"), ["run", "build"], { cwd: root });
  }

  const sourcePackageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const runtimePackageJson = createRuntimePackageJson(sourcePackageJson);

  const filesToCopy = [
    "dist",
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
  ];

  for (const relativePath of filesToCopy) {
    const sourcePath = resolve(root, relativePath);
    if (!existsSync(sourcePath)) {
      if (relativePath === "LICENSE") {
        continue;
      }
      throw new Error(`Missing release input: ${relativePath}`);
    }
    cpSync(sourcePath, resolve(packageRoot, relativePath), { recursive: true });
  }

  writeFileSync(resolve(packageRoot, "package.json"), `${JSON.stringify(runtimePackageJson, null, 2)}\n`, "utf8");

  createLauncherFiles(packageRoot);
  createInstallReadme(packageRoot, version);

  console.log("[portable-release] creating portable zip...");
  if (process.platform === "win32") {
    runOrFail("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Compress-Archive -LiteralPath "${packageRoot}" -DestinationPath "${zipPath}" -Force`,
    ]);
  } else if (existsSync("/usr/bin/zip") || existsSync("/bin/zip")) {
    runOrFail("zip", ["-qr", zipPath, basename(packageRoot)], { cwd: releaseDir });
  } else {
    runOrFail("python3", [
      "-c",
      [
        "import os, sys, zipfile",
        "root, out = sys.argv[1], sys.argv[2]",
        "base = os.path.dirname(root)",
        "with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:",
        "  for current, _, files in os.walk(root):",
        "    for name in files:",
        "      path = os.path.join(current, name)",
        "      z.write(path, os.path.relpath(path, base))",
      ].join("; "),
      packageRoot,
      zipPath,
    ]);
  }

  return {
    packageRoot,
    zipPath,
  };
}

export function runCreatePortableRelease(rawArgs = process.argv.slice(2)) {
  const args = parseArgs(rawArgs);
  const root = repoRoot();
  const version = args.version ?? readPackageVersion(root);
  const result = buildPortablePackage({
    root,
    version,
    outDir: args.outDir,
    skipBuild: args.skipBuild,
  });

  ensureExists(result.zipPath, "portable zip");
  console.log(`[portable-release] zip: ${result.zipPath}`);
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
  : false;

if (isMain) {
  try {
    runCreatePortableRelease();
  } catch (error) {
    console.error(`[portable-release] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
