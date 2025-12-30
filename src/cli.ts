import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { exec } from "node:child_process";
import { loadConfig } from "./config.js";
import { runAuditsForConfig } from "./lighthouse-runner.js";
import type {
  ApexCategory,
  ApexBudgets,
  ApexConfig,
  ApexDevice,
  ApexPageConfig,
  ApexThrottlingMethod,
  CategoryBudgetThresholds,
  MetricBudgetThresholds,
  OpportunitySummary,
  PageDeviceSummary,
  RunSummary,
} from "./types.js";

type CliLogLevel = "silent" | "error" | "info" | "verbose";

type CliColorMode = "auto" | "always" | "never";

interface CliArgs {
  readonly configPath: string;
  readonly ci: boolean;
  readonly colorMode: CliColorMode;
  readonly logLevelOverride: CliLogLevel | undefined;
  readonly deviceFilter: ApexDevice | undefined;
  readonly throttlingMethodOverride: ApexThrottlingMethod | undefined;
  readonly cpuSlowdownOverride: number | undefined;
  readonly parallelOverride: number | undefined;
  readonly stable: boolean;
  readonly openReport: boolean;
  readonly warmUp: boolean;
  readonly incremental: boolean;
  readonly buildId: string | undefined;
  readonly quick: boolean;
  readonly accurate: boolean;
  readonly jsonOutput: boolean;
  readonly showParallel: boolean;
  readonly fast: boolean;
}

const ANSI_RESET = "\u001B[0m" as const;
const ANSI_RED = "\u001B[31m" as const;
const ANSI_YELLOW = "\u001B[33m" as const;
const ANSI_GREEN = "\u001B[32m" as const;
const ANSI_CYAN = "\u001B[36m" as const;
const ANSI_BLUE = "\u001B[34m" as const;

const LCP_GOOD_MS: number = 2500;
const LCP_WARN_MS: number = 4000;
const FCP_GOOD_MS: number = 1800;
const FCP_WARN_MS: number = 3000;
const TBT_GOOD_MS: number = 200;
const TBT_WARN_MS: number = 600;
const CLS_GOOD: number = 0.1;
const CLS_WARN: number = 0.25;
const INP_GOOD_MS: number = 200;
const INP_WARN_MS: number = 500;

function parseArgs(argv: readonly string[]): CliArgs {
  let configPath: string | undefined;
  let ci: boolean = false;
  let colorMode: CliColorMode = "auto";
  let logLevelOverride: CliLogLevel | undefined;
  let deviceFilter: ApexDevice | undefined;
  let throttlingMethodOverride: ApexThrottlingMethod | undefined;
  let cpuSlowdownOverride: number | undefined;
  let parallelOverride: number | undefined;
  let stable = false;
  let openReport = false;
  let warmUp = false;
  let incremental = false;
  let buildId: string | undefined;
  let quick = false;
  let accurate = false;
  let jsonOutput = false;
  let showParallel = false;
  let fast = false;
  for (let i = 2; i < argv.length; i += 1) {
    const arg: string = argv[i];
    if ((arg === "--config" || arg === "-c") && i + 1 < argv.length) {
      configPath = argv[i + 1];
      i += 1;
    } else if (arg === "--ci") {
      ci = true;
    } else if (arg === "--no-color") {
      colorMode = "never";
    } else if (arg === "--color") {
      colorMode = "always";
    } else if (arg === "--log-level" && i + 1 < argv.length) {
      const value: string = argv[i + 1];
      if (value === "silent" || value === "error" || value === "info" || value === "verbose") {
        logLevelOverride = value;
      } else {
        throw new Error(`Invalid --log-level value: ${value}`);
      }
      i += 1;
    } else if (arg === "--mobile-only") {
      if (deviceFilter !== undefined && deviceFilter !== "mobile") {
        throw new Error("Cannot combine --mobile-only and --desktop-only");
      }
      deviceFilter = "mobile";
    } else if (arg === "--desktop-only") {
      if (deviceFilter !== undefined && deviceFilter !== "desktop") {
        throw new Error("Cannot combine --mobile-only and --desktop-only");
      }
      deviceFilter = "desktop";
    } else if (arg === "--throttling" && i + 1 < argv.length) {
      const value: string = argv[i + 1];
      if (value === "simulate" || value === "devtools") {
        throttlingMethodOverride = value;
      } else {
        throw new Error(`Invalid --throttling value: ${value}. Expected "simulate" or "devtools".`);
      }
      i += 1;
    } else if (arg === "--cpu-slowdown" && i + 1 < argv.length) {
      const value: number = parseFloat(argv[i + 1]);
      if (Number.isNaN(value) || value <= 0 || value > 20) {
        throw new Error(`Invalid --cpu-slowdown value: ${argv[i + 1]}. Expected number between 0 and 20.`);
      }
      cpuSlowdownOverride = value;
      i += 1;
    } else if (arg === "--parallel" && i + 1 < argv.length) {
      const value: number = parseInt(argv[i + 1], 10);
      if (Number.isNaN(value) || value < 1 || value > 10) {
        throw new Error(`Invalid --parallel value: ${argv[i + 1]}. Expected integer between 1 and 10.`);
      }
      parallelOverride = value;
      i += 1;
    } else if (arg.startsWith("--parallel=")) {
      parallelOverride = Number(arg.split("=")[1]);
      if (Number.isNaN(parallelOverride)) {
        parallelOverride = undefined;
      }
    } else if (arg === "--stable") {
      stable = true;
    } else if (arg === "--open" || arg === "--open-report") {
      openReport = true;
    } else if (arg === "--warm-up") {
      warmUp = true;
    } else if (arg === "--incremental") {
      incremental = true;
    } else if (arg === "--build-id" && i + 1 < argv.length) {
      buildId = argv[i + 1];
      i += 1;
    } else if (arg === "--quick") {
      quick = true;
    } else if (arg === "--accurate") {
      accurate = true;
    } else if (arg === "--json") {
      jsonOutput = true;
    } else if (arg === "--show-parallel") {
      showParallel = true;
    } else if (arg === "--fast") {
      fast = true;
    }
  }
  const presetCount: number = [fast, quick, accurate].filter((flag) => flag).length;
  if (presetCount > 1) {
    throw new Error("Choose only one preset: --fast, --quick, or --accurate");
  }
  const finalConfigPath: string = configPath ?? "apex.config.json";
  return { configPath: finalConfigPath, ci, colorMode, logLevelOverride, deviceFilter, throttlingMethodOverride, cpuSlowdownOverride, parallelOverride, stable, openReport, warmUp, incremental, buildId, quick, accurate, jsonOutput, showParallel, fast };
}

