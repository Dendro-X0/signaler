import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import readline from "node:readline";
import type { ApexDevice, PageDeviceSummary, RunSummary } from "./core/types.js";
import { runAuditCli } from "./cli.js";
import { runBundleCli } from "./bundle-cli.js";
import { runConsoleCli } from "./console-cli.js";
import { runHeadersCli } from "./headers-cli.js";
import { runHealthCli } from "./health-cli.js";
import { runLinksCli } from "./links-cli.js";
import { runMeasureCli } from "./measure-cli.js";
import { runWizardCli } from "./wizard-cli.js";
import { runCleanCli } from "./clean-cli.js";
import { runUninstallCli } from "./uninstall-cli.js";
import { loadConfig } from "./core/config.js";
import { runClearScreenshotsCli } from "./clear-screenshots-cli.js";
import { pathExists } from "./infrastructure/filesystem/utils.js";
import { renderPanel } from "./ui/components/panel.js";
import { renderTable } from "./ui/components/table.js";
import { startSpinner, stopSpinner, updateSpinnerMessage } from "./ui/components/progress.js";
import { UiTheme } from "./ui/themes/theme.js";

type PresetId = "default" | "overview" | "quick" | "accurate" | "devtools-accurate" | "fast";

type BuildIdStrategy = "auto" | "manual";

type ConfigRoutesCommandId = "pages" | "routes";
type ConfigEditCommandId = "add-page" | "rm-page";

interface ShellSessionState {
  readonly configPath: string;
  readonly preset: PresetId;
  readonly incremental: boolean;
  readonly buildIdStrategy: BuildIdStrategy;
  readonly buildIdManual: string | undefined;
  readonly lastReportPath: string | undefined;
}

interface ParsedShellCommand {
  readonly id: string;
  readonly args: readonly string[];
}

const SESSION_DIR_NAME = ".signaler" as const;
const SESSION_FILE_NAME = "session.json" as const;
const DEFAULT_CONFIG_PATH = "apex.config.json" as const;
const DEFAULT_PROMPT = "> " as const;
const NO_COLOR: boolean = Boolean(process.env.NO_COLOR) || process.env.CI === "true";

const theme: UiTheme = new UiTheme({ noColor: NO_COLOR });

async function readJsonFile<T extends object>(absolutePath: string): Promise<T | undefined> {
  try {
    const raw: string = await readFile(absolutePath, "utf8");
    const parsed: unknown = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    return parsed as T;
  } catch {
    return undefined;
  }
}

async function runBundleFromShell(args: readonly string[]): Promise<void> {
  const argv: string[] = ["node", "signaler", ...args];
  const escResult = await runWithEscAbort(async (signal) => {
    startSpinner("Scanning bundles");
    try {
      await runBundleCli(argv, { signal });
    } finally {
      stopSpinner();
    }
  });
  if (escResult === "aborted") {
    // eslint-disable-next-line no-console
    console.log("Bundle scan cancelled via Esc. Back to shell.");
    process.exitCode = 0;
  }
}

async function runHealthFromShell(session: ShellSessionState, args: readonly string[]): Promise<void> {
  const argv: string[] = ["node", "signaler", "--config", session.configPath, ...args];
  const escResult = await runWithEscAbort(async (signal) => {
    startSpinner("Running health checks");
    try {
      await runHealthCli(argv, { signal });
    } finally {
      stopSpinner();
    }
  });
  if (escResult === "aborted") {
    // eslint-disable-next-line no-console
    console.log("Health checks cancelled via Esc. Back to shell.");
    process.exitCode = 0;
  }
}

async function runLinksFromShell(session: ShellSessionState, args: readonly string[]): Promise<void> {
  const argv: string[] = ["node", "signaler", "--config", session.configPath, ...args];
  const escResult = await runWithEscAbort(async (signal) => {
    startSpinner("Crawling links");
    try {
      await runLinksCli(argv, { signal });
    } finally {
      stopSpinner();
    }
  });
  if (escResult === "aborted") {
    // eslint-disable-next-line no-console
    console.log("Links audit cancelled via Esc. Back to shell.");
    process.exitCode = 0;
  }
}

async function runHeadersFromShell(session: ShellSessionState, args: readonly string[]): Promise<void> {
  const argv: string[] = ["node", "signaler", "--config", session.configPath, ...args];
  const escResult = await runWithEscAbort(async (signal) => {
    startSpinner("Checking security headers");
    try {
      await runHeadersCli(argv, { signal });
    } finally {
      stopSpinner();
    }
  });
  if (escResult === "aborted") {
    // eslint-disable-next-line no-console
    console.log("Headers audit cancelled via Esc. Back to shell.");
    process.exitCode = 0;
  }
}

async function runConsoleAuditFromShell(session: ShellSessionState, args: readonly string[]): Promise<void> {
  const argv: string[] = ["node", "signaler", "--config", session.configPath, ...args];
  const escResult = await runWithEscAbort(async (signal) => {
    startSpinner("Capturing console errors");
    try {
      await runConsoleCli(argv, { signal });
    } finally {
      stopSpinner();
    }
  });
  if (escResult === "aborted") {
    // eslint-disable-next-line no-console
    console.log("Console audit cancelled via Esc. Back to shell.");
    process.exitCode = 0;
  }
}

