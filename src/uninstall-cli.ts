import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import readline from "node:readline";

import { pathExists } from "./infrastructure/filesystem/utils.js";
import { resolveGlobalInstallPaths } from "./upgrade-cli.js";

type PackageManagerId = "pnpm" | "npm" | "yarn" | "bun";

type UninstallArgs = {
  readonly projectRoot: string;
  readonly configPath: string;
  readonly dryRun: boolean;
  readonly yes: boolean;
  readonly jsonOutput: boolean;
  readonly global: boolean;
};

type UninstallAction = {
  readonly kind: "rm";
  readonly path: string;
  readonly existsByAssumption: boolean;
};

type UninstallReport = {
  readonly meta: {
    readonly projectRoot: string;
    readonly configPath: string;
    readonly dryRun: boolean;
    readonly global: boolean;
    readonly startedAt: string;
    readonly completedAt: string;
    readonly elapsedMs: number;
  };
  readonly planned: readonly UninstallAction[];
  readonly executed: readonly UninstallAction[];
  readonly packageManager: PackageManagerId | "unknown";
  readonly dependencyUninstallCommand: string;
};

function parseArgs(argv: readonly string[]): UninstallArgs {
  let projectRoot: string = process.cwd();
  let configPath: string = "signaler.config.json";
  let dryRun: boolean = false;
  let yes: boolean = false;
  let jsonOutput: boolean = false;
  let global = false;
  for (let i: number = 2; i < argv.length; i += 1) {
    const arg: string = argv[i] ?? "";
    if (arg === "--project-root" && i + 1 < argv.length) {
      projectRoot = argv[i + 1] ?? projectRoot;
      i += 1;
      continue;
    }
    if ((arg === "--config-path" || arg === "--config") && i + 1 < argv.length) {
      configPath = argv[i + 1] ?? configPath;
      i += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--yes" || arg === "-y") {
      yes = true;
      continue;
    }
    if (arg === "--json") {
      jsonOutput = true;
      continue;
    }
    if (arg === "--global") {
      global = true;
      continue;
    }
  }
  return {
    projectRoot: resolve(projectRoot),
    configPath: resolve(projectRoot, configPath),
    dryRun,
    yes,
    jsonOutput,
    global,
  };
}

async function confirmPrompt(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    return false;
  }
  process.stdin.resume();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer: string = await new Promise<string>((resolvePromise) => {
      rl.question(question, (value: string) => resolvePromise(value));
    });
    const text: string = answer.trim().toLowerCase();
    return text === "y" || text === "yes";
  } finally {
    rl.close();
  }
}

async function detectPackageManager(projectRoot: string): Promise<PackageManagerId | "unknown"> {
  const pnpmLock: boolean = await pathExists(resolve(projectRoot, "pnpm-lock.yaml"));
  if (pnpmLock) {
    return "pnpm";
  }
  const bunLock: boolean = await pathExists(resolve(projectRoot, "bun.lockb"));
  if (bunLock) {
    return "bun";
  }
  const yarnLock: boolean = await pathExists(resolve(projectRoot, "yarn.lock"));
  if (yarnLock) {
    return "yarn";
  }
  const npmLock: boolean = await pathExists(resolve(projectRoot, "package-lock.json"));
  if (npmLock) {
    return "npm";
  }
  return "unknown";
}

function buildDependencyUninstallCommand(packageManager: PackageManagerId | "unknown"): string {
  const packageName: string = "@signaler/cli";
  if (packageManager === "pnpm") {
    return `pnpm remove ${packageName}`;
  }
  if (packageManager === "yarn") {
    return `yarn remove ${packageName}`;
  }
  if (packageManager === "bun") {
    return `bun remove ${packageName}`;
  }
  if (packageManager === "npm") {
    return `npm uninstall ${packageName}`;
  }
  return `npm uninstall ${packageName}`;
}

function buildPlan(args: UninstallArgs): readonly UninstallAction[] {
  if (args.global) {
    const paths = resolveGlobalInstallPaths();
    const actions: UninstallAction[] = [
      { kind: "rm", path: paths.installDir, existsByAssumption: false },
      { kind: "rm", path: resolve(paths.binDir, "signaler"), existsByAssumption: false },
      { kind: "rm", path: resolve(paths.binDir, "signalar"), existsByAssumption: false },
    ];
    if (process.platform === "win32") {
      actions.push({ kind: "rm", path: resolve(paths.binDir, "signaler.cmd"), existsByAssumption: false });
      actions.push({ kind: "rm", path: resolve(paths.binDir, "signalar.cmd"), existsByAssumption: false });
    }
    return actions;
  }
  const actions: UninstallAction[] = [];
  actions.push({ kind: "rm", path: resolve(args.projectRoot, ".signaler"), existsByAssumption: true });
  // Also remove legacy directory if it exists
  actions.push({ kind: "rm", path: resolve(args.projectRoot, ".apex-auditor"), existsByAssumption: false });
  actions.push({ kind: "rm", path: args.configPath, existsByAssumption: true });
  return actions;
}

async function executePlan(plan: readonly UninstallAction[], dryRun: boolean): Promise<readonly UninstallAction[]> {
  if (dryRun) {
    return [];
  }
  const executed: UninstallAction[] = [];
  for (const action of plan) {
    if (action.kind === "rm") {
      await rm(action.path, { recursive: true, force: true });
      executed.push(action);
    }
  }
  return executed;
}

/**
 * Run the uninstall CLI to remove Signaler files/config from a project.
 */
export async function runUninstallCli(argv: readonly string[]): Promise<void> {
  const startedAtMs: number = Date.now();
  const args: UninstallArgs = parseArgs(argv);
  const planned: readonly UninstallAction[] = buildPlan(args);
  const packageManager: PackageManagerId | "unknown" = args.global ? "unknown" : await detectPackageManager(args.projectRoot);
  const dependencyUninstallCommand: string = args.global
    ? "Use the release installer script to reinstall the global launcher"
    : buildDependencyUninstallCommand(packageManager);
  if (!args.yes && process.stdin.isTTY) {
    const targets: string = planned.map((p) => p.path).join("\n");
    const scopeLabel = args.global ? "global Signaler launchers/install files" : "project Signaler files";
    const ok: boolean = await confirmPrompt(`This will remove ${scopeLabel}:\n${targets}\nContinue? (y/N) `);
    if (!ok) {
      console.log("Cancelled.");
      return;
    }
  }
  const executed: readonly UninstallAction[] = await executePlan(planned, args.dryRun);
  const completedAtMs: number = Date.now();
  const report: UninstallReport = {
    meta: {
      projectRoot: args.projectRoot,
      configPath: args.configPath,
      dryRun: args.dryRun,
      global: args.global,
      startedAt: new Date(startedAtMs).toISOString(),
      completedAt: new Date(completedAtMs).toISOString(),
      elapsedMs: completedAtMs - startedAtMs,
    },
    planned,
    executed,
    packageManager,
    dependencyUninstallCommand,
  };
  if (args.jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (args.dryRun) {
    console.log(`Planned removals: ${planned.length} (dry-run).`);
    console.log(`${args.global ? "Reinstall helper" : "Dependency uninstall (optional)"}: ${dependencyUninstallCommand}`);
    return;
  }
  console.log(`Removed: ${executed.length}/${planned.length}.`);
  console.log(`${args.global ? "Reinstall helper" : "Dependency uninstall (optional)"}: ${dependencyUninstallCommand}`);
}

export { parseArgs as parseUninstallArgs, buildPlan as buildUninstallPlan };