async function resolveAutoBuildId(configPath: string): Promise<string | undefined> {
  const startDir: string = dirname(configPath);
  const tryReadText = async (absolutePath: string): Promise<string | undefined> => {
    try {
      const raw: string = await readFile(absolutePath, "utf8");
      const trimmed: string = raw.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    } catch {
      return undefined;
    }
  };
  const findUp = async (relativePath: string): Promise<string | undefined> => {
    let currentDir: string = startDir;
    while (true) {
      const candidate: string = resolve(currentDir, relativePath);
      const value: string | undefined = await tryReadText(candidate);
      if (value !== undefined) {
        return value;
      }
      const parent: string = dirname(currentDir);
      if (parent === currentDir) {
        return undefined;
      }
      currentDir = parent;
    }
  };
  const nextBuildId: string | undefined = await findUp(".next/BUILD_ID");
  if (nextBuildId !== undefined) {
    return `next:${nextBuildId}`;
  }
  const gitHead: string | undefined = await findUp(".git/HEAD");
  if (gitHead === undefined) {
    return undefined;
  }
  if (gitHead.startsWith("ref:")) {
    const refPath: string = gitHead.replace("ref:", "").trim();
    const refValue: string | undefined = await findUp(`.git/${refPath}`);
    return refValue !== undefined ? `git:${refValue}` : undefined;
  }
  return `git:${gitHead}`;
}

async function loadPreviousSummary(): Promise<RunSummary | undefined> {
  const previousPath: string = resolve(".apex-auditor", "summary.json");
  try {
    const raw: string = await readFile(previousPath, "utf8");
    const parsed: unknown = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    return parsed as RunSummary;
  } catch {
    return undefined;
  }
}

type AvgScores = {
  readonly performance: number;
  readonly accessibility: number;
  readonly bestPractices: number;
  readonly seo: number;
};

function computeAvgScores(results: readonly PageDeviceSummary[]): AvgScores {
  const sums = results.reduce(
    (acc, r) => {
      return {
        performance: acc.performance + (r.scores.performance ?? 0),
        accessibility: acc.accessibility + (r.scores.accessibility ?? 0),
        bestPractices: acc.bestPractices + (r.scores.bestPractices ?? 0),
        seo: acc.seo + (r.scores.seo ?? 0),
        count: acc.count + 1,
      };
    },
    { performance: 0, accessibility: 0, bestPractices: 0, seo: 0, count: 0 },
  );
  const count: number = Math.max(1, sums.count);
  return {
    performance: Math.round(sums.performance / count),
    accessibility: Math.round(sums.accessibility / count),
    bestPractices: Math.round(sums.bestPractices / count),
    seo: Math.round(sums.seo / count),
  };
}

type ChangeLine = {
  readonly key: string;
  readonly label: string;
  readonly path: string;
  readonly device: ApexDevice;
  readonly deltaP: number;
};

function buildChangesBox(previous: RunSummary, current: RunSummary, useColor: boolean): string {
  const prevAvg: AvgScores = computeAvgScores(previous.results);
  const currAvg: AvgScores = computeAvgScores(current.results);
  const avgDelta = {
    performance: currAvg.performance - prevAvg.performance,
    accessibility: currAvg.accessibility - prevAvg.accessibility,
    bestPractices: currAvg.bestPractices - prevAvg.bestPractices,
    seo: currAvg.seo - prevAvg.seo,
  };
  const prevMap: Map<string, PageDeviceSummary> = new Map(
    previous.results.map((r) => [`${r.label}:::${r.path}:::${r.device}`, r] as const),
  );
  const currMap: Map<string, PageDeviceSummary> = new Map(
    current.results.map((r) => [`${r.label}:::${r.path}:::${r.device}`, r] as const),
  );
  const allKeys: Set<string> = new Set([...prevMap.keys(), ...currMap.keys()]);
  const deltas: ChangeLine[] = [];
  let added = 0;
  let removed = 0;
  for (const key of allKeys) {
    const prev: PageDeviceSummary | undefined = prevMap.get(key);
    const curr: PageDeviceSummary | undefined = currMap.get(key);
    if (!prev && curr) {
      added += 1;
      continue;
    }
    if (prev && !curr) {
      removed += 1;
      continue;
    }
    if (!prev || !curr) {
      continue;
    }
    const deltaP: number = (curr.scores.performance ?? 0) - (prev.scores.performance ?? 0);
    deltas.push({
      key,
      label: curr.label,
      path: curr.path,
      device: curr.device,
      deltaP,
    });
  }
  deltas.sort((a, b) => a.deltaP - b.deltaP);
  const regressions: ChangeLine[] = deltas.slice(0, 5);
  const improvements: ChangeLine[] = [...deltas].reverse().slice(0, 5);
  const formatDelta = (value: number): string => {
    const sign: string = value > 0 ? "+" : "";
    if (!useColor) {
      return `${sign}${value}`;
    }
    if (value > 0) {
      return `${ANSI_GREEN}${sign}${value}${ANSI_RESET}`;
    }
    if (value < 0) {
      return `${ANSI_RED}${sign}${value}${ANSI_RESET}`;
    }
    return `${ANSI_CYAN}${sign}${value}${ANSI_RESET}`;
  };
  const lines: string[] = [];
  lines.push(`Avg deltas: P ${formatDelta(avgDelta.performance)} | A ${formatDelta(avgDelta.accessibility)} | BP ${formatDelta(avgDelta.bestPractices)} | SEO ${formatDelta(avgDelta.seo)}`);
  lines.push(`Combos: +${added} added, -${removed} removed`);
  lines.push("");
  lines.push("Top regressions (Performance):");
  for (const r of regressions) {
    lines.push(`- ${r.label} ${r.path} [${r.device}] ΔP:${formatDelta(r.deltaP)}`);
  }
  lines.push("");
  lines.push("Top improvements (Performance):");
  for (const r of improvements) {
    lines.push(`- ${r.label} ${r.path} [${r.device}] ΔP:${formatDelta(r.deltaP)}`);
  }
  return boxifyWithSeparators(lines);
}

/**
 * Runs the ApexAuditor audit CLI.
 *
 * @param argv - The process arguments array.
 */
