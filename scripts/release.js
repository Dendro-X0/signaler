#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REPORT_PATH = "release/v3/release-preflight.json";
const STATUS_OK = "ok";
const STATUS_WARN = "warn";
const STATUS_ERROR = "error";

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

const CROSS_PLATFORM_FILES = [
  "benchmarks/out/cross-platform-smoke-ubuntu-latest.json",
  "benchmarks/out/cross-platform-smoke-windows-latest.json",
  "benchmarks/out/cross-platform-smoke-macos-latest.json",
];
const WORKSTREAM_J_OVERHEAD_FILE =
  "benchmarks/out/workstream-j-optional-input-overhead.json";

const PRE_FLIGHT_COMMANDS = [
  "pnpm run bench:v3:phase1",
  "pnpm run bench:v3:phase2",
  "pnpm run test:phase6:gate",
  "pnpm run bench:phase6:gate",
  "pnpm run bench:phase6:validate",
  "pnpm run bench:v63:gate",
  "pnpm run bench:v63:validate",
];

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

export function parseArgs(argv) {
  const parsed = {
    dryRun: false,
    skipCommands: false,
    requireCrossPlatform: false,
    strict: false,
    reportPath: DEFAULT_REPORT_PATH,
    targetVersion: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case "--":
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--skip-commands":
        parsed.skipCommands = true;
        break;
      case "--require-cross-platform":
        parsed.requireCrossPlatform = true;
        break;
      case "--strict":
        parsed.strict = true;
        break;
      case "--report":
        parsed.reportPath = argv[i + 1] ?? parsed.reportPath;
        i += 1;
        break;
      case "--target-version":
        parsed.targetVersion = argv[i + 1];
        i += 1;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return parsed;
}

function printHelp() {
  console.log("Signaler V3 release preflight");
  console.log("");
  console.log("Usage:");
  console.log("  pnpm run release -- [options]");
  console.log("");
  console.log("Options:");
  console.log("  --dry-run                  Do not execute preflight commands");
  console.log("  --skip-commands            Validate files/reports only");
  console.log("  --require-cross-platform   Fail when cross-platform evidence is missing");
  console.log("  --strict                   Treat warning-level gate statuses as failures");
  console.log("  --target-version <semver>  Optional release candidate version to track");
  console.log(
    `  --report <path>            Output JSON report path (default: ${DEFAULT_REPORT_PATH})`,
  );
}

function evaluatePathChecks(paths, description, checks, failures) {
  for (const relPath of paths) {
    const exists = existsSync(resolve(relPath));
    checks.push({
      id: `${description}:${relPath}`,
      status: exists ? STATUS_OK : STATUS_ERROR,
      blocking: true,
      details: exists ? "Found required file." : "Missing required file.",
    });
    if (!exists) failures.push(`Missing required ${description} file: ${relPath}`);
  }
}

function evaluateGateReports(gatePaths, strict, checks, warnings, failures) {
  for (const gatePath of gatePaths) {
    if (!existsSync(resolve(gatePath))) {
      checks.push({
        id: `gate:${gatePath}`,
        status: STATUS_ERROR,
        blocking: true,
        details: "Gate report file is missing.",
      });
      failures.push(`Missing gate report: ${gatePath}`);
      continue;
    }

    const gate = readJson(gatePath);
    const status = gate?.status;
    const normalizedStatus =
      status === STATUS_OK || status === STATUS_WARN ? status : STATUS_ERROR;

    checks.push({
      id: `gate:${gatePath}`,
      status: normalizedStatus,
      blocking: true,
      details: `Gate status: ${String(status ?? "unknown")}.`,
    });

    if (normalizedStatus === STATUS_ERROR) {
      failures.push(`Gate failed: ${gatePath} (status=${String(status ?? "unknown")})`);
      continue;
    }

    if (normalizedStatus === STATUS_WARN) {
      const warningMessage = `Gate warning: ${gatePath} (status=warn)`;
      if (strict) {
        failures.push(`${warningMessage}; strict mode requires status=ok.`);
      } else {
        warnings.push(warningMessage);
      }
    }
  }
}

function evaluateCrossPlatformEvidence(requireCrossPlatform, checks, warnings, failures) {
  const missing = [];
  for (const relPath of CROSS_PLATFORM_FILES) {
    if (!existsSync(resolve(relPath))) missing.push(relPath);
  }

  if (missing.length === 0) {
    checks.push({
      id: "cross-platform-evidence",
      status: STATUS_OK,
      blocking: requireCrossPlatform,
      details: "Found Windows/macOS/Linux smoke evidence artifacts.",
    });
    return;
  }

  const details = `Missing cross-platform evidence files: ${missing.join(", ")}`;
  if (requireCrossPlatform) {
    checks.push({
      id: "cross-platform-evidence",
      status: STATUS_ERROR,
      blocking: true,
      details,
    });
    failures.push(details);
    return;
  }

  checks.push({
    id: "cross-platform-evidence",
    status: STATUS_WARN,
    blocking: false,
    details,
  });
  warnings.push(`${details}. Run CI matrix before GA tag.`);
}

function evaluateWorkstreamJOverheadEvidence(checks, warnings) {
  const overheadPath = resolve(WORKSTREAM_J_OVERHEAD_FILE);
  if (!existsSync(overheadPath)) {
    const details = `Workstream J overhead evidence not found (${WORKSTREAM_J_OVERHEAD_FILE}).`;
    checks.push({
      id: "workstream-j-overhead-evidence",
      status: STATUS_WARN,
      blocking: false,
      details,
    });
    warnings.push(`${details} Run \`pnpm run bench:workstream-j:overhead\` before release review.`);
    return { status: STATUS_WARN, details };
  }

  let parsed;
  try {
    parsed = readJson(WORKSTREAM_J_OVERHEAD_FILE);
  } catch {
    const details = `Workstream J overhead evidence is unreadable (${WORKSTREAM_J_OVERHEAD_FILE}).`;
    checks.push({
      id: "workstream-j-overhead-evidence",
      status: STATUS_WARN,
      blocking: false,
      details,
    });
    warnings.push(`${details} Re-generate evidence with \`pnpm run bench:workstream-j:overhead\`.`);
    return { status: STATUS_WARN, details };
  }

  const hasSchema = parsed?.schemaVersion === 1;
  const hasStatus = parsed?.status === "pass" || parsed?.status === "fail";
  const hasMedian = typeof parsed?.overhead?.medianMs === "number";
  const hasP95 = typeof parsed?.overhead?.p95Ms === "number";
  if (!hasSchema || !hasStatus || !hasMedian || !hasP95) {
    const details = "Workstream J overhead evidence format is invalid.";
    checks.push({
      id: "workstream-j-overhead-evidence",
      status: STATUS_WARN,
      blocking: false,
      details,
    });
    warnings.push(`${details} Re-generate evidence with \`pnpm run bench:workstream-j:overhead\`.`);
    return { status: STATUS_WARN, details };
  }

  if (parsed.status === "pass") {
    const details =
      `Workstream J overhead evidence is passing (median=${Math.round(parsed.overhead.medianMs)}ms, ` +
      `p95=${Math.round(parsed.overhead.p95Ms)}ms).`;
    checks.push({
      id: "workstream-j-overhead-evidence",
      status: STATUS_OK,
      blocking: false,
      details,
    });
    return { status: STATUS_OK, details };
  }

  const details = "Workstream J overhead evidence exists but status is fail.";
  checks.push({
    id: "workstream-j-overhead-evidence",
    status: STATUS_WARN,
    blocking: false,
    details,
  });
  warnings.push(`${details} Investigate optional-input overhead before release.`);
  return { status: STATUS_WARN, details };
}

function runCommands(commands, dryRun, results, failures) {
  for (const command of commands) {
    if (dryRun) {
      results.push({ command, status: "skipped-dry-run" });
      continue;
    }

    try {
      execSync(command, { stdio: "inherit" });
      results.push({ command, status: "ok" });
    } catch {
      results.push({ command, status: "error" });
      failures.push(`Command failed: ${command}`);
      break;
    }
  }
}

export function runPreflight(rawArgs = process.argv.slice(2)) {
  const args = parseArgs(rawArgs);
  const failures = [];
  const warnings = [];
  const checks = [];
  const commandResults = [];

  if (!existsSync(resolve("package.json"))) {
    throw new Error("package.json not found. Run this from the signaler repository root.");
  }
  if (!existsSync(resolve("jsr.json"))) {
    throw new Error("jsr.json not found. Run this from the signaler repository root.");
  }

  const packageJson = readJson("package.json");
  const jsrJson = readJson("jsr.json");

  checks.push({
    id: "version-sync:package-jsr",
    status: packageJson.version === jsrJson.version ? STATUS_OK : STATUS_ERROR,
    blocking: true,
    details: `package.json=${packageJson.version}, jsr.json=${jsrJson.version}`,
  });
  if (packageJson.version !== jsrJson.version) {
    failures.push(
      `Version mismatch: package.json=${packageJson.version}, jsr.json=${jsrJson.version}`,
    );
  }

  if (args.targetVersion && args.targetVersion !== packageJson.version) {
    checks.push({
      id: "target-version",
      status: STATUS_WARN,
      blocking: false,
      details: `target=${args.targetVersion}, package=${packageJson.version}`,
    });
    warnings.push(
      `Target release version (${args.targetVersion}) is not yet set in package.json (${packageJson.version}).`,
    );
  } else if (args.targetVersion) {
    checks.push({
      id: "target-version",
      status: STATUS_OK,
      blocking: false,
      details: `target=${args.targetVersion}`,
    });
  }

  evaluatePathChecks(REQUIRED_DOCS, "doc", checks, failures);
  evaluatePathChecks(REQUIRED_RELEASE_ASSETS, "release-asset", checks, failures);

  if (!args.skipCommands) {
    runCommands(PRE_FLIGHT_COMMANDS, args.dryRun, commandResults, failures);
  }

  evaluateGateReports(REQUIRED_GATES, args.strict, checks, warnings, failures);
  evaluateCrossPlatformEvidence(args.requireCrossPlatform, checks, warnings, failures);
  const workstreamJOverhead = evaluateWorkstreamJOverheadEvidence(checks, warnings);

  const summary = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    targetVersion: args.targetVersion ?? null,
    packageVersion: packageJson.version ?? null,
    jsrVersion: jsrJson.version ?? null,
    status: failures.length > 0 ? STATUS_ERROR : warnings.length > 0 ? STATUS_WARN : STATUS_OK,
    commandResults,
    checks,
    summary: {
      failures: failures.length,
      warnings: warnings.length,
    },
    failures,
    warnings,
    workstreamJOverhead,
    policy: {
      strict: args.strict,
      dryRun: args.dryRun,
      skipCommands: args.skipCommands,
      requireCrossPlatform: args.requireCrossPlatform,
    },
  };

  const reportPath = resolve(args.reportPath);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log("");
  console.log("Release preflight summary");
  console.log(`- status: ${summary.status}`);
  console.log(`- failures: ${summary.summary.failures}`);
  console.log(`- warnings: ${summary.summary.warnings}`);
  console.log(`- workstream-j-overhead: ${summary.workstreamJOverhead.status}`);
  console.log(`- report: ${args.reportPath}`);

  if (failures.length > 0) {
    console.error("");
    for (const failure of failures) console.error(`FAIL: ${failure}`);
  }
  if (warnings.length > 0) {
    console.log("");
    for (const warning of warnings) console.log(`WARN: ${warning}`);
  }

  return summary;
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
  : false;

if (isMain) {
  try {
    const summary = runPreflight();
    if (summary.status === STATUS_ERROR) process.exit(1);
  } catch (error) {
    console.error(`Release preflight failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
