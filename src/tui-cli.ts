import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, isAbsolute } from "node:path";
import { exec } from "node:child_process";
import { Worker } from "node:worker_threads";
import { loadCortexConfig } from "./cortex/config.js";
import { ProviderFactory } from "./cortex/providers/factory.js";
import { ContextEngine } from "./cortex/context/context-engine.js";
import { AgentDispatcher } from "./cortex/agent-dispatcher.js";
import { PatchGenerator } from "./cortex/remediation/patch-generator.js";
import { PatchApplier } from "./cortex/remediation/patch-applier.js";
import type { PatchChange } from "./cortex/remediation/types.js";
import type { AuditIssue, AnalysisResult } from "./cortex/agents/types.js";

interface TuiArgs {
  readonly configPath?: string;
}

interface TuiCommandPreset {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly supportsConfig: boolean;
  readonly extraArgs: readonly string[];
}

type OutputKind = "stdout" | "stderr";
type EventLevel = "info" | "progress" | "artifact" | "error";
type RunStatus = "idle" | "running" | "success" | "error" | "stopped";
type TriageItemKind = "topIssue" | "offender" | "failing";

interface ParsedEvent {
  readonly at: string;
  readonly actor: "system" | "user" | "tool" | "ai";
  readonly level: EventLevel;
  readonly message: string;
}

interface RunSnapshot {
  readonly id: number;
  readonly status: RunStatus;
  readonly command: string;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly elapsedMs?: number;
  readonly exitText?: string;
  readonly stdoutLines: number;
  readonly stderrLines: number;
  readonly currentPage?: number;
  readonly totalPages?: number;
}

interface RunState {
  readonly id: number;
  readonly status: RunStatus;
  readonly startedAtMs: number;
  readonly commandArgs: readonly string[];
  readonly stdoutLines: number;
  readonly stderrLines: number;
  readonly eventsCount: number;
  readonly currentPage?: number;
  readonly totalPages?: number;
  readonly lastEta?: string;
  readonly lastMessage?: string;
  readonly exitText?: string;
}

interface TriageItem {
  readonly kind: TriageItemKind;
  readonly title: string;
  readonly subtitle: string;
  readonly severityScore: number;
  readonly searchText: string;
  readonly issueId?: string;
  readonly urlPath?: string;
  readonly selector?: string;
  readonly artifactPath?: string;
  readonly detailLines: readonly string[];
}

interface FixProposal {
  readonly issue: AuditIssue;
  readonly source: "ai" | "heuristic";
  readonly diagnosis: string;
  readonly summary: string;
  readonly patch?: PatchChange;
}

interface QueuedCommand {
  readonly id: number;
  readonly args: readonly string[];
  readonly source: string;
}

type UiMode = "focus" | "workspace";

interface RunCapture {
  readonly startedAtIso: string;
  readonly stdout: string[];
  readonly stderr: string[];
}

interface TuiUserConfig {
  readonly startupMode?: UiMode;
  readonly showSidebar?: boolean;
  readonly theme?: {
    readonly accent?: string;
    readonly muted?: string;
    readonly subtle?: string;
  };
}

interface TuiRuntimeRunMessage {
  readonly type: "run";
  readonly runId: number;
  readonly command: string;
  readonly fixedArgs: readonly string[];
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: Record<string, string>;
}

interface TuiRuntimeStopMessage {
  readonly type: "stop";
  readonly runId?: number;
}

interface TuiRuntimeShutdownMessage {
  readonly type: "shutdown";
}

type TuiRuntimeInputMessage = TuiRuntimeRunMessage | TuiRuntimeStopMessage | TuiRuntimeShutdownMessage;

interface TuiRuntimeStartedMessage {
  readonly type: "started";
  readonly runId: number;
  readonly pid: number;
}

interface TuiRuntimeLineMessage {
  readonly type: "line";
  readonly runId: number;
  readonly stream: OutputKind;
  readonly line: string;
}

interface TuiRuntimeExitMessage {
  readonly type: "exit";
  readonly runId: number;
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

interface TuiRuntimeErrorMessage {
  readonly type: "error";
  readonly runId?: number;
  readonly message: string;
}

type TuiRuntimeOutputMessage = TuiRuntimeStartedMessage | TuiRuntimeLineMessage | TuiRuntimeExitMessage | TuiRuntimeErrorMessage;

const COMMAND_PRESETS: readonly TuiCommandPreset[] = [
  { id: "throughput", title: "Run (Throughput)", description: "Canonical v3 run for CI-scale trend checks.", supportsConfig: true, extraArgs: ["run", "--contract", "v3", "--mode", "throughput", "--yes"] },
  { id: "fidelity", title: "Run (Fidelity)", description: "Canonical v3 run with DevTools-like stability profile.", supportsConfig: true, extraArgs: ["run", "--contract", "v3", "--mode", "fidelity", "--yes"] },
  { id: "review", title: "Review", description: "Canonical review from existing .signaler artifacts.", supportsConfig: false, extraArgs: ["review"] },
  { id: "audit", title: "Audit (Legacy)", description: "Legacy alias of run.", supportsConfig: true, extraArgs: ["audit", "--yes"] },
  { id: "report", title: "Report (Legacy)", description: "Legacy alias of review.", supportsConfig: false, extraArgs: ["report"] },
  { id: "quick", title: "Quick Pack", description: "Measure + headers + links + bundle pack.", supportsConfig: true, extraArgs: [] },
  { id: "measure", title: "Measure", description: "Fast CDP metrics pass.", supportsConfig: true, extraArgs: [] },
  { id: "bundle", title: "Bundle", description: "Build output bundle scan.", supportsConfig: false, extraArgs: [] },
  { id: "health", title: "Health", description: "HTTP status and latency checks.", supportsConfig: true, extraArgs: [] },
  { id: "links", title: "Links", description: "Broken link checks.", supportsConfig: true, extraArgs: [] },
  { id: "headers", title: "Headers", description: "Security header checks.", supportsConfig: true, extraArgs: [] },
  { id: "console", title: "Console", description: "Console errors and exceptions.", supportsConfig: true, extraArgs: [] },
] as const;

const FOCUS_SHORTCUTS = [
  { key: "1", title: "Run Throughput", desc: "Canonical v3 throughput profile", args: ["run", "--contract", "v3", "--mode", "throughput", "--yes"] },
  { key: "2", title: "Run Fidelity", desc: "Canonical v3 parity profile", args: ["run", "--contract", "v3", "--mode", "fidelity", "--yes"] },
  { key: "3", title: "Review", desc: "Rebuild review from artifacts", args: ["review"] },
  { key: "4", title: "Quick", desc: "Fast checks pack", args: ["quick"] },
  { key: "5", title: "Measure", desc: "Performance metrics pass", args: ["measure"] },
] as const;

function parseArgs(argv: readonly string[]): TuiArgs {
  let configPath: string | undefined;
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if ((arg === "--config" || arg === "-c") && i + 1 < argv.length) {
      configPath = argv[i + 1];
      i += 1;
    }
  }
  return { configPath };
}

async function loadTuiUserConfig(): Promise<TuiUserConfig> {
  const candidates = [resolve(process.cwd(), "tui.json"), resolve(process.cwd(), ".signaler", "tui.json")];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const raw = await readFile(path, "utf8");
      const doc = JSON.parse(raw) as unknown;
      const root = asRecord(doc);
      const theme = asRecord(root?.theme);
      return {
        startupMode: root?.startupMode === "workspace" ? "workspace" : root?.startupMode === "focus" ? "focus" : undefined,
        showSidebar: typeof root?.showSidebar === "boolean" ? root.showSidebar : undefined,
        theme: theme
          ? {
              accent: asString(theme.accent),
              muted: asString(theme.muted),
              subtle: asString(theme.subtle),
            }
          : undefined,
      };
    } catch {
      return {};
    }
  }
  return {};
}

function nowTimeString(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
}

function classifyLine(line: string, kind: OutputKind): EventLevel {
  if (kind === "stderr") return "error";
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("failed") || lower.includes("exception")) return "error";
  if (line.includes(".signaler/") || lower.includes("report.html") || lower.includes("summary.json") || lower.includes("results.json") || lower.includes("agent-index.json")) return "artifact";
  if (lower.includes("progress") || lower.includes("eta") || lower.includes("page ") || lower.includes("running")) return "progress";
  return "info";
}

function trimEvents(events: ParsedEvent[], maxEvents: number): ParsedEvent[] {
  return events.length <= maxEvents ? events : events.slice(events.length - maxEvents);
}

function trimHistory(history: RunSnapshot[], maxItems: number): RunSnapshot[] {
  return history.length <= maxItems ? history : history.slice(history.length - maxItems);
}

function resolveSelfInvocation(): { readonly command: string; readonly fixedArgs: readonly string[] } {
  const scriptPath = process.argv[1];
  if (typeof scriptPath === "string" && scriptPath.endsWith(".js") && existsSync(scriptPath)) {
    return { command: process.execPath, fixedArgs: [scriptPath] };
  }
  return { command: "signaler", fixedArgs: [] };
}

function parseCustomCommand(raw: string): { readonly args: readonly string[] } | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  const parts = trimmed.split(/\s+/g);
  if (parts.length === 0) return undefined;
  return { args: parts[0] === "signaler" ? parts.slice(1) : parts };
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function parsePageProgress(line: string): { readonly current: number; readonly total: number } | undefined {
  const m = /page\s+(\d+)\s*\/\s*(\d+)/i.exec(line);
  if (!m) return undefined;
  const current = Number(m[1]);
  const total = Number(m[2]);
  return Number.isFinite(current) && Number.isFinite(total) ? { current, total } : undefined;
}