export async function runAuditCli(argv: readonly string[]): Promise<void> {
  const args: CliArgs = parseArgs(argv);
  const startTimeMs: number = Date.now();
  const { configPath, config } = await loadConfig({ configPath: args.configPath });
  const previousSummary: RunSummary | undefined = await loadPreviousSummary();

  const presetThrottling: ApexThrottlingMethod | undefined = args.accurate ? "devtools" : undefined;
  const presetRuns: number | undefined = args.accurate ? 3 : args.quick ? 1 : undefined;
  const presetWarmUp: boolean | undefined = args.accurate ? true : undefined;
  const presetParallel: number | undefined = args.accurate ? 2 : undefined;

  const effectiveLogLevel: CliLogLevel | undefined = args.logLevelOverride ?? config.logLevel;
  const effectiveThrottling: ApexThrottlingMethod | undefined = args.fast ? "simulate" : args.throttlingMethodOverride ?? presetThrottling ?? config.throttlingMethod;
  const effectiveCpuSlowdown: number | undefined = args.cpuSlowdownOverride ?? config.cpuSlowdownMultiplier;
  const effectiveParallel: number | undefined = args.stable ? 1 : args.parallelOverride ?? presetParallel ?? config.parallel;
  const effectiveWarmUp: boolean = args.warmUp || presetWarmUp === true || config.warmUp === true;
  const effectiveIncremental: boolean = args.incremental || config.incremental === true;
  const candidateBuildId: string | undefined = args.buildId ?? config.buildId;
  const autoBuildId: string | undefined = effectiveIncremental && candidateBuildId === undefined
    ? await resolveAutoBuildId(configPath)
    : undefined;
  const effectiveBuildId: string | undefined = candidateBuildId ?? autoBuildId;
  const finalIncremental: boolean = effectiveIncremental && effectiveBuildId !== undefined;
  if (effectiveIncremental && !finalIncremental) {
    // eslint-disable-next-line no-console
    console.log("Incremental mode requested, but no buildId could be resolved. Running a full audit. Tip: pass --build-id or set buildId in apex.config.json");
  }
  const effectiveRuns: number | undefined = args.fast ? 1 : presetRuns ?? config.runs;
  const onlyCategories: readonly ApexCategory[] | undefined = args.fast ? ["performance"] : undefined;
  const effectiveConfig: ApexConfig = {
    ...config,
    buildId: effectiveBuildId,
    logLevel: effectiveLogLevel,
    throttlingMethod: effectiveThrottling,
    cpuSlowdownMultiplier: effectiveCpuSlowdown,
    parallel: effectiveParallel,
    warmUp: effectiveWarmUp,
    incremental: finalIncremental,
    runs: effectiveRuns,
  };
  const filteredConfig: ApexConfig = filterConfigDevices(effectiveConfig, args.deviceFilter);
  if (filteredConfig.pages.length === 0) {
    // eslint-disable-next-line no-console
    console.error("No pages remain after applying device filter. Check your config and device flags.");
    process.exitCode = 1;
    return;
  }
  let summary: RunSummary;
  try {
    summary = await runAuditsForConfig({ config: filteredConfig, configPath, showParallel: args.showParallel, onlyCategories });
  } catch (error: unknown) {
    handleFriendlyError(error);
    process.exitCode = 1;
    return;
  }
  const outputDir: string = resolve(".apex-auditor");
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  const markdown: string = buildMarkdown(summary);
  await writeFile(resolve(outputDir, "summary.md"), markdown, "utf8");
  const html: string = buildHtmlReport(summary);
  const reportPath: string = resolve(outputDir, "report.html");
  await writeFile(reportPath, html, "utf8");
  // Open HTML report in browser if requested
  if (args.openReport) {
    openInBrowser(reportPath);
  }
  // If JSON output requested, print JSON and exit early
  if (args.jsonOutput) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  printReportLink(reportPath);
  // Also echo a compact, colourised table to stdout for quick viewing.
  const useColor: boolean = shouldUseColor(args.ci, args.colorMode);
  printSectionHeader("Summary", useColor);
  printDivider();
  const consoleTable: string = buildConsoleTable(summary.results, useColor);
  const boxedTable: string = boxifyWithSeparators(consoleTable.split("\n"));
  // eslint-disable-next-line no-console
  console.log(boxedTable);
  printDivider();
  if (previousSummary !== undefined) {
    printSectionHeader("Changes", useColor);
    printDivider();
    // eslint-disable-next-line no-console
    console.log(buildChangesBox(previousSummary, summary, useColor));
    printDivider();
  }
  printSectionHeader("Meta", useColor);
  printRunMeta(summary.meta, useColor);
  printSectionHeader("Stats", useColor);
  printSummaryStats(summary.results, useColor);
  printSectionHeader("Issues", useColor);
  printDivider();
  printRedIssues(summary.results);
  printCiSummary(args, summary.results, effectiveConfig.budgets);
  printSectionHeader("Lowest performance", useColor);
  printDivider();
  printLowestPerformancePages(summary.results, useColor);
  const elapsedMs: number = Date.now() - startTimeMs;
  const elapsedText: string = formatElapsedTime(elapsedMs);
  const elapsedDisplay: string = useColor ? `${ANSI_CYAN}${elapsedText}${ANSI_RESET}` : elapsedText;
  const runsPerTarget: number = effectiveConfig.runs ?? 1;
  const comboCount: number = summary.results.length;
  const totalRuns: number = comboCount * runsPerTarget;
  const cacheNote: string = summary.meta.incremental
    ? ` Cache: ${summary.meta.executedCombos} executed / ${summary.meta.cachedCombos} cached (steps: ${summary.meta.executedSteps} executed, ${summary.meta.cachedSteps} cached).`
    : "";
  // eslint-disable-next-line no-console
  console.log(
    `\nCompleted in ${elapsedDisplay} (${comboCount} page/device combinations x ${runsPerTarget} runs = ${totalRuns} Lighthouse runs).${cacheNote}`,
  );
}

function filterConfigDevices(config: ApexConfig, deviceFilter: ApexDevice | undefined): ApexConfig {
  if (deviceFilter === undefined) {
    return config;
  }
  const filteredPages: ApexPageConfig[] = config.pages
    .map((page) => filterPageDevices(page, deviceFilter))
    .filter((page): page is ApexPageConfig => page !== undefined);
  return {
    ...config,
    pages: filteredPages,
  };
}

function filterPageDevices(page: ApexPageConfig, deviceFilter: ApexDevice): ApexPageConfig | undefined {
  const devices: readonly ApexDevice[] = page.devices.filter((device) => device === deviceFilter);
  if (devices.length === 0) {
    return undefined;
  }
  return {
    ...page,
    devices,
  };
}