async function writeJsonFile<T extends object>(absolutePath: string, value: T): Promise<void> {
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function loadCurrentConfig(configPath: string): Promise<{ readonly absolutePath: string; readonly config: import("./types.js").ApexConfig }> {
  const loaded = await loadConfig({ configPath });
  return { absolutePath: loaded.configPath, config: loaded.config };
}

function formatPagesTable(pages: readonly import("./types.js").ApexPageConfig[]): string {
  const headers: readonly string[] = ["#", "path", "label", "devices"] as const;
  const rows: readonly (readonly string[])[] = pages.map((p, index) => {
    return [String(index + 1), p.path, p.label, p.devices.join(",")];
  });
  return renderTable({ headers, rows });
}

async function printConfiguredPages(session: ShellSessionState): Promise<void> {
  const exists: boolean = await pathExists(session.configPath);
  if (!exists) {
    // eslint-disable-next-line no-console
    console.log(`Config not found at ${session.configPath}. Run 'init' to create a config, or use 'config <path>' to point to one.`);
    return;
  }
  const { absolutePath, config } = await loadCurrentConfig(session.configPath);
  const lines: string[] = [];
  lines.push(`${theme.dim("Config")}: ${absolutePath}`);
  lines.push(`${theme.dim("Base URL")}: ${config.baseUrl}`);
  lines.push("");
  lines.push(formatPagesTable(config.pages));
  // eslint-disable-next-line no-console
  console.log(renderPanel({ title: theme.bold("Pages"), lines }));
}

function parseDevices(raw: string): readonly ApexDevice[] | undefined {
  const parts: readonly string[] = raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
  if (parts.length === 0) {
    return undefined;
  }
  const devices: ApexDevice[] = [];
  for (const part of parts) {
    if (part === "mobile" || part === "desktop") {
      devices.push(part);
      continue;
    }
    return undefined;
  }
  return [...new Set(devices)];
}

function askLine(rl: readline.Interface, question: string): Promise<string> {
  return new Promise<string>((resolvePromise) => {
    rl.question(question, (value: string) => resolvePromise(value));
  });
}

async function addPageInteractive(rl: readline.Interface, session: ShellSessionState): Promise<void> {
  const exists: boolean = await pathExists(session.configPath);
  if (!exists) {
    // eslint-disable-next-line no-console
    console.log(`Config not found at ${session.configPath}. Run 'init' first.`);
    return;
  }
  const { absolutePath, config } = await loadCurrentConfig(session.configPath);
  // eslint-disable-next-line no-console
  console.log(formatPagesTable(config.pages));
  const rawPath: string = (await askLine(rl, "New page path (must start with /): ")).trim();
  if (!rawPath.startsWith("/")) {
    // eslint-disable-next-line no-console
    console.log("Cancelled: path must start with '/'.");
    return;
  }
  const label: string = (await askLine(rl, "Label (optional): ")).trim() || rawPath;
  const rawDevices: string = (await askLine(rl, "Devices (comma-separated: mobile,desktop) [mobile,desktop]: ")).trim();
  const devices: readonly ApexDevice[] = parseDevices(rawDevices.length > 0 ? rawDevices : "mobile,desktop") ?? ["mobile", "desktop"];
  const nextPages: import("./types.js").ApexPageConfig[] = [...config.pages, { path: rawPath, label, devices }];
  const nextConfig: import("./types.js").ApexConfig = { ...config, pages: nextPages };
  await writeJsonFile<import("./types.js").ApexConfig>(absolutePath, nextConfig);
  // eslint-disable-next-line no-console
  console.log(`Added page ${rawPath}.`);
}

async function removePageInteractive(rl: readline.Interface, session: ShellSessionState, args: readonly string[]): Promise<void> {
  const exists: boolean = await pathExists(session.configPath);
  if (!exists) {
    // eslint-disable-next-line no-console
    console.log(`Config not found at ${session.configPath}. Run 'init' first.`);
    return;
  }
  const { absolutePath, config } = await loadCurrentConfig(session.configPath);
  if (config.pages.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No pages configured.");
    return;
  }
  const byPath: string | undefined = args[0]?.trim();
  const resolvedIndex: number | undefined = (() => {
    if (byPath && byPath.startsWith("/")) {
      const index: number = config.pages.findIndex((p) => p.path === byPath);
      return index >= 0 ? index : undefined;
    }
    if (byPath && /^\d+$/.test(byPath)) {
      const idx: number = parseInt(byPath, 10) - 1;
      return idx >= 0 && idx < config.pages.length ? idx : undefined;
    }
    return undefined;
  })();
  const indexToRemove: number | undefined = resolvedIndex ?? (() => {
    // eslint-disable-next-line no-console
    console.log(formatPagesTable(config.pages));
    return undefined;
  })();
  const finalIndex: number | undefined = indexToRemove ?? (() => {
    return undefined;
  })();
  let resolvedFinalIndex: number | undefined = finalIndex;
  if (resolvedFinalIndex === undefined) {
    const answer: string = (await askLine(rl, "Remove which page? Enter # or /path (blank to cancel): ")).trim();
    if (answer.length === 0) {
      // eslint-disable-next-line no-console
      console.log("Cancelled.");
      return;
    }
    if (answer.startsWith("/")) {
      const idx: number = config.pages.findIndex((p) => p.path === answer);
      resolvedFinalIndex = idx >= 0 ? idx : undefined;
    } else if (/^\d+$/.test(answer)) {
      const idx: number = parseInt(answer, 10) - 1;
      resolvedFinalIndex = idx >= 0 && idx < config.pages.length ? idx : undefined;
    }
  }
  if (resolvedFinalIndex === undefined) {
    // eslint-disable-next-line no-console
    console.log("No matching page.");
    return;
  }
  if (config.pages.length <= 1) {
    // eslint-disable-next-line no-console
    console.log("Cancelled: config must contain at least one page.");
    return;
  }
  const removed = config.pages[resolvedFinalIndex];
  const nextPages: import("./types.js").ApexPageConfig[] = config.pages.filter((_p, i) => i !== resolvedFinalIndex);
  const nextConfig: import("./types.js").ApexConfig = { ...config, pages: nextPages };
  await writeJsonFile<import("./types.js").ApexConfig>(absolutePath, nextConfig);
  // eslint-disable-next-line no-console
  console.log(`Removed page ${removed.path}.`);
}

function getSessionPaths(projectRoot: string): { readonly dir: string; readonly file: string } {
  const dir: string = resolve(projectRoot, SESSION_DIR_NAME);
  const file: string = join(dir, SESSION_FILE_NAME);
  return { dir, file };
}

async function loadSession(projectRoot: string): Promise<ShellSessionState> {
  const { dir, file }: { readonly dir: string; readonly file: string } = getSessionPaths(projectRoot);
  if (!(await pathExists(dir))) {
    return {
      configPath: DEFAULT_CONFIG_PATH,
      preset: "default",
      incremental: false,
      buildIdStrategy: "auto",
      buildIdManual: undefined,
      lastReportPath: undefined,
    };
  }
  const existing: ShellSessionState | undefined = await readJsonFile<ShellSessionState>(file);
  if (existing === undefined) {
    return {
      configPath: DEFAULT_CONFIG_PATH,
      preset: "default",
      incremental: false,
      buildIdStrategy: "auto",
      buildIdManual: undefined,
      lastReportPath: undefined,
    };
  }
  return existing;
}

async function saveSession(projectRoot: string, session: ShellSessionState): Promise<void> {
  const { dir, file }: { readonly dir: string; readonly file: string } = getSessionPaths(projectRoot);
  await mkdir(dir, { recursive: true });
  await writeJsonFile<ShellSessionState>(file, session);
}

function parseShellCommand(line: string): ParsedShellCommand {
  const trimmed: string = line.trim();
  if (trimmed.length === 0) {
    return { id: "", args: [] };
  }
  const parts: string[] = trimmed.split(/\s+/g);
  const id: string = parts[0] ?? "";
  const args: readonly string[] = parts.slice(1);
  return { id, args };
}

function buildPrompt(session: ShellSessionState): string {
  const incText: string = session.incremental ? "on" : "off";
  const presetText: string = session.preset;
  const configText: string = session.configPath;
  const header: string = [
    theme.cyan("Signaler"),
    theme.dim("config:"),
    configText,
    theme.dim("| preset:"),
    presetText,
    theme.dim("| incremental:"),
    incText,
  ].join(" ");
  const hint: string = theme.dim("Ctrl+C: exit | type help for commands");
  return `${header} | ${hint}\n${theme.dim(DEFAULT_PROMPT)}`;
}

function openInBrowser(filePath: string): void {
  const platform: string = process.platform;
  const command: string = platform === "win32" ? `start "" "${filePath}"` : platform === "darwin" ? `open "${filePath}"` : `xdg-open "${filePath}"`;
  exec(command, (error: Error | null) => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error(`Could not open report: ${error.message}`);
    }
  });
}