function parseEta(line: string): string | undefined {
  const m = /\beta\b\s*[: ]\s*([^|]+)/i.exec(line);
  const eta = m?.[1]?.trim();
  return eta && eta.length > 0 ? eta : undefined;
}

function normalizeAuditBaseArgs(args: readonly string[]): readonly string[] {
  if (args[0] !== "audit" && args[0] !== "run") return args;
  const next: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--focus-worst") {
      i += 1;
      continue;
    }
    next.push(args[i] ?? "");
  }
  if (!next.includes("--yes")) next.push("--yes");
  return next;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : undefined;
}
function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function asArray(v: unknown): readonly unknown[] {
  return Array.isArray(v) ? v : [];
}

function pickArtifactPath(artifacts: Record<string, unknown> | undefined): string | undefined {
  if (!artifacts) return undefined;
  const candidates = [
    asString(artifacts.diagnosticsLitePath),
    asString(artifacts.diagnosticsPath),
    asString(artifacts.lhrPath),
    asString(artifacts.diagnosticsLiteRelPath),
    asString(artifacts.diagnosticsRelPath),
    asString(artifacts.lhrRelPath),
  ].filter((x): x is string => typeof x === "string" && x.length > 0);
  return candidates[0];
}

function resolveArtifactPath(path: string): string {
  return isAbsolute(path) ? path : resolve(process.cwd(), path);
}

function openPath(path: string): void {
  const command = process.platform === "win32" ? `start "" "${path}"` : process.platform === "darwin" ? `open "${path}"` : `xdg-open "${path}"`;
  exec(command, () => undefined);
}
function buildTriageItemsFromIssues(doc: unknown): readonly TriageItem[] {
  const root = asRecord(doc);
  if (!root) return [];
  const items: TriageItem[] = [];

  for (const raw of asArray(root.topIssues)) {
    const issue = asRecord(raw);
    if (!issue) continue;
    const title = asString(issue.title) ?? asString(issue.id) ?? "Unnamed issue";
    const count = asNumber(issue.count) ?? 0;
    const totalMs = asNumber(issue.totalMs) ?? 0;
    const severityScore = Math.round(count * 100 + totalMs / 10);
    items.push({
      kind: "topIssue",
      title,
      subtitle: `count=${count} totalMs=${Math.round(totalMs)}`,
      severityScore,
      searchText: `${title} ${asString(issue.id) ?? ""} ${count} ${totalMs}`.toLowerCase(),
      issueId: asString(issue.id),
      detailLines: [`Kind: topIssue`, `Title: ${title}`, `Count: ${count}`, `Total ms: ${Math.round(totalMs)}`, `Score: ${severityScore}`],
    });
  }

  for (const raw of asArray(root.offenders)) {
    const offender = asRecord(raw);
    if (!offender) continue;
    const title = asString(offender.title) ?? asString(offender.issueId) ?? "Offender";
    const affectedCombos = asNumber(offender.affectedCombos) ?? 0;
    const offenderKey = asString(offender.offenderKey) ?? "";
    const combos = asArray(offender.combos);
    let artifactPath: string | undefined;
    if (combos.length > 0) {
      const first = asRecord(combos[0]);
      artifactPath = pickArtifactPath(asRecord(first?.artifacts));
    }
    items.push({
      kind: "offender",
      title,
      subtitle: `${affectedCombos} combos ${offenderKey ? `| ${offenderKey}` : ""}`,
      severityScore: affectedCombos * 200,
      searchText: `${title} ${offenderKey} ${affectedCombos}`.toLowerCase(),
      issueId: asString(offender.issueId),
      selector: offenderKey || undefined,
      artifactPath,
      detailLines: [`Kind: offender`, `Title: ${title}`, `Affected combos: ${affectedCombos}`, `Key: ${offenderKey || "-"}`, `Has artifact: ${artifactPath ? "yes" : "no"}`],
    });
  }

  for (const raw of asArray(root.failing)) {
    const fail = asRecord(raw);
    if (!fail) continue;
    const label = asString(fail.label) ?? "unknown";
    const path = asString(fail.path) ?? "/";
    const device = asString(fail.device) ?? "-";
    const runtimeError = asString(fail.runtimeErrorMessage);
    const perf = asNumber(fail.performance);
    const a11y = asNumber(fail.accessibility);
    const bp = asNumber(fail.bestPractices);
    const seo = asNumber(fail.seo);
    const artifactPath = pickArtifactPath(asRecord(fail.artifacts));
    const perfPenalty = typeof perf === "number" ? Math.max(0, 100 - perf) : 40;
    const severityScore = perfPenalty * 10 + (runtimeError ? 200 : 0);
    items.push({
      kind: "failing",
      title: `${label} ${path} [${device}]`,
      subtitle: runtimeError ? `runtime error | P:${perf ?? "-"}` : `P:${perf ?? "-"} A:${a11y ?? "-"} BP:${bp ?? "-"} SEO:${seo ?? "-"}`,
      severityScore,
      searchText: `${label} ${path} ${device} ${runtimeError ?? ""}`.toLowerCase(),
      issueId: `${label}-${path}-${device}`,
      urlPath: path,
      artifactPath,
      detailLines: [
        `Kind: failing`,
        `Page: ${label}`,
        `Path: ${path}`,
        `Device: ${device}`,
        `Runtime error: ${runtimeError ?? "none"}`,
        `Scores: P ${perf ?? "-"} | A ${a11y ?? "-"} | BP ${bp ?? "-"} | SEO ${seo ?? "-"}`,
        `Has artifact: ${artifactPath ? "yes" : "no"}`,
      ],
    });
  }

  items.sort((a, b) => b.severityScore - a.severityScore);
  return items;
}

async function loadIssuesItems(): Promise<readonly TriageItem[]> {
  const suggestionsPath = resolve(process.cwd(), ".signaler", "suggestions.json");
  if (existsSync(suggestionsPath)) {
    try {
      const raw = await readFile(suggestionsPath, "utf8");
      const root = asRecord(JSON.parse(raw) as unknown);
      const items: TriageItem[] = [];
      for (const rawSuggestion of asArray(root?.suggestions)) {
        const suggestion = asRecord(rawSuggestion);
        if (!suggestion) continue;
        const id = asString(suggestion.id) ?? `suggestion-${items.length + 1}`;
        const title = asString(suggestion.title) ?? id;
        const confidence = asString(suggestion.confidence) ?? "unknown";
        const priorityScore = asNumber(suggestion.priorityScore) ?? 0;
        const estimatedImpact = asRecord(suggestion.estimatedImpact);
        const timeMs = asNumber(estimatedImpact?.timeMs);
        const bytes = asNumber(estimatedImpact?.bytes);
        const evidenceArray = asArray(suggestion.evidence);
        const firstEvidence = asRecord(evidenceArray[0]);
        const artifactPath = asString(firstEvidence?.artifactRelPath) ?? asString(firstEvidence?.sourceRelPath);
        const subtitleParts: string[] = [`priority=${Math.round(priorityScore)}`, `confidence=${confidence}`];
        if (typeof timeMs === "number") subtitleParts.push(`timeMs=${Math.round(timeMs)}`);
        if (typeof bytes === "number") subtitleParts.push(`bytes=${Math.round(bytes)}`);
        items.push({
          kind: "topIssue",
          title,
          subtitle: subtitleParts.join(" "),
          severityScore: Math.round(priorityScore),
          searchText: `${id} ${title} ${subtitleParts.join(" ")}`.toLowerCase(),
          issueId: id,
          artifactPath,
          detailLines: [
            `Kind: suggestion`,
            `ID: ${id}`,
            `Title: ${title}`,
            `Priority score: ${Math.round(priorityScore)}`,
            `Confidence: ${confidence}`,
            `Estimated time ms: ${typeof timeMs === "number" ? Math.round(timeMs) : "-"}`,
            `Estimated bytes: ${typeof bytes === "number" ? Math.round(bytes) : "-"}`,
            `Evidence items: ${evidenceArray.length}`,
          ],
        });
      }
      if (items.length > 0) {
        items.sort((a, b) => b.severityScore - a.severityScore);
        return items;
      }
    } catch {
      // Fallback to legacy issues below.
    }
  }

  const issuesPath = resolve(process.cwd(), ".signaler", "issues.json");
  if (!existsSync(issuesPath)) return [];
  try {
    const raw = await readFile(issuesPath, "utf8");
    return buildTriageItemsFromIssues(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function filterTriageItems(items: readonly TriageItem[], query: string): readonly TriageItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.searchText.includes(q) || item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q));
}

function triageItemLabel(item: TriageItem): string {
  const prefix = item.kind === "failing" ? "[FAIL]" : item.kind === "offender" ? "[OFF]" : "[TOP]";
  return `${prefix} ${item.title} :: ${item.subtitle}`;
}

function buildAuditIssueFromTriage(item: TriageItem, index: number): AuditIssue {
  return {
    id: item.issueId ?? `${item.kind}-${index + 1}`,
    title: item.title,
    description: `${item.subtitle}\n${item.detailLines.join("\n")}`,
    category: item.kind === "failing" ? "performance" : item.kind === "offender" ? "other" : "performance",
    selector: item.selector,
    url: item.urlPath ?? "/",
  };
}

