import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type Entry = {
  readonly environment: "ci-linux" | "local-6c12t";
  readonly command: "health" | "headers" | "links" | "console";
  readonly engine: "node" | "rust";
  readonly elapsedMs: number;
  readonly taskCount: number;
  readonly errorRate: number;
  readonly retryRate: number;
  readonly status: "ok" | "warn" | "error";
  readonly artifactBytes: number;
};

type Report = {
  readonly schemaVersion: 1;
  readonly entries: readonly Entry[];
};

const SEVERE_ERROR_RATE = 0.2;
const SEVERE_CONSOLE_ERROR_RATE = 1.01;
const SEVERE_ELAPSED_PCT = 0.35;
const SEVERE_ELAPSED_ABS = 60_000;
const WARN_ELAPSED_PCT = 0.2;
const WARN_ELAPSED_ABS = 20_000;

type CliArgs = {
  readonly currentPath: string;
  readonly baselinePath?: string;
};

function parseArgs(argv: readonly string[]): CliArgs {
  let currentPath = resolve("benchmarks/out/phase4-baseline.json");
  let baselinePath: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--current" && i + 1 < argv.length) {
      currentPath = resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith("--current=")) {
      currentPath = resolve(arg.slice("--current=".length));
      continue;
    }
    if (arg === "--baseline" && i + 1 < argv.length) {
      baselinePath = resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith("--baseline=")) {
      baselinePath = resolve(arg.slice("--baseline=".length));
    }
  }
  return { currentPath, baselinePath };
}

async function readReport(pathToReport: string): Promise<Report | undefined> {
  try {
    const raw = await readFile(pathToReport, "utf8");
    return JSON.parse(raw) as Report;
  } catch {
    return undefined;
  }
}

function keyOf(entry: Entry): string {
  return `${entry.environment}|${entry.command}|${entry.engine}`;
}

function formatMs(ms: number): string {
  return `${Math.round(ms).toLocaleString()}ms`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const current = await readReport(args.currentPath);
  if (!current) {
    console.error(`[phase4-gate] Missing or invalid current report: ${args.currentPath}`);
    process.exitCode = 1;
    return;
  }
  const baseline = args.baselinePath ? await readReport(args.baselinePath) : undefined;
  const baselineMap = new Map<string, Entry>((baseline?.entries ?? []).map((entry) => [keyOf(entry), entry]));

  const severe: string[] = [];
  const warnings: string[] = [];

  for (const entry of current.entries) {
    const prefix = `[${keyOf(entry)}]`;
    if (entry.status === "error") {
      severe.push(`${prefix} status=error`);
    }
    if (entry.artifactBytes <= 0) {
      severe.push(`${prefix} artifact missing/empty`);
    }
    const severeErrorRate = entry.command === "console" ? SEVERE_CONSOLE_ERROR_RATE : SEVERE_ERROR_RATE;
    if (entry.errorRate > severeErrorRate) {
      severe.push(`${prefix} errorRate=${entry.errorRate.toFixed(3)} exceeds ${severeErrorRate.toFixed(2)}`);
    }

    const base = baselineMap.get(keyOf(entry));
    if (!base) {
      continue;
    }
    const deltaMs = entry.elapsedMs - base.elapsedMs;
    if (deltaMs <= 0) {
      continue;
    }
    const severeThreshold = Math.max(SEVERE_ELAPSED_ABS, base.elapsedMs * SEVERE_ELAPSED_PCT);
    const warnThreshold = Math.max(WARN_ELAPSED_ABS, base.elapsedMs * WARN_ELAPSED_PCT);
    if (deltaMs > severeThreshold) {
      const deltaPct = base.elapsedMs > 0 ? (deltaMs / base.elapsedMs) * 100 : 0;
      severe.push(
        `${prefix} elapsed regression baseline=${formatMs(base.elapsedMs)} current=${formatMs(entry.elapsedMs)} delta=${formatMs(deltaMs)} (${deltaPct.toFixed(1)}%)`,
      );
    } else if (deltaMs > warnThreshold) {
      const deltaPct = base.elapsedMs > 0 ? (deltaMs / base.elapsedMs) * 100 : 0;
      warnings.push(
        `${prefix} moderate regression baseline=${formatMs(base.elapsedMs)} current=${formatMs(entry.elapsedMs)} delta=${formatMs(deltaMs)} (${deltaPct.toFixed(1)}%)`,
      );
    }
  }

  console.log(`[phase4-gate] evaluated ${current.entries.length} entries`);
  console.log(
    `[phase4-gate] severe thresholds: elapsed>${Math.round(SEVERE_ELAPSED_PCT * 100)}% or >${formatMs(SEVERE_ELAPSED_ABS)}, errorRate>${SEVERE_ERROR_RATE.toFixed(2)} (console>${SEVERE_CONSOLE_ERROR_RATE.toFixed(2)}), status=error, missing artifacts`,
  );
  for (const warning of warnings) {
    console.log(`[phase4-gate][warn] ${warning}`);
  }
  for (const issue of severe) {
    console.error(`[phase4-gate][severe] ${issue}`);
  }
  if (severe.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log("[phase4-gate] soft gate passed (no severe regressions).");
}

void main();