async function snapshotPreviousSummary(projectRoot: string): Promise<void> {
  const currentPath: string = resolve(projectRoot, SESSION_DIR_NAME, "summary.json");
  const prevPath: string = resolve(projectRoot, SESSION_DIR_NAME, "summary.prev.json");
  if (!(await pathExists(currentPath))) {
    return;
  }
  try {
    const raw: string = await readFile(currentPath, "utf8");
    await mkdir(resolve(projectRoot, SESSION_DIR_NAME), { recursive: true });
    await writeFile(prevPath, raw, "utf8");
  } catch {
    return;
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

interface ChangeLine {
  readonly key: string;
  readonly label: string;
  readonly path: string;
  readonly device: ApexDevice;
  readonly deltaP: number;
}

function formatChanges(previous: RunSummary, current: RunSummary): string {
  const prevAvg: AvgScores = computeAvgScores(previous.results);
  const currAvg: AvgScores = computeAvgScores(current.results);
  const avgDelta = {
    performance: currAvg.performance - prevAvg.performance,
    accessibility: currAvg.accessibility - prevAvg.accessibility,
    bestPractices: currAvg.bestPractices - prevAvg.bestPractices,
    seo: currAvg.seo - prevAvg.seo,
  };
  const prevMap: Map<string, PageDeviceSummary> = new Map(previous.results.map((r) => [`${r.label}:::${r.path}:::${r.device}`, r] as const));
  const currMap: Map<string, PageDeviceSummary> = new Map(current.results.map((r) => [`${r.label}:::${r.path}:::${r.device}`, r] as const));
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
    deltas.push({ key, label: curr.label, path: curr.path, device: curr.device, deltaP });
  }
  deltas.sort((a, b) => a.deltaP - b.deltaP);
  const regressions: ChangeLine[] = deltas.slice(0, 5);
  const improvements: ChangeLine[] = [...deltas].reverse().slice(0, 5);
  const lines: string[] = [];
  lines.push(`Avg deltas: P ${avgDelta.performance} | A ${avgDelta.accessibility} | BP ${avgDelta.bestPractices} | SEO ${avgDelta.seo}`);
  lines.push(`Combos: +${added} added, -${removed} removed`);
  lines.push("Top regressions (Performance):");
  for (const r of regressions) {
    lines.push(`- ${r.label} ${r.path} [${r.device}] ΔP:${r.deltaP}`);
  }
  lines.push("Top improvements (Performance):");
  for (const r of improvements) {
    lines.push(`- ${r.label} ${r.path} [${r.device}] ΔP:${r.deltaP}`);
  }
  return lines.join("\n");
}

async function runDiff(projectRoot: string): Promise<void> {
  const prevPath: string = resolve(projectRoot, SESSION_DIR_NAME, "summary.prev.json");
  const currPath: string = resolve(projectRoot, SESSION_DIR_NAME, "summary.json");
  const prev: RunSummary | undefined = await readJsonFile<RunSummary>(prevPath);
  const curr: RunSummary | undefined = await readJsonFile<RunSummary>(currPath);
  if (!prev || !curr) {
    // eslint-disable-next-line no-console
    console.log("No diff available. Run 'audit' at least twice in this shell session.");
    return;
  }
  // eslint-disable-next-line no-console
  console.log(formatChanges(prev, curr));
}

function buildAuditArgvFromSession(session: ShellSessionState): readonly string[] {
  const args: string[] = ["node", "signaler", "audit", "--config", session.configPath];
  if (session.preset === "overview") {
    args.push("--overview");
  }
  if (session.preset === "fast") {
    args.push("--fast");
  }
  if (session.preset === "quick") {
    args.push("--quick");
  }
  if (session.preset === "accurate") {
    args.push("--accurate");
  }
  if (session.preset === "devtools-accurate") {
    args.push("--devtools-accurate");
  }
  if (session.incremental) {
    args.push("--incremental");
  }
  if (session.buildIdStrategy === "manual" && session.buildIdManual) {
    args.push("--build-id", session.buildIdManual);
  }
  return args;
}

function buildAuditArgv(session: ShellSessionState, passthroughArgs: readonly string[]): readonly string[] {
  const baseArgv: readonly string[] = buildAuditArgvFromSession(session);
  if (passthroughArgs.length === 0) {
    return baseArgv;
  }
  return [...baseArgv, ...passthroughArgs];
}

function resolvePresetFromArgs(args: readonly string[]): PresetId | undefined {
  const preset: string | undefined = args[0];
  if (
    preset === "default" ||
    preset === "overview" ||
    preset === "quick" ||
    preset === "accurate" ||
    preset === "devtools-accurate" ||
    preset === "fast"
  ) {
    return preset;
  }
  return undefined;
}

function resolveBoolFromArgs(args: readonly string[]): boolean | undefined {
  const raw: string | undefined = args[0];
  if (raw === "on") {
    return true;
  }
  if (raw === "off") {
    return false;
  }
  return undefined;
}

function resolveBuildIdStrategy(args: readonly string[]): { readonly strategy: BuildIdStrategy; readonly manual: string | undefined } | undefined {
  const raw: string | undefined = args[0];
  if (raw === "auto") {
    return { strategy: "auto", manual: undefined };
  }
  if (raw === "manual") {
    const id: string | undefined = args[1];
    if (!id || id.trim().length === 0) {
      return undefined;
    }
    return { strategy: "manual", manual: id.trim() };
  }
  return undefined;
}

type HelpTopic = "audit" | "other" | "hidden" | "all";

type HelpLine = {
  readonly command: string;
  readonly description: string;
};

const HELP_AUDIT_COMMANDS: readonly HelpLine[] = [
  { command: "audit", description: "Deep Lighthouse audit (slower)" },
  { command: "measure", description: "Fast batch metrics (CDP, non-Lighthouse)" },
  { command: "bundle", description: "Bundle size audit (Next.js .next or dist)" },
  { command: "health", description: "HTTP status + latency checks" },
  { command: "links", description: "Broken links audit" },
  { command: "headers", description: "Security headers audit" },
  { command: "console", description: "Console errors + runtime exceptions audit" },
  { command: "quick", description: "Run the quick pack (measure+headers+links+bundle+accessibility)" },
  { command: "report", description: "Generate report-only outputs from existing artifacts" },
] as const;

const HELP_OTHER_COMMANDS: readonly HelpLine[] = [
  { command: "pages", description: "Print configured pages/routes from the current config" },
  { command: "routes", description: "Alias for pages" },
  { command: "add-page", description: "Add a page to signaler.config.json (interactive)" },
  { command: "rm-page [#|/path]", description: "Remove a page from signaler.config.json (interactive)" },
  { command: "clean", description: "Remove Signaler artifacts (reports/cache and optionally config)" },
  { command: "uninstall", description: "Remove .signaler and the current config file" },
  { command: "clear-screenshots", description: "Remove .signaler/screenshots/" },
  { command: "open", description: "Open the last HTML report (or .signaler/report.html)" },
  { command: "open-triage", description: "Open triage markdown (.signaler/triage.md)" },
  { command: "open-screenshots", description: "Open the screenshots output directory (.signaler/screenshots/)" },
  { command: "open-artifacts", description: "Open the Lighthouse artifacts directory (.signaler/lighthouse-artifacts/)" },
  { command: "open-diagnostics", description: "Open diagnostics JSON directory (.signaler/lighthouse-artifacts/diagnostics/)" },
  { command: "open-lhr", description: "Open full Lighthouse JSON directory (.signaler/lighthouse-artifacts/lhr/)" },
  { command: "diff", description: "Compare last run vs previous run (from this shell session)" },
  { command: "preset <id>", description: "Set preset: default|overview|quick|accurate|devtools-accurate|fast" },
  { command: "incremental on|off", description: "Toggle incremental caching" },
  { command: "build-id auto", description: "Use auto buildId detection" },
  { command: "build-id manual <id>", description: "Use a fixed buildId" },
  { command: "config <path>", description: "Set config path used by audit" },
  { command: "help [audit|other|hidden|all]", description: "Show help (use categories to expand)" },
  { command: "exit", description: "Exit the shell" },
] as const;
const HELP_HIDDEN_COMMANDS: readonly HelpLine[] = [
  { command: "status", description: "Print current session prompt/status" },
  { command: "quit", description: "Alias for exit" },
] as const;

const HELP_TOPICS: readonly HelpTopic[] = ["audit", "other", "hidden", "all"] as const;

function parseHelpTopic(raw: string | undefined): HelpTopic | undefined {
  if (raw === "audit" || raw === "other" || raw === "hidden" || raw === "all") {
    return raw;
  }
  return undefined;
}

function pushHelpLines(lines: string[], title: string, entries: readonly HelpLine[]): void {
  lines.push(theme.bold(title));
  for (const entry of entries) {
    lines.push(`${theme.cyan(entry.command)} ${entry.description}`);
  }
}

function toLower(input: string): string {
  return input.toLowerCase();
}

function filterHelpLinesByQuery(query: string): readonly HelpLine[] {
  const q: string = toLower(query.trim());
  if (q.length === 0) {
    return [];
  }
  const all: readonly HelpLine[] = [...HELP_AUDIT_COMMANDS, ...HELP_OTHER_COMMANDS, ...HELP_HIDDEN_COMMANDS] as const;
  return all.filter((line) => {
    const hay: string = `${line.command} ${line.description}`;
    return toLower(hay).includes(q);
  });
}

async function runGuidedHelp(rl: readline.Interface): Promise<void> {
  if (!process.stdin.isTTY) {
    printHelp();
    return;
  }
  const menu = (): string[] => [
    theme.bold("Help wizard"),
    "",
    "Choose an option:",
    `  1) ${theme.cyan("Audit commands")}`,
    `  2) ${theme.cyan("Other commands")}`,
    `  3) ${theme.cyan("Hidden commands")}`,
    `  4) ${theme.cyan("Search")} (type keywords)`,
    `  5) ${theme.cyan("Show all")}`,
    `  0) ${theme.cyan("Exit help")}`,
    "",
  ];
  const renderSearch = async (): Promise<void> => {
    const query: string = (await askLine(rl, "Search text: ")).trim();
    if (query.length === 0) {
      return;
    }
    const hits: readonly HelpLine[] = filterHelpLinesByQuery(query);
    const lines: string[] = [];
    if (hits.length === 0) {
      lines.push(theme.dim(`No matches for: ${query}`));
      // eslint-disable-next-line no-console
      console.log(renderPanel({ title: theme.bold("Help search"), lines }));
      return;
    }
    pushHelpLines(lines, `Matches (${hits.length})`, hits);
    // eslint-disable-next-line no-console
    console.log(renderPanel({ title: theme.bold("Help search"), lines }));
  };
  // Loop until user exits
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-console
    console.log(renderPanel({ title: theme.bold("Help"), lines: menu() }));
    const rawChoice: string = (await askLine(rl, "Select: ")).trim();
    const choice: string = rawChoice.length > 0 ? rawChoice[0] : rawChoice;
    if (choice === "0" || choice.toLowerCase() === "exit" || choice.toLowerCase() === "q") {
      break;
    }
    if (choice === "1") {
      printHelp("audit");
      continue;
    }
    if (choice === "2") {
      printHelp("other");
      continue;
    }
    if (choice === "3") {
      printHelp("hidden");
      continue;
    }
    if (choice === "4") {
      await renderSearch();
      continue;
    }
    if (choice === "5") {
      printHelp("all");
      continue;
    }
    // If the user typed text, treat it as search fallback
    if (choice.length > 0) {
      const hits: readonly HelpLine[] = filterHelpLinesByQuery(choice);
      const lines: string[] = [];
      if (hits.length === 0) {
        lines.push(theme.dim(`No matches for: ${choice}`));
        // eslint-disable-next-line no-console
        console.log(renderPanel({ title: theme.bold("Help search"), lines }));
      } else {
        pushHelpLines(lines, `Matches (${hits.length})`, hits);
        // eslint-disable-next-line no-console
        console.log(renderPanel({ title: theme.bold("Help search"), lines }));
      }
    }
  }
}

