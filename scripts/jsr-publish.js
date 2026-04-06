#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function printHelp() {
  console.log("Signaler JSR publish helper");
  console.log("");
  console.log("Usage:");
  console.log("  pnpm run jsr:publish -- [options]");
  console.log("");
  console.log("Options:");
  console.log("  --skip-build           Skip `pnpm build` before publish");
  console.log("  --dry-run              Validate environment and print publish command without executing it");
  console.log("  --allow-slow-types     Pass through to `jsr publish` (enabled by default)");
  console.log("  --help                 Show this help");
}

export function parseArgs(argv = process.argv.slice(2)) {
  const parsed = {
    skipBuild: false,
    dryRun: false,
    allowSlowTypes: true,
  };
  for (const token of argv) {
    if (token === "--") {
      continue;
    }
    if (token === "--skip-build") {
      parsed.skipBuild = true;
      continue;
    }
    if (token === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (token === "--allow-slow-types") {
      parsed.allowSlowTypes = true;
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

export function validatePublishContext(cwd = process.cwd()) {
  const jsrPath = resolve(cwd, "jsr.json");
  const pkgPath = resolve(cwd, "package.json");
  if (!existsSync(jsrPath) || !existsSync(pkgPath)) {
    const nestedSignalerPath = resolve(cwd, "signaler", "jsr.json");
    const hint = existsSync(nestedSignalerPath)
      ? `Try: cd "${resolve(cwd, "signaler")}" and rerun.`
      : "Run this command from the signaler package root (the directory containing jsr.json).";
    return {
      ok: false,
      reason: "Missing jsr.json or package.json in current working directory.",
      hint,
    };
  }

  let pkg;
  let jsr;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    jsr = JSON.parse(readFileSync(jsrPath, "utf8"));
  } catch {
    return {
      ok: false,
      reason: "Failed to parse package.json or jsr.json.",
      hint: "Ensure both files are valid JSON and retry.",
    };
  }

  if (typeof pkg.version !== "string" || typeof jsr.version !== "string") {
    return {
      ok: false,
      reason: "Missing `version` in package.json or jsr.json.",
      hint: "Set matching semver versions before publishing.",
    };
  }

  if (pkg.version !== jsr.version) {
    return {
      ok: false,
      reason: `Version mismatch: package.json=${pkg.version}, jsr.json=${jsr.version}.`,
      hint: "Synchronize versions, commit, then publish.",
    };
  }

  return {
    ok: true,
    version: pkg.version,
  };
}

function runOrFail(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(`[jsr-publish] Failed to execute ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    const code = typeof result.status === "number" ? result.status : 1;
    process.exit(code);
  }
}

function npmCommand(base) {
  return process.platform === "win32" ? `${base}.cmd` : base;
}

export function runPublish(rawArgs = process.argv.slice(2)) {
  const args = parseArgs(rawArgs);
  const context = validatePublishContext(process.cwd());
  if (!context.ok) {
    console.error(`[jsr-publish] ${context.reason}`);
    console.error(`[jsr-publish] ${context.hint}`);
    process.exit(1);
  }

  const publishArgs = ["jsr", "publish"];
  if (args.allowSlowTypes) {
    publishArgs.push("--allow-slow-types");
  }

  console.log(`[jsr-publish] package version: ${context.version}`);
  console.log(`[jsr-publish] working dir: ${process.cwd()}`);

  if (args.dryRun) {
    console.log("[jsr-publish] dry-run enabled; skipping build/publish execution.");
    console.log(`[jsr-publish] publish command: npx ${publishArgs.join(" ")}`);
    return;
  }

  if (!args.skipBuild) {
    console.log("[jsr-publish] building package...");
    runOrFail(npmCommand("pnpm"), ["build"]);
  } else {
    console.log("[jsr-publish] skipping build (--skip-build).");
  }

  console.log("[jsr-publish] publishing to JSR...");
  runOrFail(npmCommand("npx"), publishArgs);
  console.log(`[jsr-publish] publish completed for @signaler/cli@${context.version}`);
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
  : false;

if (isMain) {
  try {
    runPublish();
  } catch (error) {
    console.error(`[jsr-publish] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
