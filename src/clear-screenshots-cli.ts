import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import readline from "node:readline";

type ClearScreenshotsArgs = {
  readonly projectRoot: string;
  readonly dryRun: boolean;
  readonly yes: boolean;
  readonly jsonOutput: boolean;
};

type ClearAction = {
  readonly kind: "rm";
  readonly path: string;
  readonly existsByAssumption: boolean;
};

type ClearScreenshotsReport = {
  readonly meta: {
    readonly projectRoot: string;
    readonly dryRun: boolean;
    readonly startedAt: string;
    readonly completedAt: string;
    readonly elapsedMs: number;
  };
  readonly planned: readonly ClearAction[];
  readonly executed: readonly ClearAction[];
};

function parseArgs(argv: readonly string[]): ClearScreenshotsArgs {
  let projectRoot: string = process.cwd();
  let dryRun = false;
  let yes = false;
  let jsonOutput = false;
  for (let i = 2; i < argv.length; i += 1) {
    const arg: string = argv[i] ?? "";
    if (arg === "--project-root" && i + 1 < argv.length) {
      projectRoot = argv[i + 1] ?? projectRoot;
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
  }
  return { projectRoot: resolve(projectRoot), dryRun, yes, jsonOutput };
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

function buildPlan(args: ClearScreenshotsArgs): readonly ClearAction[] {
  const screenshotsDir: string = resolve(args.projectRoot, ".apex-auditor", "screenshots");
  return [{ kind: "rm", path: screenshotsDir, existsByAssumption: true }];
}

async function executePlan(plan: readonly ClearAction[], dryRun: boolean): Promise<readonly ClearAction[]> {
  if (dryRun) {
    return [];
  }
  const executed: ClearAction[] = [];
  for (const action of plan) {
    await rm(action.path, { recursive: true, force: true });
    executed.push(action);
  }
  return executed;
}

export async function runClearScreenshotsCli(argv: readonly string[]): Promise<void> {
  const startedAtMs: number = Date.now();
  const args: ClearScreenshotsArgs = parseArgs(argv);
  const planned: readonly ClearAction[] = buildPlan(args);
  if (!args.yes && process.stdin.isTTY) {
    const targets: string = planned.map((p) => p.path).join("\n");
    const ok: boolean = await confirmPrompt(`This will remove:\n${targets}\nContinue? (y/N) `);
    if (!ok) {
      console.log("Cancelled.");
      return;
    }
  }
  const executed: readonly ClearAction[] = await executePlan(planned, args.dryRun);
  const completedAtMs: number = Date.now();
  const report: ClearScreenshotsReport = {
    meta: {
      projectRoot: args.projectRoot,
      dryRun: args.dryRun,
      startedAt: new Date(startedAtMs).toISOString(),
      completedAt: new Date(completedAtMs).toISOString(),
      elapsedMs: completedAtMs - startedAtMs,
    },
    planned,
    executed,
  };
  if (args.jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (args.dryRun) {
    console.log(`Planned removals: ${planned.length} (dry-run).`);
    return;
  }
  console.log(`Removed: ${executed.length}/${planned.length}.`);
}