function printHelp(rawTopic?: string): void {
  const topic: HelpTopic | undefined = parseHelpTopic(rawTopic);
  const lines: string[] = [];
  if (topic === undefined) {
    lines.push(theme.bold("Help"));
    lines.push(theme.dim("Use `help <topic>` to expand a category."));
    lines.push("");
    lines.push(theme.bold("Topics"));
    lines.push(`${theme.cyan("help audit")} Show audit commands`);
    lines.push(`${theme.cyan("help other")} Show other commands`);
    lines.push(`${theme.cyan("help hidden")} Show hidden/alias commands`);
    lines.push(`${theme.cyan("help all")} Show everything`);
    lines.push("");
    lines.push(theme.dim("Note: runs-per-combo is always 1. For baselines/comparison, rerun the same command."));
    // eslint-disable-next-line no-console
    console.log(renderPanel({ title: theme.bold("Help"), lines }));
    return;
  }
  if (topic === "audit") {
    pushHelpLines(lines, "Audit commands", HELP_AUDIT_COMMANDS);
  } else if (topic === "other") {
    pushHelpLines(lines, "Other commands", HELP_OTHER_COMMANDS);
  } else if (topic === "hidden") {
    pushHelpLines(lines, "Hidden commands", HELP_HIDDEN_COMMANDS);
  } else {
    pushHelpLines(lines, "Audit commands", HELP_AUDIT_COMMANDS);
    lines.push("");
    pushHelpLines(lines, "Other commands", HELP_OTHER_COMMANDS);
    lines.push("");
    pushHelpLines(lines, "Hidden commands", HELP_HIDDEN_COMMANDS);
  }
  lines.push("");
  lines.push(theme.dim(`Topics: ${HELP_TOPICS.join(" | ")}`));
  // eslint-disable-next-line no-console
  console.log(renderPanel({ title: theme.bold("Help"), lines }));
}