function extractFirstCodeBlock(text: string): string | undefined {
  const match = /```(?:\w+)?\s*([\s\S]*?)```/m.exec(text);
  const block = match?.[1]?.trim();
  return block && block.length > 0 ? block : undefined;
}

function buildHeuristicReplacement(original: string, issue: AuditIssue): string {
  const hasLazyImg = /<img[^>]*>/i.test(original) && !/loading\s*=\s*["']lazy["']/i.test(original);
  if (hasLazyImg) return original.replace(/<img\b/i, "<img loading=\"lazy\"");
  const hasAltMissing = /<img[^>]*>/i.test(original) && !/\balt\s*=/.test(original);
  if (hasAltMissing) return original.replace(/<img\b/i, "<img alt=\"\""); // conservative default alt
  const hasDebugLog = /\bconsole\.log\(/.test(original);
  if (hasDebugLog) return original.replace(/\bconsole\.log\(/g, "if (process.env.NODE_ENV !== \"production\") console.log(");
  const note = `\n/* signaler-fix: ${issue.title} */`;
  return original.includes("signaler-fix:") ? original : `${original}${note}`;
}

function createHeuristicProposal(issue: AuditIssue, snippetPath: string, snippetCode: string): FixProposal {
  const replacement = buildHeuristicReplacement(snippetCode, issue);
  return {
    issue,
    source: "heuristic",
    diagnosis: "AI provider unavailable or did not return a direct code block; generated a conservative local patch.",
    summary: `Patch ${snippetPath} using deterministic fallback.`,
    patch: new PatchGenerator().createPatch(snippetPath, snippetCode, replacement),
  };
}

export async function runTuiCli(argv: readonly string[]): Promise<void> {
  const blessedModule: any = await import("blessed").catch(() => undefined);
  const blessed: any = blessedModule?.default ?? blessedModule;
  if (!blessed) {
    console.error("TUI dependency missing: install `blessed` and retry.");
    process.exitCode = 1;
    return;
  }

  const parsed = parseArgs(argv);
  const selfInvocation = resolveSelfInvocation();
  const userConfig = await loadTuiUserConfig();
  const THEME = {
    bg: userConfig.theme?.subtle ? "black" : "#090c10",
    fg: "white",
    muted: userConfig.theme?.muted ?? "gray",
    accent: userConfig.theme?.accent ?? "cyan",
    subtle: userConfig.theme?.subtle ?? "#24415f",
    good: "green",
    warn: "yellow",
    bad: "red",
  } as const;

  const screen: any = blessed.screen({
    smartCSR: true,
    title: "Signaler TUI",
    dockBorders: true,
    fullUnicode: true,
    autoPadding: true,
    useBCE: true,
    warnings: false,
    style: { bg: THEME.bg, fg: THEME.fg },
  });
  let usingAlternateBuffer = false;
  try {
    if (typeof screen.program?.alternateBuffer === "function") {
      screen.program.alternateBuffer();
      usingAlternateBuffer = true;
    }
    if (typeof screen.program?.clear === "function") screen.program.clear();
    if (typeof screen.program?.hideCursor === "function") screen.program.hideCursor();
  } catch {
    // no-op
  }

  const backdrop: any = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    style: { bg: THEME.bg, fg: THEME.fg },
  });
  if (typeof backdrop.setBack === "function") backdrop.setBack();

  const header: any = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: "100%",
    height: 3,
    tags: true,
    border: "line",
    label: " signaler ",
    content: " Loading...",
    style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted } },
  });

  const commandList: any = blessed.list({
    parent: screen,
    top: 3,
    left: 0,
    width: 32,
    height: "100%-16",
    border: "line",
    label: " workflows ",
    keys: true,
    vi: true,
    mouse: true,
    style: {
      fg: THEME.fg,
      bg: THEME.bg,
      border: { fg: THEME.muted },
      selected: { bg: THEME.accent, fg: THEME.bg, bold: true },
      item: { fg: THEME.fg },
      focus: { border: { fg: THEME.accent } },
    },
    items: COMMAND_PRESETS.map((p) => `${p.title} (${p.id})`),
    hidden: true,
  });

  const controlsBox: any = blessed.box({
    parent: screen,
    left: 0,
    top: "100%-13",
    width: 32,
    height: 7,
    border: "line",
    label: " controls ",
    tags: true,
    content: ["Enter run", "r retry", "f focus-worst", "k stop", "i triage", "x fix", "/ command bar", "Tab ? q"].join("\n"),
    style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted }, focus: { border: { fg: THEME.accent } } },
    hidden: true,
  });

  const mainWidth = userConfig.showSidebar === false ? "100%" : "100%-34";
  const metricsBox: any = blessed.box({ parent: screen, top: 3, left: 0, width: mainWidth, height: 5, border: "line", label: " metrics ", tags: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted }, focus: { border: { fg: THEME.accent } } }, content: "" });
  const outputLog: any = blessed.log({ parent: screen, top: 8, left: 0, width: mainWidth, height: "58%-4", border: "line", label: " output ", tags: true, scrollback: 5000, keys: true, vi: true, mouse: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted }, focus: { border: { fg: THEME.accent } } } });
  const detailsBox: any = blessed.box({ parent: screen, top: 3, left: "100%-34", width: 34, height: "100%-6", border: "line", label: " context ", tags: true, scrollable: true, alwaysScroll: true, keys: true, mouse: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted }, focus: { border: { fg: THEME.accent } } }, content: "", hidden: userConfig.showSidebar === false });
  const eventsLog: any = blessed.log({ parent: screen, top: "58%", left: 0, width: mainWidth, height: "42%-6", border: "line", label: " feed ", tags: true, scrollback: 1000, keys: true, vi: true, mouse: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted }, focus: { border: { fg: THEME.accent } } } });
  const commandBar: any = blessed.textbox({ parent: screen, bottom: 3, left: 0, width: "100%", height: 3, border: "line", label: " command ", inputOnFocus: true, keys: true, mouse: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.subtle }, focus: { border: { fg: THEME.accent } } }, value: "", hidden: true });
  const footer: any = blessed.box({ parent: screen, bottom: 0, left: 0, width: "100%", height: 3, border: "line", style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted } }, content: " Ready", hidden: true });

  const focusOverlay: any = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: "74%",
    height: 22,
    border: "line",
    label: "  signaler home  ",
    style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.accent } },
  });
  const focusTitle: any = blessed.box({
    parent: focusOverlay,
    top: 1,
    left: "center",
    width: 38,
    height: 3,
    align: "center",
    valign: "middle",
    tags: true,
    style: { fg: THEME.accent, bg: THEME.bg, bold: true },
    content: "Signaler",
  });
  const focusSubtitle: any = blessed.box({
    parent: focusOverlay,
    top: 3,
    left: "center",
    width: 66,
    height: 1,
    align: "center",
    tags: true,
    style: { fg: THEME.muted, bg: THEME.bg },
    content: "Canonical flow: init -> run -> review",
  });
  const focusInput: any = blessed.textbox({
    parent: focusOverlay,
    top: 5,
    left: "center",
    width: 78,
    height: 3,
    border: "line",
    label: " command ",
    inputOnFocus: true,
    keys: true,
    mouse: true,
    style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.accent }, focus: { border: { fg: THEME.accent } } },
    value: "",
  });
  const focusHint: any = blessed.box({
    parent: focusOverlay,
    top: 9,
    left: "center",
    width: 84,
    height: 2,
    align: "center",
    tags: true,
    style: { fg: THEME.muted, bg: THEME.bg },
    content: "Type any command (run/review/measure) and press Enter, or use a quick action below.",
  });
  const focusCommandCardA: any = blessed.box({
    parent: focusOverlay,
    top: 11,
    left: "3%",
    width: "46%",
    height: 4,
    border: "line",
    tags: true,
    style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted } },
    content: `{cyan-fg}[1]{/} ${FOCUS_SHORTCUTS[0].title}  {gray-fg}${FOCUS_SHORTCUTS[0].desc}{/}\n{cyan-fg}[2]{/} ${FOCUS_SHORTCUTS[1].title}  {gray-fg}${FOCUS_SHORTCUTS[1].desc}{/}`,
  });
  const focusCommandCardB: any = blessed.box({
    parent: focusOverlay,
    top: 11,
    left: "51%",
    width: "46%",
    height: 4,
    border: "line",
    tags: true,
    style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted } },
    content: `{cyan-fg}[3]{/} ${FOCUS_SHORTCUTS[2].title}  {gray-fg}${FOCUS_SHORTCUTS[2].desc}{/}\n{cyan-fg}[4]{/} ${FOCUS_SHORTCUTS[3].title}  {gray-fg}${FOCUS_SHORTCUTS[3].desc}{/}`,
  });
  const focusCommandCardC: any = blessed.box({
    parent: focusOverlay,
    top: 15,
    left: "3%",
    width: "46%",
    height: 4,
    border: "line",
    tags: true,
    style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted } },
    content: `{cyan-fg}[5]{/} ${FOCUS_SHORTCUTS[4].title}  {gray-fg}${FOCUS_SHORTCUTS[4].desc}{/}\n{cyan-fg}/commands{/}  {gray-fg}Show catalog{/}  {gray-fg}|{/}  {cyan-fg}/exit{/}`,
  });
  const focusCommandCardD: any = blessed.box({
    parent: focusOverlay,
    top: 15,
    left: "51%",
    width: "46%",
    height: 4,
    border: "line",
    tags: true,
    style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted } },
    content: "{cyan-fg}/run <args>{/}  {gray-fg}Custom raw command{/}\n{cyan-fg}Ctrl+G{/} reopen home in workspace  {gray-fg}|{/}  {cyan-fg}q{/} quit",
  });
  const focusFooter: any = blessed.box({
    parent: focusOverlay,
    top: 19,
    left: "center",
    width: 84,
    height: 1,
    align: "center",
    tags: true,
    style: { fg: THEME.muted, bg: THEME.bg },
    content: "Type {cyan-fg}exit{/} or {cyan-fg}/exit{/} to quit. Keys: q, Ctrl+C",
  });

  const helpOverlay: any = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: "70%",
    height: "70%",
    border: "line",
    label: " help ",
    hidden: true,
    tags: true,
    scrollable: true,
    mouse: true,
    keys: true,
    vi: true,
    style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.subtle } },
    content: [
      "Enter  Run selected workflow",
      "r      Re-run last command",
      "f      Re-run runner with --focus-worst 10",
      "k      Stop active command",
      "i      Open triage explorer",
      "x      Open fix workspace (from triage selection)",
      "/      Focus composer (/commands for catalog)",
      ":      Run custom signaler command",
      "Tab    Cycle focus panes",
      "?      Toggle this help",
      "q      Exit TUI",
      "Ctrl+G Return to centered home prompt",
      "",
      "Triage explorer keys: / search, g reload, o open artifact, x fix selected issue, Esc close",
      "Fix workspace keys: p generate proposal, a apply patch, Esc close",
      "Queue: if a command is running, new commands are queued and auto-started",
      "Canonical workflow: init -> run -> review (audit/report remain legacy aliases)",
    ].join("\n"),
  });
  const triageOverlay: any = blessed.box({ parent: screen, top: "center", left: "center", width: "92%", height: "88%", border: "line", label: " triage ", hidden: true, tags: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.subtle } } });
  const triageList: any = blessed.list({ parent: triageOverlay, top: 0, left: 0, width: "62%", height: "100%-3", border: "line", label: " ranked ", keys: true, vi: true, mouse: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted }, selected: { bg: THEME.accent, fg: THEME.bg, bold: true }, focus: { border: { fg: THEME.accent } } }, items: [] });
  const triageDetail: any = blessed.box({ parent: triageOverlay, top: 0, left: "62%", width: "38%", height: "100%-3", border: "line", label: " detail ", tags: true, scrollable: true, alwaysScroll: true, keys: true, mouse: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted }, focus: { border: { fg: THEME.accent } } }, content: "" });
  const triageFooter: any = blessed.box({ parent: triageOverlay, bottom: 0, left: 0, width: "100%", height: 3, border: "line", tags: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted } }, content: "" });
  const fixOverlay: any = blessed.box({ parent: screen, top: "center", left: "center", width: "94%", height: "90%", border: "line", label: " fix ", hidden: true, tags: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.subtle } } });
  const fixInfo: any = blessed.box({ parent: fixOverlay, top: 0, left: 0, width: "38%", height: "100%-3", border: "line", label: " proposal ", tags: false, scrollable: true, alwaysScroll: true, keys: true, mouse: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted }, focus: { border: { fg: THEME.accent } } }, content: "Select an issue from triage and press x." });
  const fixPatch: any = blessed.box({ parent: fixOverlay, top: 0, left: "38%", width: "62%", height: "100%-3", border: "line", label: " patch ", tags: false, scrollable: true, alwaysScroll: true, keys: true, mouse: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted }, focus: { border: { fg: THEME.accent } } }, content: "No patch generated yet." });
  const fixFooter: any = blessed.box({ parent: fixOverlay, bottom: 0, left: 0, width: "100%", height: 3, border: "line", tags: true, style: { fg: THEME.fg, bg: THEME.bg, border: { fg: THEME.muted } }, content: "" });

  let runtimeWorker: Worker | undefined;
  let runtimeAvailable = true;
  let runtimeBusy = false;
  let activeRunId: number | undefined;
  let activeRunPid: number | undefined;
  let activeRunArgs: readonly string[] | undefined;
  let lastCommand: readonly string[] | undefined;
  let lastAuditBaseArgs: readonly string[] | undefined;
  let recentEvents: ParsedEvent[] = [];
  let runHistory: RunSnapshot[] = [];
  let runCounter = 0;
  let runState: RunState | undefined;
  let stopRequested = false;
  let focusIndex = 0;
  const focusables: readonly any[] = [outputLog, eventsLog, commandBar];
  let uiMode: UiMode = "focus";
  let triageAllItems: readonly TriageItem[] = [];
  let triageItems: readonly TriageItem[] = [];
  let triageQuery = "";
  let fixItem: TriageItem | undefined;
  let fixItemIndex = -1;
  let fixProposal: FixProposal | undefined;
  let fixBusy = false;
  let queueCounter = 0;
  let queuedCommands: readonly QueuedCommand[] = [];
  let activeCapture: RunCapture | undefined;
  let lastPersistedArtifacts: readonly string[] = [];
  let composerActive = false;
  let commandHistory: readonly string[] = [];
  let commandHistoryIndex = -1;
  let focusSubmitLock = false;
  let composerSubmitLock = false;

  function setUiMode(mode: UiMode): void {
    uiMode = mode;
    const workspaceVisible = mode === "workspace";
    metricsBox.hidden = !workspaceVisible;
    outputLog.hidden = !workspaceVisible;
    eventsLog.hidden = !workspaceVisible;
    detailsBox.hidden = !workspaceVisible || userConfig.showSidebar === false;
    commandBar.hidden = !workspaceVisible;
    footer.hidden = !workspaceVisible;
    focusOverlay.hidden = workspaceVisible;
    header.hidden = mode === "focus";
    if (workspaceVisible) setTimeout(() => beginComposer(""), 0);
  }

  function focusCenterInput(initialValue = ""): void {
    if (uiMode !== "focus") return;
    focusInput.setValue(initialValue);
    focusInput.focus();
    screen.render();
    focusInput.readInput();
  }

  function pushHistoryEntry(value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (commandHistory[commandHistory.length - 1] === trimmed) return;
    commandHistory = [...commandHistory.slice(-199), trimmed];
    commandHistoryIndex = commandHistory.length;
  }

  function beginComposer(initialValue = ""): void {
    if (uiMode !== "workspace" || composerActive) return;
    if (!triageOverlay.hidden || !fixOverlay.hidden || !helpOverlay.hidden) return;
    composerActive = true;
    commandHistoryIndex = commandHistory.length;
    commandBar.setValue(initialValue);
    commandBar.focus();
    screen.render();
    commandBar.readInput();
  }

  function submitFocusInput(): void {
    if (focusSubmitLock || uiMode !== "focus") return;
    focusSubmitLock = true;
    try {
      const raw = String(focusInput.getValue() ?? "").trim();
      focusInput.setValue("");
      if (!raw) {
        screen.render();
        return;
      }
      setUiMode("workspace");
      void handleSlashCommand(raw);
      screen.render();
    } finally {
      setTimeout(() => {
        focusSubmitLock = false;
      }, 0);
    }
  }

  function submitComposerInput(): void {
    if (composerSubmitLock || !composerActive) return;
    composerSubmitLock = true;
    try {
      composerActive = false;
      const v = String(commandBar.getValue() ?? "").trim();
      commandBar.setValue("");
      if (v.length > 0) {
        pushHistoryEntry(v);
        void handleSlashCommand(v);
      }
      if (uiMode === "workspace" && triageOverlay.hidden && fixOverlay.hidden && helpOverlay.hidden) {
        setTimeout(() => beginComposer(""), 0);
      }
      screen.render();
    } finally {
      setTimeout(() => {
        composerSubmitLock = false;
      }, 0);
    }
  }

  async function persistRunArtifacts(args: readonly string[], status: RunStatus, exitText: string | undefined, capture: RunCapture | undefined): Promise<void> {
    const dir = resolve(process.cwd(), ".signaler");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const completedAtIso = new Date().toISOString();
    const artifactCandidates = [
      ".signaler/run.json",
      ".signaler/results.json",
      ".signaler/suggestions.json",
      ".signaler/agent-index.json",
      ".signaler/report.html",
      ".signaler/summary.json",
      ".signaler/issues.json",
    ];
    const existingArtifacts = artifactCandidates.filter((p) => existsSync(resolve(process.cwd(), p)));
    const payload = {
      command: `signaler ${args.join(" ")}`,
      status,
      exitText: exitText ?? "-",
      startedAt: capture?.startedAtIso,
      completedAt: completedAtIso,
      stdoutLines: capture?.stdout.length ?? 0,
      stderrLines: capture?.stderr.length ?? 0,
      artifacts: existingArtifacts,
      output: {
        stdout: capture?.stdout ?? [],
        stderr: capture?.stderr ?? [],
      },
    };
    const md = [
      `# Signaler TUI Run`,
      ``,
      `- Command: \`${payload.command}\``,
      `- Status: \`${payload.status}\``,
      `- Exit: \`${payload.exitText}\``,
      `- Started: \`${payload.startedAt ?? "-"}\``,
      `- Completed: \`${payload.completedAt}\``,
      ``,
      `## Artifacts`,
      ...(payload.artifacts.length > 0 ? payload.artifacts.map((a) => `- ${a}`) : ["- none"]),
      ``,
      `## Stdout`,
      "```text",
      ...(capture?.stdout ?? []),
      "```",
      ``,
      `## Stderr`,
      "```text",
      ...(capture?.stderr ?? []),
      "```",
      "",
    ].join("\n");
    const jsonPath = resolve(dir, "tui-last-run.json");
    const mdPath = resolve(dir, "tui-last-run.md");
    const archivedJsonPath = resolve(dir, `tui-run-${stamp}.json`);
    const archivedMdPath = resolve(dir, `tui-run-${stamp}.md`);
    await Promise.all([
      writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8"),
      writeFile(mdPath, md, "utf8"),
      writeFile(archivedJsonPath, JSON.stringify(payload, null, 2), "utf8"),
      writeFile(archivedMdPath, md, "utf8"),
      appendFile(resolve(dir, "tui-session.jsonl"), `${JSON.stringify(payload)}\n`, "utf8"),
    ]);
    lastPersistedArtifacts = [
      ".signaler/tui-last-run.md",
      ".signaler/tui-last-run.json",
      ".signaler/tui-session.jsonl",
      ".signaler/agent-index.json",
      ".signaler/results.json",
      ".signaler/suggestions.json",
    ];
    appendFeed("system", `Saved run files: .signaler/tui-last-run.md and .signaler/tui-last-run.json`, "artifact");
  }

  function renderHeader(status: string): void {
    header.setContent([
      " Signaler TUI",
      ` ${status}  •  ${parsed.configPath ?? "signaler.config.json"}  •  queue ${queuedCommands.length}`,
      "",
    ].join("\n"));
  }

  function renderFooter(status: string): void {
    footer.setContent(` ${status}\n run Enter  retry r  stop k  triage i  fix x  command /  help ?  quit q`);
  }

  function renderTriageFooter(status: string): void {
    triageFooter.setContent(` ${status}\n search /  reload g  open o  fix x  close Esc`);
  }

  function renderFixFooter(status: string): void {
    fixFooter.setContent(` ${status}\n propose p  apply a  close Esc`);
  }

  function renderMetrics(): void {
    if (!runState) {
      metricsBox.setContent(["Run: none", "Status: idle", "Progress: -", `Events: 0  Queue: ${queuedCommands.length}`].join("\n"));
      return;
    }
    const elapsedMs = Date.now() - runState.startedAtMs;
    const progressText = typeof runState.currentPage === "number" && typeof runState.totalPages === "number" ? `${runState.currentPage}/${runState.totalPages}` : "-";
    metricsBox.setContent([
      `Run: #${runState.id}  Command: signaler ${runState.commandArgs.join(" ")}`,
      `Status: ${runState.status}  Elapsed: ${formatElapsed(elapsedMs)}  Exit: ${runState.exitText ?? "-"}`,
      `Progress: ${progressText}  ETA: ${runState.lastEta ?? "-"}`,
      `stdout: ${runState.stdoutLines}  stderr: ${runState.stderrLines}  events: ${runState.eventsCount}  queue: ${queuedCommands.length}`,
    ].join("\n"));
  }

  function renderDetails(): void {
    const lines: string[] = [];
    lines.push(`Session`);
    lines.push(`${new Date().toISOString()}`);
    lines.push("");
    lines.push(`Workspace`);
    lines.push(process.cwd());
    lines.push("");
    lines.push(`Run`);
    if (lastCommand) lines.push(`Last run: signaler ${lastCommand.join(" ")}`);
    lines.push(runtimeBusy ? `Running PID: ${activeRunPid ?? "-"}` : "Running: no");
    lines.push(`Queued: ${queuedCommands.length}`);
    if (queuedCommands.length > 0) {
      for (const q of queuedCommands.slice(0, 3)) lines.push(`  #${q.id} signaler ${q.args.join(" ")}`);
    }
    lines.push("", "Recent runs:");
    for (const run of runHistory.slice(-5).reverse()) {
      lines.push(`#${run.id} ${run.status.toUpperCase()} ${run.command}`);
    }
    lines.push("", "Artifacts:");
    if (lastPersistedArtifacts.length === 0) lines.push("none");
    else for (const artifact of lastPersistedArtifacts) lines.push(artifact);
    lines.push("", "Hints:");
    lines.push("/help  /commands  /queue");
    lines.push("Use run/review for canonical v3 flow");
    lines.push("Ctrl+G focus screen");
    lines.push("", "Recent events:");
    for (const event of recentEvents.slice(-6)) {
      lines.push(`[${event.at}] ${event.actor.toUpperCase()} ${event.level.toUpperCase()} ${event.message}`);
    }
    detailsBox.setContent(lines.join("\n"));
  }

  function renderTriageList(): void {
    triageList.setItems(triageItems.map((item) => triageItemLabel(item)));
    if (triageItems.length > 0) {
      const idx = Math.max(0, Math.min(triageList.selected ?? 0, triageItems.length - 1));
      triageList.select(idx);
    }
  }

  function renderTriageDetail(): void {
    const idx = Math.max(0, Math.min(triageList.selected ?? 0, triageItems.length - 1));
    const item = triageItems[idx];
    if (!item) {
      triageDetail.setContent("No issue selected.");
      return;
    }
    triageDetail.setContent([...item.detailLines, `Artifact: ${item.artifactPath ?? "none"}`].join("\n"));
  }

  function setTriageQuery(query: string): void {
    triageQuery = query;
    triageItems = filterTriageItems(triageAllItems, triageQuery);
    renderTriageList();
    renderTriageDetail();
    renderTriageFooter(`Query: ${triageQuery || "(none)"} | ${triageItems.length}/${triageAllItems.length} issues`);
  }

  async function reloadTriageItems(): Promise<void> {
    triageAllItems = await loadIssuesItems();
    setTriageQuery(triageQuery);
    if (triageAllItems.length === 0) renderTriageFooter("No triage source found (.signaler/suggestions.json or .signaler/issues.json). Run `run` first.");
    screen.render();
  }

  function pushHistoryFromRun(state: RunState): void {
    runHistory = trimHistory([
      ...runHistory,
      {
        id: state.id,
        status: state.status,
        command: `signaler ${state.commandArgs.join(" ")}`,
        startedAt: new Date(state.startedAtMs).toISOString(),
        finishedAt: new Date().toISOString(),
        elapsedMs: Date.now() - state.startedAtMs,
        exitText: state.exitText,
        stdoutLines: state.stdoutLines,
        stderrLines: state.stderrLines,
        currentPage: state.currentPage,
        totalPages: state.totalPages,
      },
    ], 25);
  }

  function appendFeed(actor: "system" | "user" | "tool" | "ai", message: string, level: EventLevel): void {
    recentEvents = trimEvents([...recentEvents, { at: nowTimeString(), actor, level, message }], 250);
    const actorColor = actor === "user" ? "{cyan-fg}" : actor === "ai" ? "{green-fg}" : actor === "system" ? "{blue-fg}" : "{white-fg}";
    const levelColor = level === "error" ? "{red-fg}" : level === "artifact" ? "{cyan-fg}" : level === "progress" ? "{yellow-fg}" : "{white-fg}";
    eventsLog.log(`${actorColor}[${nowTimeString()}] ${actor.toUpperCase()}{/} ${levelColor}${message}{/}`);
    renderMetrics();
    renderDetails();
  }

  function writeEvent(line: string, kind: OutputKind): void {
    const message = line.trim();
    if (!message) return;
    const level = classifyLine(message, kind);
    if (runState) {
      const progress = parsePageProgress(message);
      const eta = parseEta(message);
      runState = {
        ...runState,
        eventsCount: runState.eventsCount + 1,
        currentPage: progress?.current ?? runState.currentPage,
        totalPages: progress?.total ?? runState.totalPages,
        lastEta: eta ?? runState.lastEta,
        lastMessage: message,
      };
    }
    appendFeed("tool", message, level);
  }

  function handleOutputLine(line: string, kind: OutputKind): void {
    outputLog.log(`[${nowTimeString()}] ${kind === "stderr" ? "{red-fg}[ERR]{/}" : "{green-fg}[OUT]{/}"} ${line}`);
    if (activeCapture) {
      if (kind === "stdout") activeCapture.stdout.push(line);
      else activeCapture.stderr.push(line);
      if (activeCapture.stdout.length > 1200) activeCapture.stdout.splice(0, activeCapture.stdout.length - 1200);
      if (activeCapture.stderr.length > 1200) activeCapture.stderr.splice(0, activeCapture.stderr.length - 1200);
    }
    if (runState) {
      runState = { ...runState, stdoutLines: runState.stdoutLines + (kind === "stdout" ? 1 : 0), stderrLines: runState.stderrLines + (kind === "stderr" ? 1 : 0) };
    }
    writeEvent(line, kind);
  }

  function buildArgsForPreset(preset: TuiCommandPreset): readonly string[] {
    const args: string[] = [preset.id, ...preset.extraArgs];
    if (preset.supportsConfig && parsed.configPath) args.push("--config", parsed.configPath);
    return args;
  }

  function enqueueCommand(args: readonly string[], source: string): void {
    queueCounter += 1;
    queuedCommands = [...queuedCommands, { id: queueCounter, args, source }];
    appendFeed("system", `Queued #${queueCounter} from ${source}: signaler ${args.join(" ")}`, "progress");
    renderFooter(`Queued command (#${queueCounter}).`);
    renderMetrics();
    renderDetails();
    screen.render();
  }

  function runNextQueued(): void {
    if (runtimeBusy || queuedCommands.length === 0) return;
    const [next, ...rest] = queuedCommands;
    queuedCommands = rest;
    appendFeed("system", `Starting queued #${next.id}: signaler ${next.args.join(" ")}`, "progress");
    startProcess(next.args);
  }

  function findPresetById(id: string): TuiCommandPreset | undefined {
    return COMMAND_PRESETS.find((p) => p.id === id);
  }

  function commandCatalog(): readonly { readonly name: string; readonly description: string }[] {
    return [
      ...COMMAND_PRESETS.map((p) => ({ name: `/${p.id}`, description: p.description })),
      { name: "/run <args>", description: "Run raw signaler args." },
      { name: "/triage", description: "Open triage explorer." },
      { name: "/fix", description: "Open fix workspace." },
      { name: "/queue", description: "Show queued commands." },
      { name: "/clear", description: "Clear feed." },
      { name: "/exit", description: "Exit the TUI." },
      { name: "/commands", description: "Show command catalog." },
      { name: "/help", description: "Show command summary." },
    ];
  }

  async function handleSlashCommand(raw: string): Promise<void> {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return;
    appendFeed("user", trimmed, "info");
    const lowerRaw = trimmed.toLowerCase();
    if (lowerRaw === "exit" || lowerRaw === "quit") {
      shutdownTui();
      return;
    }
    if (!trimmed.startsWith("/")) {
      const parsedCommand = parseCustomCommand(trimmed);
      if (!parsedCommand || parsedCommand.args.length === 0) {
        appendFeed("ai", "Type a command like run, review, quick, or use /help.", "error");
        return;
      }
      startProcess(parsedCommand.args);
      return;
    }

    const parts = trimmed.slice(1).trim().split(/\s+/g).filter((x) => x.length > 0);
    const command = parts[0]?.toLowerCase() ?? "";
    const rest = parts.slice(1);

    if (command === "exit" || command === "quit") {
      shutdownTui();
      return;
    }
    if (command === "help") {
      appendFeed("ai", "Use /commands to list all commands. Canonical flow: run -> review.", "info");
      return;
    }
    if (command === "commands") {
      const list = commandCatalog().map((c) => `${c.name} - ${c.description}`).join("\n");
      appendFeed("ai", `Command catalog:\n${list}`, "info");
      return;
    }
    if (command === "queue") {
      const summary = queuedCommands.length === 0 ? "Queue is empty." : queuedCommands.map((q) => `#${q.id} signaler ${q.args.join(" ")}`).join(" | ");
      appendFeed("ai", summary, "info");
      return;
    }
    if (command === "clear") {
      eventsLog.setContent("");
      appendFeed("system", "Event stream cleared.", "info");
      screen.render();
      return;
    }
    if (command === "triage") {
      await openTriageOverlay();
      appendFeed("ai", "Opened triage explorer.", "info");
      return;
    }
    if (command === "fix") {
      if (!triageOverlay.hidden) {
        openFixOverlayFromSelection();
        appendFeed("ai", "Opened fix workspace from triage selection.", "info");
        return;
      }
      if (fixItem) {
        fixOverlay.hidden = false;
        renderFixWorkspace("Ready. Press p to generate proposal.");
        fixInfo.focus();
        screen.render();
        appendFeed("ai", "Opened existing fix workspace context.", "info");
        return;
      }
      appendFeed("ai", "No selected issue yet. Open triage with /triage, select an issue, then press x.", "info");
      return;
    }
    if (command === "run") {
      if (rest.length === 0) {
        appendFeed("ai", "Usage: /run <signaler args>", "error");
        return;
      }
      startProcess(rest);
      return;
    }

    const preset = findPresetById(command);
    if (preset) {
      const args = [...buildArgsForPreset(preset), ...rest];
      startProcess(args);
      return;
    }

    appendFeed("ai", `Unknown command: /${command}. Try /help.`, "error");
  }

  function focusCommandBar(initial = "/"): void {
    if (uiMode !== "workspace") return;
    if (!triageOverlay.hidden || !fixOverlay.hidden || !helpOverlay.hidden) return;
    beginComposer(initial);
  }

  function runtimeEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value === "string") env[key] = value;
    }
    return env;
  }

  function completeRun(args: readonly string[], status: RunStatus, exitText: string): void {
    runtimeBusy = false;
    activeRunId = undefined;
    activeRunPid = undefined;
    activeRunArgs = undefined;
    outputLog.log(`[${nowTimeString()}] {yellow-fg}Process exited with ${exitText}{/}`);
    writeEvent(`Process exited with ${exitText}`, status === "success" ? "stdout" : "stderr");
    if (runState) {
      runState = { ...runState, status, exitText };
      pushHistoryFromRun(runState);
    }
    if (status === "success" && (args[0] === "audit" || args[0] === "run")) void reloadTriageItems();
    renderHeader("idle");
    renderFooter(`Completed: ${exitText}`);
    renderMetrics();
    renderDetails();
    screen.render();
    void persistRunArtifacts(args, status, exitText, activeCapture).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      appendFeed("system", `Failed to persist .signaler run artifacts: ${message}`, "error");
    });
    activeCapture = undefined;
    runNextQueued();
  }

  function handleRuntimeMessage(message: unknown): void {
    const evt = message as TuiRuntimeOutputMessage;
    if (evt?.type === "started") {
      if (evt.runId !== activeRunId) return;
      activeRunPid = evt.pid;
      appendFeed("system", `Runtime started (pid ${evt.pid}).`, "progress");
      renderDetails();
      renderMetrics();
      screen.render();
      return;
    }
    if (evt?.type === "line") {
      if (evt.runId !== activeRunId) return;
      handleOutputLine(evt.line, evt.stream);
      renderMetrics();
      screen.render();
      return;
    }
    if (evt?.type === "exit") {
      if (evt.runId !== activeRunId || !activeRunArgs) return;
      const exitText = evt.signal ? `signal ${evt.signal}` : `code ${evt.code ?? 0}`;
      const status: RunStatus = stopRequested ? "stopped" : evt.code === 0 ? "success" : "error";
      completeRun(activeRunArgs, status, exitText);
      return;
    }
    if (evt?.type === "error") {
      const messageText = evt.message || "runtime error";
      outputLog.log(`[${nowTimeString()}] {red-fg}Runtime error: ${messageText}{/}`);
      writeEvent(`Runtime error: ${messageText}`, "stderr");
      if (typeof evt.runId === "number" && evt.runId === activeRunId && activeRunArgs) {
        completeRun(activeRunArgs, "error", "runtime error");
      } else {
        renderMetrics();
        renderDetails();
        screen.render();
      }
    }
  }

  function ensureRuntimeWorker(): Worker | undefined {
    if (!runtimeAvailable) return undefined;
    if (runtimeWorker) return runtimeWorker;
    try {
      runtimeWorker = new Worker(new URL("./tui-runtime-worker.js", import.meta.url));
      runtimeWorker.on("message", handleRuntimeMessage);
      runtimeWorker.on("error", (error: Error) => {
        appendFeed("system", `Runtime worker failed: ${error.message}`, "error");
        runtimeAvailable = false;
        runtimeWorker = undefined;
        if (runtimeBusy && activeRunArgs) completeRun(activeRunArgs, "error", "runtime worker failure");
      });
      runtimeWorker.on("exit", (code: number) => {
        const hadRunning = runtimeBusy && !!activeRunArgs;
        const args = activeRunArgs;
        runtimeWorker = undefined;
        runtimeAvailable = runtimeAvailable && code === 0;
        if (code !== 0) appendFeed("system", `Runtime worker exited unexpectedly with code ${code}.`, "error");
        if (hadRunning && args) completeRun(args, "error", `runtime worker exit ${code}`);
      });
      return runtimeWorker;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      runtimeAvailable = false;
      appendFeed("system", `Failed to start runtime worker: ${message}`, "error");
      return undefined;
    }
  }

  function startProcess(args: readonly string[]): void {
    if (runtimeBusy) {
      enqueueCommand(args, "interactive");
      return;
    }
    const worker = ensureRuntimeWorker();
    if (!worker) {
      renderFooter("Runtime unavailable. Restart TUI to retry.");
      screen.render();
      return;
    }
    setUiMode("workspace");
    runCounter += 1;
    stopRequested = false;
    runtimeBusy = true;
    activeRunId = runCounter;
    activeRunPid = undefined;
    activeRunArgs = args;
    lastCommand = args;
    activeCapture = { startedAtIso: new Date().toISOString(), stdout: [], stderr: [] };
    if (args[0] === "audit" || args[0] === "run") lastAuditBaseArgs = normalizeAuditBaseArgs(args);
    runState = { id: runCounter, status: "running", startedAtMs: Date.now(), commandArgs: args, stdoutLines: 0, stderrLines: 0, eventsCount: 0 };

    const commandArgs = [...selfInvocation.fixedArgs, ...args];
    outputLog.log(`[${nowTimeString()}] {cyan-fg}$ ${selfInvocation.command} ${commandArgs.join(" ")}{/}`);
    appendFeed("system", `$ ${selfInvocation.command} ${commandArgs.join(" ")}`, "progress");
    renderHeader("running");
    renderFooter(`Running: signaler ${args.join(" ")}`);
    renderMetrics();
    renderDetails();
    screen.render();
    const msg: TuiRuntimeRunMessage = {
      type: "run",
      runId: runCounter,
      command: selfInvocation.command,
      fixedArgs: selfInvocation.fixedArgs,
      args,
      cwd: process.cwd(),
      env: runtimeEnv(),
    };
    try {
      worker.postMessage(msg satisfies TuiRuntimeInputMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      outputLog.log(`[${nowTimeString()}] {red-fg}Runtime dispatch error: ${message}{/}`);
      writeEvent(`Runtime dispatch error: ${message}`, "stderr");
      completeRun(args, "error", "runtime dispatch error");
    }
  }

  function runSelectedPreset(): void {
    const selectedIndex = Math.max(0, Math.min(commandList.selected ?? 0, COMMAND_PRESETS.length - 1));
    startProcess(buildArgsForPreset(COMMAND_PRESETS[selectedIndex] ?? COMMAND_PRESETS[0]));
  }

  function runFocusWorst(): void {
    const baseArgs = lastAuditBaseArgs ?? (() => {
      const a: string[] = ["run", "--contract", "v3", "--mode", "throughput", "--yes"];
      if (parsed.configPath) a.push("--config", parsed.configPath);
      return a;
    })();
    const focusArgs = [...baseArgs];
    if (!focusArgs.includes("--focus-worst")) focusArgs.push("--focus-worst", "10");
    if (!focusArgs.includes("--yes")) focusArgs.push("--yes");
    startProcess(focusArgs);
  }

  function runFocusShortcut(index: number): void {
    const shortcut = FOCUS_SHORTCUTS[index];
    if (!shortcut) return;
    const args: string[] = [...shortcut.args];
    if (parsed.configPath && !args.includes("--config")) {
      args.push("--config", parsed.configPath);
    }
    setUiMode("workspace");
    startProcess(args);
  }

  function stopActiveProcess(): void {
    if (!runtimeBusy) {
      renderFooter("No running command.");
      screen.render();
      return;
    }
    stopRequested = true;
    runtimeWorker?.postMessage({ type: "stop", runId: activeRunId } satisfies TuiRuntimeInputMessage);
    renderFooter("Stop signal sent (SIGTERM).");
    screen.render();
  }

  function cycleFocus(): void {
    focusIndex = (focusIndex + 1) % focusables.length;
    focusables[focusIndex]?.focus();
    renderFooter(`Focus: ${focusIndex === 0 ? "output" : focusIndex === 1 ? "feed" : "composer"}`);
    screen.render();
  }

  function openCommandPrompt(): void {
    const prompt = blessed.prompt({ parent: screen, border: "line", label: " Run Command ", top: "center", left: "center", width: "70%", height: 7, keys: true, vi: true, tags: true, style: { border: { fg: "cyan" } } });
    prompt.input("Run custom command", "signaler ", (_err: unknown, value: string | undefined) => {
      prompt.destroy();
      screen.render();
      if (typeof value !== "string") return;
      const parsedCommand = parseCustomCommand(value);
      if (!parsedCommand) return;
      startProcess(parsedCommand.args);
    });
  }

  function openTriageSearchPrompt(): void {
    const prompt = blessed.prompt({ parent: triageOverlay, border: "line", label: " Triage Search ", top: "center", left: "center", width: "70%", height: 7, keys: true, vi: true, tags: true, style: { border: { fg: "cyan" } } });
    prompt.input("Filter issues", triageQuery, (_err: unknown, value: string | undefined) => {
      prompt.destroy();
      if (typeof value === "string") {
        triageQuery = value;
        triageItems = filterTriageItems(triageAllItems, triageQuery);
        triageList.setItems(triageItems.map((item) => triageItemLabel(item)));
        if (triageItems.length > 0) triageList.select(0);
        renderTriageDetail();
        renderTriageFooter(`Query: ${triageQuery || "(none)"} | ${triageItems.length}/${triageAllItems.length} issues`);
      }
      triageList.focus();
      screen.render();
    });
  }

  function renderTriageDetailCurrent(): void {
    const idx = Math.max(0, Math.min(triageList.selected ?? 0, triageItems.length - 1));
    const item = triageItems[idx];
    if (!item) {
      triageDetail.setContent("No issue selected.");
      return;
    }
    triageDetail.setContent([...item.detailLines, `Artifact: ${item.artifactPath ?? "none"}`].join("\n"));
  }

  function renderFixWorkspace(status: string): void {
    renderFixFooter(status);
    if (!fixItem) {
      fixInfo.setContent("No issue selected.\nOpen triage with [i], pick an issue, then press [x].");
      fixPatch.setContent("No patch generated yet.");
      return;
    }
    const issue = buildAuditIssueFromTriage(fixItem, Math.max(0, fixItemIndex));
    const proposalLines = [
      `Issue: ${issue.title}`,
      `Category: ${issue.category}`,
      `Path: ${issue.url ?? "-"}`,
      `Selector: ${issue.selector ?? "-"}`,
      `Source: ${fixProposal?.source ?? "-"}`,
      "",
      `Diagnosis:`,
      fixProposal?.diagnosis ?? "No proposal generated.",
      "",
      `Summary:`,
      fixProposal?.summary ?? "Press [p] to generate proposal.",
    ];
    fixInfo.setContent(proposalLines.join("\n"));
    if (!fixProposal?.patch) {
      fixPatch.setContent("No patch preview available.");
      return;
    }
    fixPatch.setContent(new PatchGenerator().formatDiff(fixProposal.patch));
  }

  async function generateFixProposal(): Promise<void> {
    if (!fixItem || fixBusy) return;
    fixBusy = true;
    fixProposal = undefined;
    appendFeed("user", `Generate fix proposal for: ${fixItem.title}`, "info");
    renderFixWorkspace("Generating proposal...");
    screen.render();

    const issue = buildAuditIssueFromTriage(fixItem, Math.max(0, fixItemIndex));
    const patchGenerator = new PatchGenerator();
    try {
      appendFeed("system", "Building source context for selected issue...", "progress");
      const contextEngine = new ContextEngine(process.cwd());
      await contextEngine.init();
      const snippets = await contextEngine.getContextForAudit(issue.url ?? "/", issue.selector);
      const snippet = snippets[0];

      let aiResult: AnalysisResult | undefined;
      let aiFailure = "";
      try {
        appendFeed("system", "Attempting AI-backed proposal...", "progress");
        const config = await loadCortexConfig(process.cwd());
        const needsKey = config.provider !== "local" && config.provider !== "ollama";
        if (needsKey && !config.apiKey) throw new Error("AI provider key missing.");
        const provider = ProviderFactory.create(config);
        const dispatcher = new AgentDispatcher(provider, contextEngine);
        aiResult = await dispatcher.getAgentForIssue(issue).analyze(issue);
        appendFeed("ai", "AI analysis completed.", "info");
      } catch (err) {
        aiFailure = err instanceof Error ? err.message : String(err);
        appendFeed("system", `AI unavailable, using local fallback: ${aiFailure}`, "progress");
      }

      if (aiResult && snippet) {
        const fromBlock = extractFirstCodeBlock(aiResult.fix);
        const replacement = fromBlock ?? buildHeuristicReplacement(snippet.code, issue);
        fixProposal = {
          issue,
          source: fromBlock ? "ai" : "heuristic",
          diagnosis: aiResult.diagnosis || "AI analysis completed.",
          summary: aiResult.fix || aiResult.logic || "AI proposal generated.",
          patch: patchGenerator.createPatch(snippet.path, snippet.code, replacement),
        };
      } else if (snippet) {
        fixProposal = createHeuristicProposal(issue, snippet.path, snippet.code);
      } else {
        fixProposal = {
          issue,
          source: "heuristic",
          diagnosis: aiFailure || "No source snippet mapped for this issue.",
          summary: "Unable to build patch preview for the selected issue.",
        };
      }

      writeEvent(`Fix proposal generated for ${issue.title} (${fixProposal.source}).`, "stdout");
      renderFixWorkspace(fixProposal.patch ? "Proposal ready." : "Proposal ready (no patch).");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      fixProposal = {
        issue,
        source: "heuristic",
        diagnosis: message,
        summary: "Fix proposal failed. Try another issue or rerun run/audit.",
      };
      writeEvent(`Fix proposal failed: ${message}`, "stderr");
      renderFixWorkspace("Proposal failed.");
    } finally {
      fixBusy = false;
      screen.render();
    }
  }

  function applyFixProposal(): void {
    const patch = fixProposal?.patch;
    if (!patch) {
      renderFixWorkspace("No patch to apply.");
      screen.render();
      return;
    }

    const question = blessed.question({ parent: fixOverlay, border: "line", label: " Confirm Apply ", top: "center", left: "center", width: "70%", height: 7, keys: true, vi: true, style: { border: { fg: "cyan" } } });
    question.ask(`Apply patch to ${patch.path}?`, async (_err: unknown, ok: boolean) => {
      question.destroy();
      if (!ok) {
        appendFeed("user", `Canceled patch apply: ${patch.path}`, "info");
        renderFixWorkspace("Patch apply canceled.");
        screen.render();
        return;
      }

      appendFeed("user", `Apply patch: ${patch.path}`, "progress");
      renderFixWorkspace("Applying patch...");
      screen.render();
      const applier = new PatchApplier(process.cwd());
      const result = await applier.applyChanges([patch]);
      if (result.success) {
        writeEvent(`Patch applied: ${result.modifiedFiles.join(", ")}`, "stdout");
        renderFixWorkspace(`Patch applied: ${result.modifiedFiles.join(", ")}`);
      } else {
        writeEvent(`Patch apply failed: ${result.error ?? "unknown error"}`, "stderr");
        renderFixWorkspace(`Patch failed: ${result.error ?? "unknown error"}`);
      }
      screen.render();
    });
  }

  function openSelectedTriageArtifact(): void {
    const idx = Math.max(0, Math.min(triageList.selected ?? 0, triageItems.length - 1));
    const item = triageItems[idx];
    if (!item?.artifactPath) {
      renderTriageFooter("Selected issue has no artifact path.");
      screen.render();
      return;
    }
    const path = resolveArtifactPath(item.artifactPath);
    if (!existsSync(path)) {
      renderTriageFooter(`Artifact not found: ${path}`);
      screen.render();
      return;
    }
    openPath(path);
    renderTriageFooter(`Opened artifact: ${path}`);
    screen.render();
  }

  async function openTriageOverlay(): Promise<void> {
    fixOverlay.hidden = true;
    triageOverlay.hidden = false;
    triageAllItems = await loadIssuesItems();
    triageItems = filterTriageItems(triageAllItems, triageQuery);
    triageList.setItems(triageItems.map((item) => triageItemLabel(item)));
    if (triageItems.length > 0) triageList.select(0);
    renderTriageDetailCurrent();
    renderTriageFooter(`Query: ${triageQuery || "(none)"} | ${triageItems.length}/${triageAllItems.length} issues`);
    triageList.focus();
    screen.render();
  }

  function openFixOverlayFromSelection(): void {
    const idx = Math.max(0, Math.min(triageList.selected ?? 0, triageItems.length - 1));
    const item = triageItems[idx];
    if (!item) {
      renderTriageFooter("No issue selected.");
      screen.render();
      return;
    }
    fixItem = item;
    fixItemIndex = idx;
    fixProposal = undefined;
    triageOverlay.hidden = true;
    fixOverlay.hidden = false;
    fixInfo.focus();
    renderFixWorkspace("Ready. Press p to generate proposal.");
    screen.render();
  }

  function closeFixOverlay(): void {
    fixOverlay.hidden = true;
    beginComposer("");
    screen.render();
  }

  function closeTriageOverlay(): void {
    triageOverlay.hidden = true;
    beginComposer("");
    screen.render();
  }

  function toggleHelp(): void {
    helpOverlay.hidden = !helpOverlay.hidden;
    if (!helpOverlay.hidden) helpOverlay.focus();
    else beginComposer("");
    screen.render();
  }

  function shutdownTui(): void {
    clearInterval(tick);
    if (runtimeBusy) {
      stopRequested = true;
      runtimeWorker?.postMessage({ type: "stop", runId: activeRunId } satisfies TuiRuntimeInputMessage);
    }
    runtimeWorker?.postMessage({ type: "shutdown" } satisfies TuiRuntimeInputMessage);
    void runtimeWorker?.terminate().catch(() => undefined);
    try {
      if (usingAlternateBuffer && typeof screen.program?.normalBuffer === "function") {
        screen.program.normalBuffer();
      }
      if (typeof screen.leave === "function") screen.leave();
      if (typeof screen.program?.disableMouse === "function") screen.program.disableMouse();
      if (typeof screen.program?.showCursor === "function") screen.program.showCursor();
      if (typeof screen.program?.clear === "function") screen.program.clear();
    } catch {
      // no-op best effort cleanup
    }
    screen.destroy();
  }

  renderHeader("idle");
  renderFooter("Ready.");
  renderMetrics();
  renderDetails();
  renderTriageFooter("Press i to open triage explorer.");
  appendFeed("system", "Interactive mode ready. Canonical flow: init -> run -> review. Use /help for commands.", "info");
  if (userConfig.startupMode === "workspace" && process.env.SIGNALER_TUI_START === "workspace") {
    setUiMode("workspace");
  } else {
    setUiMode("focus");
    focusCenterInput("");
  }

  const tick = setInterval(() => {
    if (runState?.status === "running") {
      renderMetrics();
      screen.render();
    }
  }, 1000);

  commandList.on("select", () => runSelectedPreset());
  commandList.on("keypress", (_char: string, key: { readonly name?: string }) => { if (key.name === "enter") runSelectedPreset(); });
  commandList.on("select item", () => { renderDetails(); screen.render(); });
  focusInput.on("submit", () => submitFocusInput());
  focusInput.key(["enter"], () => submitFocusInput());
  commandBar.on("submit", () => submitComposerInput());
  commandBar.key(["enter"], () => submitComposerInput());

  commandBar.key(["up"], () => {
    if (!composerActive || commandHistory.length === 0) return;
    commandHistoryIndex = Math.max(0, commandHistoryIndex - 1);
    commandBar.setValue(commandHistory[commandHistoryIndex] ?? "");
    screen.render();
  });
  commandBar.key(["down"], () => {
    if (!composerActive || commandHistory.length === 0) return;
    commandHistoryIndex = Math.min(commandHistory.length, commandHistoryIndex + 1);
    commandBar.setValue(commandHistory[commandHistoryIndex] ?? "");
    screen.render();
  });

  triageList.on("select item", () => { renderTriageDetailCurrent(); screen.render(); });
  triageList.key(["/"], () => openTriageSearchPrompt());
  triageList.key(["g"], () => { void openTriageOverlay(); });
  triageList.key(["o"], () => openSelectedTriageArtifact());
  triageList.key(["x"], () => openFixOverlayFromSelection());
  triageList.key(["escape"], () => closeTriageOverlay());

  screen.key(["p"], () => { if (!fixOverlay.hidden) void generateFixProposal(); });
  screen.key(["a"], () => { if (!fixOverlay.hidden) applyFixProposal(); });
  screen.key(["/"], () => { if (triageOverlay.hidden && fixOverlay.hidden) focusCommandBar("/"); });
  screen.key(["1"], () => { if (uiMode === "focus" && triageOverlay.hidden && fixOverlay.hidden && helpOverlay.hidden) runFocusShortcut(0); });
  screen.key(["2"], () => { if (uiMode === "focus" && triageOverlay.hidden && fixOverlay.hidden && helpOverlay.hidden) runFocusShortcut(1); });
  screen.key(["3"], () => { if (uiMode === "focus" && triageOverlay.hidden && fixOverlay.hidden && helpOverlay.hidden) runFocusShortcut(2); });
  screen.key(["4"], () => { if (uiMode === "focus" && triageOverlay.hidden && fixOverlay.hidden && helpOverlay.hidden) runFocusShortcut(3); });
  screen.key(["5"], () => { if (uiMode === "focus" && triageOverlay.hidden && fixOverlay.hidden && helpOverlay.hidden) runFocusShortcut(4); });

  screen.key(["enter"], () => { if (uiMode === "workspace" && triageOverlay.hidden && fixOverlay.hidden && screen.focused === commandList) runSelectedPreset(); });
  screen.key(["r"], () => { if (uiMode === "workspace" && triageOverlay.hidden && fixOverlay.hidden && lastCommand) startProcess(lastCommand); });
  screen.key(["f"], () => { if (uiMode === "workspace" && triageOverlay.hidden && fixOverlay.hidden) runFocusWorst(); });
  screen.key(["k"], () => { if (uiMode === "workspace" && triageOverlay.hidden && fixOverlay.hidden) stopActiveProcess(); });
  screen.key(["i"], () => { if (uiMode === "workspace" && triageOverlay.hidden && fixOverlay.hidden) void openTriageOverlay(); });
  screen.key(["x"], () => {
    if (!triageOverlay.hidden) {
      openFixOverlayFromSelection();
      return;
    }
    if (fixOverlay.hidden && fixItem) {
      fixOverlay.hidden = false;
      renderFixWorkspace("Ready. Press p to generate proposal.");
      fixInfo.focus();
      screen.render();
      return;
    }
    if (fixOverlay.hidden) {
      renderFooter("Open triage [i], select an issue, then press x.");
      screen.render();
    }
  });
  screen.key(["tab"], () => { if (uiMode === "workspace" && triageOverlay.hidden && fixOverlay.hidden) cycleFocus(); });
  screen.key(["C-l"], () => { if (uiMode === "workspace" && triageOverlay.hidden && fixOverlay.hidden) focusCommandBar("/"); });
  screen.key([":"], () => { if (uiMode === "workspace" && triageOverlay.hidden && fixOverlay.hidden) openCommandPrompt(); });
  screen.key(["?"], () => { if (uiMode === "workspace" && triageOverlay.hidden && fixOverlay.hidden) toggleHelp(); });
  screen.key(["C-g"], () => {
    if (runtimeBusy || uiMode === "focus") return;
    if (!triageOverlay.hidden || !fixOverlay.hidden || !helpOverlay.hidden) return;
    setUiMode("focus");
    focusCenterInput("");
  });
  screen.key(["escape"], () => { if (!fixOverlay.hidden) closeFixOverlay(); else if (!triageOverlay.hidden) closeTriageOverlay(); else if (!helpOverlay.hidden) toggleHelp(); });
  screen.key(["q", "C-c"], () => shutdownTui());

  screen.on("resize", () => {
    renderMetrics();
    renderDetails();
    if (!triageOverlay.hidden) renderTriageDetailCurrent();
    if (!fixOverlay.hidden) renderFixWorkspace("Ready.");
    screen.render();
  });
  screen.on("mouse", (data: { readonly action?: string }) => {
    if (data.action === "wheelup" || data.action === "wheeldown") {
      // Keep the TUI stable when terminal scroll events arrive.
      screen.render();
    }
  });

  screen.render();
}