function buildMarkdown(summary: RunSummary): string {
  const meta = summary.meta;
  const metaTable: string = [
    "| Field | Value |",
    "|-------|-------|",
    `| Config | ${meta.configPath} |`,
    `| Build ID | ${meta.buildId ?? "-"} |`,
    `| Incremental | ${meta.incremental ? "yes" : "no"} |`,
    `| Resolved parallel | ${meta.resolvedParallel} |`,
    `| Warm-up | ${meta.warmUp ? "yes" : "no"} |`,
    `| Throttling | ${meta.throttlingMethod} |`,
    `| CPU slowdown | ${meta.cpuSlowdownMultiplier} |`,
    `| Combos | ${meta.comboCount} |`,
    `| Executed combos | ${meta.executedCombos} |`,
    `| Cached combos | ${meta.cachedCombos} |`,
    `| Runs per combo | ${meta.runsPerCombo} |`,
    `| Total steps | ${meta.totalSteps} |`,
    `| Executed steps | ${meta.executedSteps} |`,
    `| Cached steps | ${meta.cachedSteps} |`,
    `| Started | ${meta.startedAt} |`,
    `| Completed | ${meta.completedAt} |`,
    `| Elapsed | ${formatElapsedTime(meta.elapsedMs)} |`,
    `| Avg per step | ${formatElapsedTime(meta.averageStepMs)} |`,
  ].join("\n");
  const header: string = [
    "| Label | Path | Device | P | A | BP | SEO | LCP (s) | FCP (s) | TBT (ms) | CLS | INP (ms) | Error | Top issues |",
    "|-------|------|--------|---|---|----|-----|---------|---------|----------|-----|----------|-------|-----------|",
  ].join("\n");
  const lines: string[] = summary.results.map((result) => buildRow(result));
  return `${metaTable}\n\n${header}\n${lines.join("\n")}`;
}