async function readCliVersion(): Promise<string> {
  try {
    const currentFilePath: string = fileURLToPath(import.meta.url);
    const packageJsonPath: string = resolve(dirname(currentFilePath), "..", "package.json");
    const raw: string = await readFile(packageJsonPath, "utf8");
    const parsed: unknown = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return "unknown";
    }
    const record = parsed as { readonly version?: unknown };
    return typeof record.version === "string" ? record.version : "unknown";
  } catch {
    return "unknown";
  }
}

function printHomeScreen(params: { readonly version: string; readonly session: ShellSessionState }): void {
  const { version, session } = params;
  const padCmd = (cmd: string): string => cmd.padEnd(14, " ");
  const lines: string[] = [];
  lines.push(theme.dim("A comprehensive web performance auditing tool for batch Lighthouse audits with automatic route detection and intelligent reporting"));
  lines.push("");
  lines.push(theme.bold("Audit commands"));
  lines.push(`${theme.cyan(padCmd("measure"))}Fast batch metrics (LCP/CLS/INP + screenshot + console errors)`);
  lines.push(`${theme.cyan(padCmd("audit"))}Deep Lighthouse audit (slower)`);
  lines.push(`${theme.cyan(padCmd("bundle"))}Bundle size audit (Next.js .next/ or dist/ build output)`);
  lines.push(`${theme.cyan(padCmd("health"))}HTTP health + latency checks for configured routes`);
  lines.push(`${theme.cyan(padCmd("links"))}Broken links audit (sitemap + HTML link extraction)`);
  lines.push(`${theme.cyan(padCmd("headers"))}Security headers audit`);
  lines.push(`${theme.cyan(padCmd("console"))}Console errors + runtime exceptions audit (headless Chrome)`);
  lines.push("");
  lines.push(theme.bold("Common commands"));
  lines.push(`${theme.cyan(padCmd("init"))}Launch config wizard to create/edit apex.config.json`);
  lines.push(`${theme.cyan(padCmd("config <path>"))}Change config file (current: ${session.configPath})`);
  lines.push(`${theme.cyan(padCmd("help"))}Show all commands`);
  lines.push("");
  lines.push(theme.bold("Tips"));
  lines.push(theme.dim("- Press Tab for auto-completion"));
  lines.push(theme.dim("- Press Ctrl+C or type exit to quit"));
  // eslint-disable-next-line no-console
  console.log(renderPanel({ title: theme.magenta(theme.bold(`Signaler v${version}`)), lines }));
}

function createCompleter(): (line: string) => readonly [readonly string[], string] {
  const commands: readonly string[] = [
    "audit",
    "measure",
    "bundle",
    "health",
    "links",
    "headers",
    "console",
    "pages",
    "routes",
    "add-page",
    "rm-page",
    "clean",
    "uninstall",
    "clear-screenshots",
    "open",
    "open-triage",
    "open-screenshots",
    "open-artifacts",
    "open-diagnostics",
    "open-lhr",
    "diff",
    "preset",
    "incremental",
    "build-id",
    "config",
    "help",
    "exit",
    "quit",
  ] as const;
  const uninstallFlags: readonly string[] = ["--project-root", "--config-path", "--config", "--dry-run", "--yes", "-y", "--json"] as const;
  const presets: readonly PresetId[] = ["default", "overview", "quick", "accurate", "devtools-accurate", "fast"] as const;
  const onOff: readonly string[] = ["on", "off"] as const;
  const buildIdModes: readonly BuildIdStrategy[] = ["auto", "manual"] as const;
  const measureFlags: readonly string[] = ["--desktop-only", "--mobile-only", "--parallel", "--timeout-ms", "--screenshots", "--json"] as const;
  const bundleFlags: readonly string[] = ["--project-root", "--root", "--top", "--json"] as const;
  const healthFlags: readonly string[] = ["--config", "-c", "--parallel", "--timeout-ms", "--json"] as const;
  const linksFlags: readonly string[] = ["--config", "-c", "--sitemap", "--parallel", "--timeout-ms", "--max-urls", "--json"] as const;
  const headersFlags: readonly string[] = ["--config", "-c", "--parallel", "--timeout-ms", "--json"] as const;
  const consoleFlags: readonly string[] = ["--config", "-c", "--parallel", "--timeout-ms", "--max-events", "--json"] as const;
  const cleanFlags: readonly string[] = [
    "--project-root",
    "--config-path",
    "--config",
    "--reports",
    "--no-reports",
    "--remove-config",
    "--all",
    "--dry-run",
    "--yes",
    "-y",
    "--json",
  ] as const;
  const clearScreenshotsFlags: readonly string[] = ["--project-root", "--dry-run", "--yes", "-y", "--json"] as const;
  const helpTopics: readonly string[] = HELP_TOPICS as readonly string[];

  const filterStartsWith = (candidates: readonly string[], fragment: string): readonly string[] => {
    const hits: readonly string[] = candidates.filter((c) => c.startsWith(fragment));
    return hits.length > 0 ? hits : candidates;
  };

  const completeFirstWord = (trimmed: string, rawLine: string): readonly [readonly string[], string] => {
    const hits: readonly string[] = commands.filter((c) => c.startsWith(trimmed));
    return [hits.length > 0 ? hits : commands, rawLine] as const;
  };

  const completeSecondWord = (command: string, fragment: string, rawLine: string): readonly [readonly string[], string] => {
    if (command === "help") {
      return [filterStartsWith(helpTopics, fragment), rawLine] as const;
    }
    if (command === "preset") {
      return [filterStartsWith(presets, fragment), rawLine] as const;
    }
    if (command === "incremental") {
      return [filterStartsWith(onOff, fragment), rawLine] as const;
    }
    if (command === "build-id") {
      return [filterStartsWith(buildIdModes, fragment), rawLine] as const;
    }
    if (command === "measure") {
      return [filterStartsWith(measureFlags, fragment), rawLine] as const;
    }
    if (command === "bundle") {
      return [filterStartsWith(bundleFlags, fragment), rawLine] as const;
    }
    if (command === "health") {
      return [filterStartsWith(healthFlags, fragment), rawLine] as const;
    }
    if (command === "links") {
      return [filterStartsWith(linksFlags, fragment), rawLine] as const;
    }
    if (command === "headers") {
      return [filterStartsWith(headersFlags, fragment), rawLine] as const;
    }
    if (command === "console") {
      return [filterStartsWith(consoleFlags, fragment), rawLine] as const;
    }
    if (command === "clean") {
      return [filterStartsWith(cleanFlags, fragment), rawLine] as const;
    }
    if (command === "uninstall") {
      return [filterStartsWith(uninstallFlags, fragment), rawLine] as const;
    }
    if (command === "clear-screenshots") {
      return [filterStartsWith(clearScreenshotsFlags, fragment), rawLine] as const;
    }
    return [[], rawLine] as const;
  };

  return (line: string): readonly [readonly string[], string] => {
    const rawLine: string = line;
    const trimmedStart: string = rawLine.trimStart();
    const parts: readonly string[] = trimmedStart.split(/\s+/g);
    const hasTrailingSpace: boolean = rawLine.endsWith(" ");
    const command: string = parts[0] ?? "";
    if (parts.length <= 1) {
      const fragment: string = command;
      return completeFirstWord(fragment, rawLine);
    }
    const secondFragment: string = hasTrailingSpace ? "" : (parts[1] ?? "");
    return completeSecondWord(command, secondFragment, rawLine);
  };
}

async function runAudit(projectRoot: string, session: ShellSessionState, passthroughArgs: readonly string[]): Promise<void> {
  await snapshotPreviousSummary(projectRoot);
  const argv: readonly string[] = buildAuditArgv(session, passthroughArgs);
  // eslint-disable-next-line no-console
  console.log("Starting audit. Tip: large runs may prompt for confirmation; pass --yes to skip the prompt.");
  await runAuditCli(argv);
}

async function runMeasureFromShell(session: ShellSessionState, args: readonly string[]): Promise<void> {
  const argv: string[] = ["node", "signaler", "--config", session.configPath, ...args];
  const escResult = await runWithEscAbort(async (signal) => {
    startSpinner("Running measure (fast metrics)");
    try {
      // eslint-disable-next-line no-console
      console.log("Starting measure (fast metrics). Tip: use --desktop-only/--mobile-only and --parallel to tune speed.");
      await runMeasureCli(argv, { signal });
    } finally {
      stopSpinner();
    }
  });
  if (escResult === "aborted") {
    // eslint-disable-next-line no-console
    console.log("Measure cancelled via Esc. Back to shell.");
    process.exitCode = 0;
  }
}

async function runWithEscAbort<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T | "aborted"> {
  const controller: AbortController = new AbortController();
  const input = process.stdin;
  input.resume();
  readline.emitKeypressEvents(input);
  if (input.isTTY) {
    // eslint-disable-next-line no-console
    console.log(theme.dim("Esc: cancel | Ctrl+C: exit"));
  }
  const handleKeypress = (_str: string, key: { readonly name?: string; readonly sequence?: string } | undefined): void => {
    if (key?.name === "c" && key?.sequence === "\u0003") {
      controller.abort();
      try {
        process.kill(process.pid, "SIGINT");
      } catch {
        return;
      }
      return;
    }
    if (key?.name === "escape" || key?.sequence === "\u001b") {
      controller.abort();
    }
  };
  const handleData = (buffer: Buffer): void => {
    if (buffer.length === 1 && buffer[0] === 0x03) {
      controller.abort();
      try {
        process.kill(process.pid, "SIGINT");
      } catch {
        return;
      }
      return;
    }
    if (buffer.length === 1 && buffer[0] === 0x1b) {
      controller.abort();
    }
  };
  const previousRaw: boolean | undefined = input.isTTY ? input.isRaw : undefined;
  if (input.isTTY) {
    input.setRawMode(true);
  }
  input.on("keypress", handleKeypress);
  input.on("data", handleData);
  try {
    try {
      const result = await task(controller.signal);
      if (controller.signal.aborted) {
        return "aborted";
      }
      return result;
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : String(error);
      if (controller.signal.aborted || message.includes("Aborted")) {
        return "aborted";
      }
      throw error;
    }
  } finally {
    input.off("keypress", handleKeypress);
    input.off("data", handleData);
    if (input.isTTY && previousRaw !== undefined) {
      input.setRawMode(previousRaw);
    }
  }
}

function resolveCleanTargets(params: { readonly projectRoot: string; readonly session: ShellSessionState; readonly args: readonly string[] }): readonly string[] {
  const removeReports: boolean = params.args.includes("--no-reports") ? false : true;
  const removeConfig: boolean = params.args.includes("--remove-config") || params.args.includes("--all");
  const targets: string[] = [];
  if (removeReports) {
    targets.push(resolve(params.projectRoot, ".signaler"));
  }
  if (removeConfig) {
    targets.push(resolve(params.projectRoot, params.session.configPath));
  }
  return targets;
}

async function confirmCleanInShell(params: { readonly rl: readline.Interface; readonly targets: readonly string[] }): Promise<boolean> {
  if (params.targets.length === 0) {
    return true;
  }
  const question: string = `This will remove:\n${params.targets.join("\n")}\nContinue? (y/N) `;
  const answer: string = await new Promise<string>((resolvePromise) => {
    params.rl.question(question, (value: string) => resolvePromise(value));
  });
  const text: string = answer.trim().toLowerCase();
  return text === "y" || text === "yes";
}