function buildHtmlReport(summary: RunSummary): string {
  const results = summary.results;
  const meta = summary.meta;
  const timestamp: string = new Date().toISOString();
  const rows: string = results.map((result) => buildHtmlRow(result)).join("\n");
  const cacheSummary: string = meta.incremental
    ? `${meta.executedCombos} executed / ${meta.cachedCombos} cached`
    : "disabled";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ApexAuditor Report</title>
  <style>
    :root {
      --green: #0cce6b;
      --yellow: #ffa400;
      --red: #ff4e42;
      --bg: #0f172a;
      --panel: #0b1224;
      --card: #111a33;
      --border: #27324d;
      --text: #e8edf7;
      --muted: #93a4c3;
      --accent: #7c3aed;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Inter", "IBM Plex Sans", "Segoe UI", system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at 20% 20%, #122042, #0a1020 45%), #0a0f1f;
      color: var(--text);
      padding: 2rem;
      line-height: 1.5;
    }
    h1 { margin-bottom: 0.5rem; letter-spacing: 0.02em; }
    .meta { color: var(--muted); margin-bottom: 2rem; font-size: 0.95rem; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .meta-card {
      background: linear-gradient(135deg, var(--panel), #0f1a33);
      border-radius: 12px;
      padding: 1rem;
      border: 1px solid var(--border);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
    }
    .meta-label { font-size: 0.78rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
    .meta-value { font-size: 1.05rem; font-weight: 650; color: var(--text); }
    .cards { display: grid; gap: 1.5rem; }
    .card {
      background: linear-gradient(180deg, var(--card), #0e1a31);
      border-radius: 14px;
      padding: 1.5rem;
      border: 1px solid var(--border);
      box-shadow: 0 14px 45px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1rem;
    }
    .card-title { font-size: 1.1rem; font-weight: 650; }
    .card-title span { color: var(--muted); font-weight: 500; }
    .device-badge {
      font-size: 0.78rem;
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      background: #1f2937;
      border: 1px solid var(--border);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .device-badge.mobile { background: linear-gradient(135deg, #0ea5e9, #0891b2); color: #e6f6ff; border-color: #0ea5e9; }
    .device-badge.desktop { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #f5efff; border-color: #8b5cf6; }
    .scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
    .score-item { text-align: center; }
    .score-circle {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 auto 0.35rem;
      border: 2px solid var(--border);
      background: #0c152a;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }
    .score-circle.green { border-color: var(--green); color: var(--green); box-shadow: 0 0 0 1px rgba(12, 206, 107, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
    .score-circle.yellow { border-color: var(--yellow); color: var(--yellow); box-shadow: 0 0 0 1px rgba(255, 164, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
    .score-circle.red { border-color: var(--red); color: var(--red); box-shadow: 0 0 0 1px rgba(255, 78, 66, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
    .score-label { font-size: 0.78rem; color: var(--muted); }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.85rem; }
    .metric {
      background: #0c152a;
      padding: 0.85rem;
      border-radius: 10px;
      text-align: center;
      border: 1px solid var(--border);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }
    .metric-value { font-size: 1.05rem; font-weight: 650; }
    .metric-value.green { color: var(--green); }
    .metric-value.yellow { color: var(--yellow); }
    .metric-value.red { color: var(--red); }
    .metric-label { font-size: 0.72rem; color: var(--muted); margin-top: 0.25rem; letter-spacing: 0.04em; }
    .issues {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #0c152a;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }
    .issues-title { font-size: 0.85rem; color: var(--muted); margin-bottom: 0.5rem; letter-spacing: 0.05em; text-transform: uppercase; }
    .issue {
      font-size: 0.88rem;
      color: var(--text);
      padding: 0.35rem 0.25rem;
      border-bottom: 1px dashed var(--border);
    }
    .issue:last-child { border-bottom: none; }
  </style>
</head>
<body>
  <h1>ApexAuditor Report</h1>
  <p class="meta">Generated: ${timestamp}</p>
  <div class="meta-grid">
    ${buildMetaCard("Build ID", meta.buildId ?? "-")}
    ${buildMetaCard("Incremental", meta.incremental ? "Yes" : "No")}
    ${buildMetaCard("Cache", cacheSummary)}
    ${buildMetaCard("Resolved parallel", meta.resolvedParallel.toString())}
    ${buildMetaCard("Elapsed", formatElapsedTime(meta.elapsedMs))}
    ${buildMetaCard("Avg / step", formatElapsedTime(meta.averageStepMs))}
    ${buildMetaCard("Combos", meta.comboCount.toString())}
    ${buildMetaCard("Runs per combo", meta.runsPerCombo.toString())}
    ${buildMetaCard("Throttling", meta.throttlingMethod)}
    ${buildMetaCard("CPU slowdown", meta.cpuSlowdownMultiplier.toString())}
    ${buildMetaCard("Warm-up", meta.warmUp ? "Yes" : "No")}
  </div>
  <div class="cards">
${rows}
  </div>
</body>
</html>`;
}

function buildHtmlRow(result: PageDeviceSummary): string {
  const scores = result.scores;
  const metrics = result.metrics;
  const lcpSeconds: string = metrics.lcpMs !== undefined ? (metrics.lcpMs / 1000).toFixed(1) + "s" : "-";
  const fcpSeconds: string = metrics.fcpMs !== undefined ? (metrics.fcpMs / 1000).toFixed(1) + "s" : "-";
  const tbtMs: string = metrics.tbtMs !== undefined ? Math.round(metrics.tbtMs) + "ms" : "-";
  const clsVal: string = metrics.cls !== undefined ? metrics.cls.toFixed(3) : "-";
  const inpMs: string = metrics.inpMs !== undefined ? Math.round(metrics.inpMs) + "ms" : "-";
  const issues: string = result.opportunities.slice(0, 3).map((o) => 
    `<div class="issue">${escapeHtml(o.title)}${o.estimatedSavingsMs ? ` (${Math.round(o.estimatedSavingsMs)}ms)` : ""}</div>`
  ).join("");
  return `    <div class="card">
      <div class="card-header">
        <div class="card-title">${escapeHtml(result.label)} <span style="color:#888">${escapeHtml(result.path)}</span></div>
        <span class="device-badge ${result.device}">${result.device}</span>
      </div>
      <div class="scores">
        ${buildScoreCircle("P", scores.performance)}
        ${buildScoreCircle("A", scores.accessibility)}
        ${buildScoreCircle("BP", scores.bestPractices)}
        ${buildScoreCircle("SEO", scores.seo)}
      </div>
      <div class="metrics">
        ${buildMetricBox("LCP", lcpSeconds, getMetricClass(metrics.lcpMs, 2500, 4000))}
        ${buildMetricBox("FCP", fcpSeconds, getMetricClass(metrics.fcpMs, 1800, 3000))}
        ${buildMetricBox("TBT", tbtMs, getMetricClass(metrics.tbtMs, 200, 600))}
        ${buildMetricBox("CLS", clsVal, getMetricClass(metrics.cls, 0.1, 0.25))}
        ${buildMetricBox("INP", inpMs, getMetricClass(metrics.inpMs, 200, 500))}
      </div>
      ${issues ? `<div class="issues"><div class="issues-title">Top Issues</div>${issues}</div>` : ""}
    </div>`;
}

function buildScoreCircle(label: string, score: number | undefined): string {
  const value: string = score !== undefined ? score.toString() : "-";
  const colorClass: string = score === undefined ? "" : score >= 90 ? "green" : score >= 50 ? "yellow" : "red";
  return `<div class="score-item"><div class="score-circle ${colorClass}">${value}</div><div class="score-label">${label}</div></div>`;
}

function buildMetricBox(label: string, value: string, colorClass: string): string {
  return `<div class="metric"><div class="metric-value ${colorClass}">${value}</div><div class="metric-label">${label}</div></div>`;
}

function buildMetaCard(label: string, value: string): string {
  return `<div class="meta-card"><div class="meta-label">${escapeHtml(label)}</div><div class="meta-value">${escapeHtml(value)}</div></div>`;
}

function printRunMeta(meta: RunSummary["meta"], useColor: boolean): void {
  const incrementalSummary: string = meta.incremental
    ? `${meta.executedCombos} executed / ${meta.cachedCombos} cached (${meta.executedSteps} executed steps, ${meta.cachedSteps} cached steps)`
    : "No";
  const rows: { readonly label: string; readonly value: string }[] = [
    { label: "Build ID", value: meta.buildId ?? "-" },
    { label: "Incremental", value: meta.incremental ? "Yes" : "No" },
    { label: "Resolved parallel", value: meta.resolvedParallel.toString() },
    { label: "Warm-up", value: meta.warmUp ? "Yes" : "No" },
    { label: "Throttling", value: meta.throttlingMethod },
    { label: "CPU slowdown", value: meta.cpuSlowdownMultiplier.toString() },
    { label: "Combos", value: meta.comboCount.toString() },
    { label: "Cache", value: incrementalSummary },
    { label: "Runs per combo", value: meta.runsPerCombo.toString() },
    { label: "Total steps", value: meta.totalSteps.toString() },
    { label: "Elapsed", value: formatElapsedTime(meta.elapsedMs) },
    { label: "Avg / step", value: formatElapsedTime(meta.averageStepMs) },
  ];
  const padLabel = (label: string): string => label.padEnd(16, " ");
  // eslint-disable-next-line no-console
  console.log("\nMeta:");
  for (const row of rows) {
    const value: string = useColor ? `${ANSI_CYAN}${row.value}${ANSI_RESET}` : row.value;
    // eslint-disable-next-line no-console
    console.log(`  ${padLabel(row.label)} ${value}`);
  }
}

function getMetricClass(value: number | undefined, good: number, warn: number): string {
  if (value === undefined) return "";
  return value <= good ? "green" : value <= warn ? "yellow" : "red";
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildConsoleTable(results: readonly PageDeviceSummary[], useColor: boolean): string {
  const header: string = [
    "| Label | Path | Device | P | A | BP | SEO |",
    "|-------|------|--------|---|---|----|-----|",
  ].join("\n");
  const rows: string[] = [];
  let previousKey: string | undefined;
  for (const result of results) {
    const key: string = `${result.label}:::${result.path}`;
    if (previousKey !== undefined && key !== previousKey) {
      rows.push("");
    }
    rows.push(buildConsoleRow(result, useColor));
    previousKey = key;
  }
  return `${header}\n${rows.join("\n")}`;
}

function buildRow(result: PageDeviceSummary): string {
  const scores = result.scores;
  const metrics = result.metrics;
  const lcpSeconds: string = metrics.lcpMs !== undefined ? (metrics.lcpMs / 1000).toFixed(1) : "-";
  const fcpSeconds: string = metrics.fcpMs !== undefined ? (metrics.fcpMs / 1000).toFixed(1) : "-";
  const tbtMs: string = metrics.tbtMs !== undefined ? Math.round(metrics.tbtMs).toString() : "-";
  const cls: string = metrics.cls !== undefined ? metrics.cls.toFixed(3) : "-";
  const inpMs: string = metrics.inpMs !== undefined ? Math.round(metrics.inpMs).toString() : "-";
  const issues: string = formatTopIssues(result.opportunities);
  const error: string =
    result.runtimeErrorCode ?? (result.runtimeErrorMessage !== undefined ? result.runtimeErrorMessage : "");
  return `| ${result.label} | ${result.path} | ${result.device} | ${scores.performance ?? "-"} | ${scores.accessibility ?? "-"} | ${scores.bestPractices ?? "-"} | ${scores.seo ?? "-"} | ${lcpSeconds} | ${fcpSeconds} | ${tbtMs} | ${cls} | ${inpMs} | ${error} | ${issues} |`;
}

function buildConsoleRow(result: PageDeviceSummary, useColor: boolean): string {
  const scoreLine: string = buildConsoleScoreLine(result, useColor);
  const metricsLine: string = buildConsoleMetricsLine(result, useColor);
  const errorLine: string = buildConsoleErrorLine(result, useColor);
  const issuesLine: string = buildConsoleIssuesLine(result);
  const lines: string[] = [scoreLine, metricsLine];
  if (errorLine.length > 0) {
    lines.push(errorLine);
  }
  if (issuesLine.length > 0) {
    lines.push(issuesLine);
  }
  return lines.join("\n");
}

function buildConsoleScoreLine(result: PageDeviceSummary, useColor: boolean): string {
  const scores = result.scores;
  const performanceText: string = colourScore(scores.performance, useColor);
  const accessibilityText: string = colourScore(scores.accessibility, useColor);
  const bestPracticesText: string = colourScore(scores.bestPractices, useColor);
  const seoText: string = colourScore(scores.seo, useColor);
  const deviceText: string = formatDeviceLabel(result.device, useColor);
  return `| ${result.label} | ${result.path} | ${deviceText} | ${performanceText} | ${accessibilityText} | ${bestPracticesText} | ${seoText} |`;
}

function buildConsoleMetricsLine(result: PageDeviceSummary, useColor: boolean): string {
  const metrics = result.metrics;
  const lcpText: string = formatMetricSeconds(metrics.lcpMs, LCP_GOOD_MS, LCP_WARN_MS, useColor);
  const fcpText: string = formatMetricSeconds(metrics.fcpMs, FCP_GOOD_MS, FCP_WARN_MS, useColor);
  const tbtText: string = formatMetricMilliseconds(metrics.tbtMs, TBT_GOOD_MS, TBT_WARN_MS, useColor);
  const clsText: string = formatMetricRatio(metrics.cls, CLS_GOOD, CLS_WARN, useColor);
  const inpText: string = formatMetricMilliseconds(metrics.inpMs, INP_GOOD_MS, INP_WARN_MS, useColor);
  const parts: string[] = [`LCP ${lcpText}`, `FCP ${fcpText}`, `TBT ${tbtText}`, `CLS ${clsText}`, `INP ${inpText}`];
  return `  ↳ Metrics: ${parts.join("  |  ")}`;
}

function buildConsoleErrorLine(result: PageDeviceSummary, useColor: boolean): string {
  const errorCode: string | undefined = result.runtimeErrorCode;
  const errorMessage: string | undefined = result.runtimeErrorMessage;
  if (!errorCode && !errorMessage) {
    return "";
  }
  const errorText: string = errorCode ?? errorMessage ?? "";
  const prefix: string = useColor ? `${ANSI_RED}↳ Error:${ANSI_RESET}` : "↳ Error:";
  return `  ${prefix} ${errorText}`;
}

function buildConsoleIssuesLine(result: PageDeviceSummary): string {
  const issues: string = formatTopIssues(result.opportunities);
  if (issues.length === 0) {
    return "";
  }
  return `  ↳ Top issues: ${issues}`;
}

function formatTopIssues(opportunities: readonly OpportunitySummary[]): string {
  if (opportunities.length === 0) {
    return "";
  }
  const meaningful: OpportunitySummary[] = opportunities.filter((opp) => hasMeaningfulSavings(opp));
  const source: readonly OpportunitySummary[] = meaningful.length > 0 ? meaningful : opportunities;
  const sorted: OpportunitySummary[] = [...source].sort(compareOpportunitiesByImpact);
  const limit: number = 2;
  const top: OpportunitySummary[] = sorted.slice(0, limit);
  const items: string[] = top.map((opp) => formatOpportunityLabel(opp));
  return items.join("; ");
}

function hasMeaningfulSavings(opportunity: OpportunitySummary): boolean {
  const savingsMs: number = opportunity.estimatedSavingsMs ?? 0;
  const savingsBytes: number = opportunity.estimatedSavingsBytes ?? 0;
  return savingsMs > 0 || savingsBytes > 0;
}

function compareOpportunitiesByImpact(a: OpportunitySummary, b: OpportunitySummary): number {
  const aMs: number = a.estimatedSavingsMs ?? 0;
  const bMs: number = b.estimatedSavingsMs ?? 0;
  if (aMs !== bMs) {
    return bMs - aMs;
  }
  const aBytes: number = a.estimatedSavingsBytes ?? 0;
  const bBytes: number = b.estimatedSavingsBytes ?? 0;
  return bBytes - aBytes;
}

function formatOpportunityLabel(opportunity: OpportunitySummary): string {
  const savingsMs: string =
    opportunity.estimatedSavingsMs !== undefined ? `${Math.round(opportunity.estimatedSavingsMs)}ms` : "";
  const savingsBytes: string =
    opportunity.estimatedSavingsBytes !== undefined
      ? `${Math.round(opportunity.estimatedSavingsBytes / 1024)}KB`
      : "";
  const parts: string[] = [savingsMs, savingsBytes].filter((part) => part.length > 0);
  const suffix: string = parts.length > 0 ? ` (${parts.join(", ")})` : "";
  return `${opportunity.id}${suffix}`;
}

function formatMetricSeconds(
  valueMs: number | undefined,
  goodThresholdMs: number,
  warnThresholdMs: number,
  useColor: boolean,
): string {
  if (valueMs === undefined) {
    return "-";
  }
  const seconds: number = valueMs / 1000;
  const text: string = `${seconds.toFixed(1)}s`;
  if (!useColor) {
    return text;
  }
  const colour: string = selectColourForThreshold(valueMs, goodThresholdMs, warnThresholdMs);
  return `${colour}${text}${ANSI_RESET}`;
}

function formatMetricMilliseconds(
  valueMs: number | undefined,
  goodThresholdMs: number,
  warnThresholdMs: number,
  useColor: boolean,
): string {
  if (valueMs === undefined) {
    return "-";
  }
  const rounded: number = Math.round(valueMs);
  const text: string = `${rounded}ms`;
  if (!useColor) {
    return text;
  }
  const colour: string = selectColourForThreshold(valueMs, goodThresholdMs, warnThresholdMs);
  return `${colour}${text}${ANSI_RESET}`;
}

function formatMetricRatio(
  value: number | undefined,
  goodThreshold: number,
  warnThreshold: number,
  useColor: boolean,
): string {
  if (value === undefined) {
    return "-";
  }
  const text: string = value.toFixed(3);
  if (!useColor) {
    return text;
  }
  const colour: string = selectColourForThreshold(value, goodThreshold, warnThreshold);
  return `${colour}${text}${ANSI_RESET}`;
}

function selectColourForThreshold(value: number, goodThreshold: number, warnThreshold: number): string {
  if (value <= goodThreshold) {
    return ANSI_GREEN;
  }
  if (value <= warnThreshold) {
    return ANSI_YELLOW;
  }
  return ANSI_RED;
}

function formatDeviceLabel(device: ApexDevice, useColor: boolean): string {
  if (!useColor) {
    return device;
  }
  const colour: string = device === "mobile" ? ANSI_CYAN : ANSI_BLUE;
  return `${colour}${device}${ANSI_RESET}`;
}

function colourScore(score: number | undefined, useColor: boolean): string {
  if (score === undefined) {
    return "-";
  }
  const value: number = score;
  const text: string = value.toString();
  if (!useColor) {
    return text;
  }
  let colour: string;
  if (value < 50) {
    colour = ANSI_RED;
  } else if (value < 90) {
    colour = ANSI_YELLOW;
  } else {
    colour = ANSI_GREEN;
  }
  return `${colour}${text}${ANSI_RESET}`;
}

function isRedScore(score: number | undefined): boolean {
  return typeof score === "number" && score < 50;
}

function printSummaryStats(results: readonly PageDeviceSummary[], useColor: boolean): void {
  if (results.length === 0) return;
  
  const scores = {
    performance: results.map((r) => r.scores.performance).filter((s): s is number => s !== undefined),
    accessibility: results.map((r) => r.scores.accessibility).filter((s): s is number => s !== undefined),
    bestPractices: results.map((r) => r.scores.bestPractices).filter((s): s is number => s !== undefined),
    seo: results.map((r) => r.scores.seo).filter((s): s is number => s !== undefined),
  };

  const avg = (arr: number[]): number => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const countGreen = (arr: number[]): number => arr.filter((s) => s >= 90).length;
  const countYellow = (arr: number[]): number => arr.filter((s) => s >= 50 && s < 90).length;
  const countRed = (arr: number[]): number => arr.filter((s) => s < 50).length;

  const avgP = avg(scores.performance);
  const avgA = avg(scores.accessibility);
  const avgBP = avg(scores.bestPractices);
  const avgSEO = avg(scores.seo);

  const greenCount = countGreen(scores.performance) + countGreen(scores.accessibility) + countGreen(scores.bestPractices) + countGreen(scores.seo);
  const yellowCount = countYellow(scores.performance) + countYellow(scores.accessibility) + countYellow(scores.bestPractices) + countYellow(scores.seo);
  const redCount = countRed(scores.performance) + countRed(scores.accessibility) + countRed(scores.bestPractices) + countRed(scores.seo);
  const totalScores = greenCount + yellowCount + redCount;

  const formatAvg = (val: number): string => {
    if (!useColor) return val.toString();
    const color = val >= 90 ? ANSI_GREEN : val >= 50 ? ANSI_YELLOW : ANSI_RED;
    return `${color}${val}${ANSI_RESET}`;
  };

  // eslint-disable-next-line no-console
  console.log(`\n📊 Summary: Avg P:${formatAvg(avgP)} A:${formatAvg(avgA)} BP:${formatAvg(avgBP)} SEO:${formatAvg(avgSEO)}`);
  
  const greenText = useColor ? `${ANSI_GREEN}${greenCount}${ANSI_RESET}` : greenCount.toString();
  const yellowText = useColor ? `${ANSI_YELLOW}${yellowCount}${ANSI_RESET}` : yellowCount.toString();
  const redText = useColor ? `${ANSI_RED}${redCount}${ANSI_RESET}` : redCount.toString();
  // eslint-disable-next-line no-console
  console.log(`   Scores: ${greenText} green (90+) | ${yellowText} yellow (50-89) | ${redText} red (<50) of ${totalScores} total`);
}

function printRedIssues(results: readonly PageDeviceSummary[]): void {
  const redResults: PageDeviceSummary[] = results.filter((result) => {
    const scores = result.scores;
    return (
      isRedScore(scores.performance) ||
      isRedScore(scores.accessibility) ||
      isRedScore(scores.bestPractices) ||
      isRedScore(scores.seo)
    );
  });
  if (redResults.length === 0) {
    // eslint-disable-next-line no-console
    console.log(boxify(["No red issues."]));
    return;
  }
  const lines: string[] = ["Red issues (scores below 50):"];
  for (const result of redResults) {
    const scores = result.scores;
    const badParts: string[] = [];
    if (isRedScore(scores.performance)) {
      badParts.push(`P:${scores.performance}`);
    }
    if (isRedScore(scores.accessibility)) {
      badParts.push(`A:${scores.accessibility}`);
    }
    if (isRedScore(scores.bestPractices)) {
      badParts.push(`BP:${scores.bestPractices}`);
    }
    if (isRedScore(scores.seo)) {
      badParts.push(`SEO:${scores.seo}`);
    }
    const issues: string = formatTopIssues(result.opportunities);
    lines.push(`- ${result.label} ${result.path} [${result.device}] – ${badParts.join(", ")} – ${issues}`);
  }
  // eslint-disable-next-line no-console
  console.log(boxifyWithSeparators(lines));
}

function shouldUseColor(ci: boolean, colorMode: CliColorMode): boolean {
  if (colorMode === "always") {
    return true;
  }
  if (colorMode === "never") {
    return false;
  }
  if (ci) {
    return false;
  }
  return typeof process !== "undefined" && Boolean(process.stdout && process.stdout.isTTY);
}

interface BudgetViolation {
  readonly pageLabel: string;
  readonly path: string;
  readonly device: ApexDevice;
  readonly kind: "category" | "metric";
  readonly id: string;
  readonly value: number;
  readonly limit: number;
}

function printCiSummary(args: CliArgs, results: readonly PageDeviceSummary[], budgets: ApexBudgets | undefined): void {
  if (!args.ci) {
    return;
  }
  if (!budgets) {
    // eslint-disable-next-line no-console
    console.log("\nCI mode: no budgets configured. Skipping threshold checks.");
    return;
  }
  const violations: BudgetViolation[] = collectBudgetViolations(results, budgets);
  if (violations.length === 0) {
    // eslint-disable-next-line no-console
    console.log("\nCI budgets PASSED.");
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`\nCI budgets FAILED (${violations.length} violations):`);
  for (const violation of violations) {
    // eslint-disable-next-line no-console
    console.log(
      `- ${violation.pageLabel} ${violation.path} [${violation.device}] – ${violation.kind} ${violation.id}: ${violation.value} vs limit ${violation.limit}`,
    );
  }
  process.exitCode = 1;
}

function collectBudgetViolations(
  results: readonly PageDeviceSummary[],
  budgets: ApexBudgets,
): BudgetViolation[] {
  const violations: BudgetViolation[] = [];
  for (const result of results) {
    if (budgets.categories) {
      collectCategoryViolations(result, budgets.categories, violations);
    }
    if (budgets.metrics) {
      collectMetricViolations(result, budgets.metrics, violations);
    }
  }
  return violations;
}

function collectCategoryViolations(
  result: PageDeviceSummary,
  categories: CategoryBudgetThresholds,
  allViolations: BudgetViolation[],
): void {
  const scores = result.scores;
  addCategoryViolation("performance", scores.performance, categories.performance, result, allViolations);
  addCategoryViolation("accessibility", scores.accessibility, categories.accessibility, result, allViolations);
  addCategoryViolation("bestPractices", scores.bestPractices, categories.bestPractices, result, allViolations);
  addCategoryViolation("seo", scores.seo, categories.seo, result, allViolations);
}

function addCategoryViolation(
  id: string,
  actual: number | undefined,
  limit: number | undefined,
  result: PageDeviceSummary,
  allViolations: BudgetViolation[],
): void {
  if (limit === undefined || actual === undefined) {
    return;
  }
  if (actual >= limit) {
    return;
  }
  allViolations.push({
    pageLabel: result.label,
    path: result.path,
    device: result.device,
    kind: "category",
    id,
    value: actual,
    limit,
  });
}

function formatElapsedTime(elapsedMs: number): string {
  const totalSeconds: number = Math.round(elapsedMs / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes: number = Math.floor(totalSeconds / 60);
  const remainingSeconds: number = totalSeconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

function printLowestPerformancePages(results: readonly PageDeviceSummary[], useColor: boolean): void {
  const entries: { readonly result: PageDeviceSummary; readonly performance: number | undefined }[] = results.map(
    (result) => ({
      result,
      performance: result.scores.performance,
    }),
  );
  const definedEntries: { readonly result: PageDeviceSummary; readonly performance: number }[] = entries
    .filter((entry): entry is { readonly result: PageDeviceSummary; readonly performance: number } => {
      return typeof entry.performance === "number";
    })
    .sort((a, b) => a.performance - b.performance);
  const limit: number = 5;
  const worst: { readonly result: PageDeviceSummary; readonly performance: number }[] = definedEntries.slice(0, limit);
  if (worst.length === 0) {
    return;
  }
  const lines: string[] = ["Lowest Performance pages:"];
  for (const entry of worst) {
    const perfText: string = colourScore(entry.performance, useColor);
    const label: string = entry.result.label;
    const path: string = entry.result.path;
    const device: ApexDevice = entry.result.device;
    lines.push(`- ${label} ${path} [${device}] P:${perfText}`);
  }
  // eslint-disable-next-line no-console
  console.log(boxifyWithSeparators(lines));
}

function collectMetricViolations(
  result: PageDeviceSummary,
  metricsBudgets: MetricBudgetThresholds,
  allViolations: BudgetViolation[],
): void {
  const metrics = result.metrics;
  addMetricViolation("lcpMs", metrics.lcpMs, metricsBudgets.lcpMs, result, allViolations);
  addMetricViolation("fcpMs", metrics.fcpMs, metricsBudgets.fcpMs, result, allViolations);
  addMetricViolation("tbtMs", metrics.tbtMs, metricsBudgets.tbtMs, result, allViolations);
  addMetricViolation("cls", metrics.cls, metricsBudgets.cls, result, allViolations);
  addMetricViolation("inpMs", metrics.inpMs, metricsBudgets.inpMs, result, allViolations);
}

function addMetricViolation(
  id: string,
  actual: number | undefined,
  limit: number | undefined,
  result: PageDeviceSummary,
  allViolations: BudgetViolation[],
): void {
  if (limit === undefined || actual === undefined) {
    return;
  }
  if (actual <= limit) {
    return;
  }
  allViolations.push({
    pageLabel: result.label,
    path: result.path,
    device: result.device,
    kind: "metric",
    id,
    value: actual,
    limit,
  });
}

function openInBrowser(filePath: string): void {
  const platform = process.platform;
  let command: string;
  if (platform === "win32") {
    command = `start "" "${filePath}"`;
  } else if (platform === "darwin") {
    command = `open "${filePath}"`;
  } else {
    command = `xdg-open "${filePath}"`;
  }
  exec(command, (error) => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error(`Could not open report: ${error.message}`);
    }
  });
}

function printReportLink(reportPath: string): void {
  const fileUrl: string = `file://${reportPath.replace(/\\/g, "/")}`;
  // eslint-disable-next-line no-console
  console.log(`\nReport saved to: ${reportPath}`);
  // eslint-disable-next-line no-console
  console.log(`Open report: ${fileUrl}`);
}

function printSectionHeader(label: string, useColor: boolean): void {
  const decorated: string = useColor ? `${ANSI_BLUE}${label}${ANSI_RESET}` : label;
  // eslint-disable-next-line no-console
  console.log(`\n┌─ ${decorated} ${"─".repeat(Math.max(0, 30 - label.length))}`);
}

function printDivider(): void {
  // eslint-disable-next-line no-console
  console.log("├" + "─".repeat(40));
}

function boxify(lines: readonly string[]): string {
  if (lines.length === 0) {
    return "";
  }
  const maxWidth: number = Math.max(...lines.map((line) => line.length));
  const top: string = `┌${"─".repeat(maxWidth + 2)}┐`;
  const bottom: string = `└${"─".repeat(maxWidth + 2)}┘`;
  const body: string[] = lines.map((line) => `│ ${line.padEnd(maxWidth, " ")} │`);
  return [top, ...body, bottom].join("\n");
}

function boxifyWithSeparators(lines: readonly string[]): string {
  if (lines.length === 0) {
    return "";
  }
  const maxWidth: number = Math.max(...lines.map((line) => line.length));
  const top: string = `┌${"─".repeat(maxWidth + 2)}┐`;
  const bottom: string = `└${"─".repeat(maxWidth + 2)}┘`;
  const sep: string = `├${"─".repeat(maxWidth + 2)}┤`;
  const body: string[] = lines.flatMap((line, index) => {
    const row: string = `│ ${line.padEnd(maxWidth, " ")} │`;
    if (index === lines.length - 1) {
      return [row];
    }
    return [row, sep];
  });
  return [top, ...body, bottom].join("\n");
}

function handleFriendlyError(error: unknown): void {
  const message: string = error instanceof Error ? error.message : String(error);
  if (message.includes("Could not reach")) {
    // eslint-disable-next-line no-console
    console.error("Cannot reach the target URL. Is your dev server running and accessible from this machine?");
    return;
  }
  if (message.includes("LanternError")) {
    // eslint-disable-next-line no-console
    console.error("Lighthouse trace analysis failed (Lantern). Try: reduce parallelism, set --throttling devtools, or rerun with fewer pages.");
    return;
  }
  // eslint-disable-next-line no-console
  console.error(message);
}