async function runAuditFromShell(projectRoot: string, session: ShellSessionState, args: readonly string[]): Promise<ShellSessionState> {
  const effectiveArgs: readonly string[] = args.includes("--yes") || args.includes("-y") ? args : [...args, "--yes"];
  const escResult = await runWithEscAbort(async (signal) => {
    await runAuditCli(buildAuditArgv(session, effectiveArgs), { signal });
  });
  if (escResult === "aborted") {
    // eslint-disable-next-line no-console
    console.log("Audit cancelled via Esc. Back to shell.");
    process.exitCode = 0;
    return session;
  }
  try {
    if (process.exitCode === 130) {
      process.exitCode = 0;
      // eslint-disable-next-line no-console
      console.log("Audit cancelled. Back to shell.");
      return session;
    }
    const reportPath: string = resolve(projectRoot, SESSION_DIR_NAME, "report.html");
    // eslint-disable-next-line no-console
    console.log(`Tip: type ${theme.cyan("open")} to view the latest HTML report.`);
    const updated: ShellSessionState = { ...session, lastReportPath: reportPath };
    await saveSession(projectRoot, updated);
    return updated;
  } catch (error: unknown) {
    const message: string = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT") && message.includes(session.configPath)) {
      // eslint-disable-next-line no-console
      console.log(
        `Config not found at ${session.configPath}. Run 'init' to create a new config for this project, or use 'config <path>' to point to an existing one.`,
      );
      return session;
    }
    throw error;
  }
}

async function handleShellCommand(projectRoot: string, session: ShellSessionState, command: ParsedShellCommand): Promise<{ readonly session: ShellSessionState; readonly shouldExit: boolean }> {
  if (command.id === "" || command.id === "status") {
    // eslint-disable-next-line no-console
    console.log(buildPrompt(session).replace(`\n${DEFAULT_PROMPT}`, ""));
    return { session, shouldExit: false };
  }
  if (command.id === "help") {
    if (command.args.length > 0) {
      printHelp(command.args[0]);
    }
    return { session, shouldExit: false };
  }
  if (command.id === "exit" || command.id === "quit") {
    return { session, shouldExit: true };
  }
  if (command.id === "pages" || command.id === "routes") {
    await printConfiguredPages(session);
    return { session, shouldExit: false };
  }
  if (command.id === "audit") {
    const nextSession: ShellSessionState = await runAuditFromShell(projectRoot, session, command.args);
    return { session: nextSession, shouldExit: false };
  }
  if (command.id === "measure") {
    await runMeasureFromShell(session, command.args);
    return { session, shouldExit: false };
  }
  if (command.id === "bundle") {
    await runBundleFromShell(command.args);
    return { session, shouldExit: false };
  }
  if (command.id === "health") {
    await runHealthFromShell(session, command.args);
    return { session, shouldExit: false };
  }
  if (command.id === "links") {
    await runLinksFromShell(session, command.args);
    return { session, shouldExit: false };
  }
  if (command.id === "headers") {
    await runHeadersFromShell(session, command.args);
    return { session, shouldExit: false };
  }
  if (command.id === "console") {
    await runConsoleAuditFromShell(session, command.args);
    return { session, shouldExit: false };
  }
  if (command.id === "clean") {
    const argv: string[] = ["node", "signaler", "--project-root", projectRoot, "--config-path", session.configPath, ...command.args];
    await runCleanCli(argv);
    return { session, shouldExit: false };
  }
  if (command.id === "uninstall") {
    const argv: string[] = ["node", "signaler", "--project-root", projectRoot, "--config-path", session.configPath, ...command.args];
    await runUninstallCli(argv);
    return { session, shouldExit: false };
  }
  if (command.id === "clear-screenshots") {
    const argv: string[] = ["node", "signaler", "--project-root", projectRoot, ...command.args];
    await runClearScreenshotsCli(argv);
    return { session, shouldExit: false };
  }
  if (command.id === "init") {
    // eslint-disable-next-line no-console
    console.log("Starting config wizard...");
    await runWizardCli(["node", "signaler"]);
    // eslint-disable-next-line no-console
    console.log(`Ready. Next: ${theme.cyan("measure")} or ${theme.cyan("audit")}.`);
    return { session, shouldExit: false };
  }
  if (command.id === "open") {
    const path: string = session.lastReportPath ?? resolve(projectRoot, SESSION_DIR_NAME, "report.html");
    openInBrowser(path);
    return { session, shouldExit: false };
  }
  if (command.id === "open-triage") {
    const path: string = resolve(projectRoot, SESSION_DIR_NAME, "triage.md");
    openInBrowser(path);
    return { session, shouldExit: false };
  }
  if (command.id === "open-screenshots") {
    const path: string = resolve(projectRoot, SESSION_DIR_NAME, "screenshots");
    openInBrowser(path);
    return { session, shouldExit: false };
  }
  if (command.id === "open-artifacts") {
    const path: string = resolve(projectRoot, SESSION_DIR_NAME, "lighthouse-artifacts");
    openInBrowser(path);
    return { session, shouldExit: false };
  }
  if (command.id === "open-diagnostics") {
    const path: string = resolve(projectRoot, SESSION_DIR_NAME, "lighthouse-artifacts", "diagnostics");
    openInBrowser(path);
    return { session, shouldExit: false };
  }
  if (command.id === "open-lhr") {
    const path: string = resolve(projectRoot, SESSION_DIR_NAME, "lighthouse-artifacts", "lhr");
    openInBrowser(path);
    return { session, shouldExit: false };
  }
  if (command.id === "diff") {
    await runDiff(projectRoot);
    return { session, shouldExit: false };
  }
  if (command.id === "preset") {
    const preset: PresetId | undefined = resolvePresetFromArgs(command.args);
    if (!preset) {
      // eslint-disable-next-line no-console
      console.log("Usage: preset default|overview|quick|accurate|devtools-accurate|fast");
      return { session, shouldExit: false };
    }
    const updated: ShellSessionState = { ...session, preset };
    await saveSession(projectRoot, updated);
    return { session: updated, shouldExit: false };
  }
  if (command.id === "incremental") {
    const value: boolean | undefined = resolveBoolFromArgs(command.args);
    if (value === undefined) {
      // eslint-disable-next-line no-console
      console.log("Usage: incremental on|off");
      return { session, shouldExit: false };
    }
    const updated: ShellSessionState = { ...session, incremental: value };
    await saveSession(projectRoot, updated);
    return { session: updated, shouldExit: false };
  }
  if (command.id === "build-id") {
    const resolved: { readonly strategy: BuildIdStrategy; readonly manual: string | undefined } | undefined = resolveBuildIdStrategy(command.args);
    if (!resolved) {
      // eslint-disable-next-line no-console
      console.log("Usage: build-id auto | build-id manual <id>");
      return { session, shouldExit: false };
    }
    const updated: ShellSessionState = { ...session, buildIdStrategy: resolved.strategy, buildIdManual: resolved.manual };
    await saveSession(projectRoot, updated);
    return { session: updated, shouldExit: false };
  }
  if (command.id === "config") {
    const configPath: string | undefined = command.args[0];
    if (!configPath || configPath.trim().length === 0) {
      // eslint-disable-next-line no-console
      console.log("Usage: config <path-to-config.json>");
      return { session, shouldExit: false };
    }
    const updated: ShellSessionState = { ...session, configPath: configPath.trim() };
    await saveSession(projectRoot, updated);
    return { session: updated, shouldExit: false };
  }
  // eslint-disable-next-line no-console
  console.log(`Unknown command: ${command.id}. Type 'help' to see commands.`);
  return { session, shouldExit: false };
}

/**
 * Starts Signaler in interactive shell mode.
 */
export async function runShellCli(argv: readonly string[]): Promise<void> {
  void argv;
  const projectRoot: string = process.cwd();
  let session: ShellSessionState = await loadSession(projectRoot);
  let printedHome: boolean = false;
  let shouldExitShell: boolean = false;
  while (!shouldExitShell) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, completer: createCompleter() });
    let rlClosed: boolean = false;
    let shouldExit: boolean = false;
    let suppressInput: boolean = false;
    rl.on("close", () => {
      rlClosed = true;
    });
    const onSigint = (): void => {
      shouldExit = true;
      rl.close();
    };
    rl.on("SIGINT", onSigint);
    if (!printedHome) {
      const version: string = await readCliVersion();
      printHomeScreen({ version, session });
      printedHome = true;
    }
    rl.setPrompt(buildPrompt(session));
    rl.prompt();
    let onLine: ((line: string) => Promise<void>) | undefined;
    const runWizardInShell = async (): Promise<void> => {
      const previousPrompt: string = buildPrompt(session);
      rl.pause();
      rl.setPrompt("");
      rl.off("SIGINT", onSigint);
      try {
        rl.prompt(true);
      } catch {
        // ignore
      }
      if (typeof onLine === "function") {
        rl.off("line", onLine);
      }
      try {
        await runWizardCli(["node", "signaler"]);
      } finally {
        rl.on("SIGINT", onSigint);
        if (rlClosed) {
          return;
        }
        if (typeof onLine === "function") {
          rl.on("line", onLine);
        }
        rl.setPrompt(previousPrompt);
        rl.resume();
      }
    };
    onLine = async (line: string): Promise<void> => {
      if (suppressInput) {
        return;
      }
      let command: ParsedShellCommand = parseShellCommand(line);
      const isEditCommand: boolean = command.id === "add-page" || command.id === "rm-page";
      if (isEditCommand && process.stdin.isTTY) {
        suppressInput = true;
        rl.pause();
        try {
          if (command.id === "add-page") {
            await addPageInteractive(rl, session);
          } else {
            await removePageInteractive(rl, session, command.args);
          }
        } finally {
          if (!rlClosed) {
            rl.resume();
            suppressInput = false;
            rl.setPrompt(buildPrompt(session));
            rl.prompt();
          }
        }
        return;
      }
      if (command.id === "clean" && !command.args.includes("--yes") && !command.args.includes("-y") && process.stdin.isTTY) {
        const targets: readonly string[] = resolveCleanTargets({ projectRoot, session, args: command.args });
        const ok: boolean = await confirmCleanInShell({ rl, targets });
        if (!ok) {
          // eslint-disable-next-line no-console
          console.log("Cancelled.");
          rl.setPrompt(buildPrompt(session));
          rl.prompt();
          return;
        }
        command = { ...command, args: [...command.args, "--yes"] };
      }
      if (command.id === "audit" && process.stdin.isTTY) {
        const exists: boolean = await pathExists(session.configPath);
        if (!exists) {
          suppressInput = true;
          rl.pause();
          const answer: string = await new Promise<string>((resolvePromise) => {
            rl.question(
              `Config not found at ${session.configPath}. Run the init wizard now? (Y/n) `,
              (value: string) => resolvePromise(value),
            );
          });
          const text: string = answer.trim().toLowerCase();
          const accepted: boolean = text.length === 0 || text === "y" || text === "yes";
          if (accepted) {
            // eslint-disable-next-line no-console
            console.log("Starting config wizard...");
            try {
              await runWizardInShell();
              // eslint-disable-next-line no-console
              console.log(`Ready. Next: ${theme.cyan("audit")}.`);
            } finally {
              // no-op
            }
          } else {
            // eslint-disable-next-line no-console
            console.log(`Config required. Create one with ${theme.cyan("init")} or point to an existing file with ${theme.cyan("config <path>")}.`);
          }
          if (!rlClosed) {
            rl.resume();
            suppressInput = false;
            rl.setPrompt(buildPrompt(session));
            rl.prompt();
          }
          return;
        }
      }
      if (command.id === "help" && command.args.length === 0 && process.stdin.isTTY) {
        suppressInput = true;
        rl.pause();
        try {
          await runGuidedHelp(rl);
        } finally {
          if (!rlClosed) {
            rl.resume();
            suppressInput = false;
            rl.setPrompt(buildPrompt(session));
            rl.prompt();
          }
        }
        return;
      }
      if (command.id === "init") {
        // eslint-disable-next-line no-console
        console.log("Starting config wizard...");
        await runWizardInShell();
        // eslint-disable-next-line no-console
        console.log(`Ready. Next: ${theme.cyan("measure")} or ${theme.cyan("audit")}.`);
        // Force readline recreation by closing current instance - this ensures
        // the shell stays alive after the wizard completes even if prompts closed stdin
        rl.close();
        return;
      }
      rl.pause();
      try {
        const result: { readonly session: ShellSessionState; readonly shouldExit: boolean } = await handleShellCommand(projectRoot, session, command);
        session = result.session;
        if (result.shouldExit) {
          shouldExit = true;
          rl.close();
          return;
        }
      } finally {
        if (!rlClosed) {
          rl.resume();
        }
      }
      if (!rlClosed) {
        rl.setPrompt(buildPrompt(session));
        rl.prompt();
      }
    };
    rl.on("line", onLine);
    await new Promise<void>((resolvePromise) => {
      rl.on("close", () => resolvePromise());
    });
    if (shouldExit) {
      shouldExitShell = true;
      continue;
    }
  }
}
