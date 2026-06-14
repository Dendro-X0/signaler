import type { PageDeviceSummary } from "./core/types.js";
import type { PerformanceTriageV3 } from "./engine-contracts/artifacts/v3/performance-triage-v3.js";
import type { RunSummary } from "./types.js";
import {
  buildHtmlPerformanceTrustBannerLines,
  performanceColumnLabel,
  type PerformanceScoreDisplayMode,
} from "./performance-score-labels.js";
import { buildPerformanceTriageV3 } from "./performance-triage.js";

export type ReportHtmlOptions = {
  readonly triage?: PerformanceTriageV3;
  readonly includeYellow?: boolean;
};

type ComboStatus = "scored" | "skipped" | "partial";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getMetricClass(value: number | undefined, good: number, warn: number): string {
  if (value === undefined) return "";
  if (value <= good) return "green";
  if (value <= warn) return "yellow";
  return "red";
}

function medianRounded(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
  }
  return Math.round(sorted[mid] ?? 0);
}

function comboStatus(result: PageDeviceSummary): ComboStatus {
  const msg = result.runtimeErrorMessage?.trim() ?? "";
  const hasPerf = typeof result.scores.performance === "number";
  if (msg.length > 0 && !hasPerf) return "skipped";
  if (msg.length > 0 && hasPerf) return "partial";
  return "scored";
}

function scoreSortKey(result: PageDeviceSummary): number {
  const status = comboStatus(result);
  if (status === "skipped") return 1000;
  if (status === "partial") return 900;
  return result.scores.performance ?? 101;
}

function countBelowTarget(results: readonly PageDeviceSummary[], pick: (r: PageDeviceSummary) => number | undefined): number {
  return results.filter((row) => {
    const status = comboStatus(row);
    if (status === "skipped") return false;
    const score = pick(row);
    return typeof score === "number" && score < 90;
  }).length;
}

function buildKpi(label: string, value: string, hint?: string, valueClass = ""): string {
  return `<div class="kpi">
    <div class="kpi-label">${escapeHtml(label)}</div>
    <div class="kpi-value${valueClass ? ` ${valueClass}` : ""}">${escapeHtml(value)}</div>
    ${hint ? `<div class="kpi-hint">${escapeHtml(hint)}</div>` : ""}
  </div>`;
}

function scoreValueClass(score: number | undefined): string {
  if (score === undefined) return "";
  if (score >= 90) return "green";
  if (score >= 50) return "yellow";
  return "red";
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

function medianMs(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid];
}

function formatLcp(ms: number | undefined): string {
  if (ms === undefined) return "-";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function lcpValueClass(ms: number | undefined): string {
  if (ms === undefined) return "";
  if (ms <= 2500) return "green";
  if (ms <= 4000) return "yellow";
  return "red";
}

function buildHtmlTrustBanner(params: {
  readonly scoreDisplayMode: PerformanceScoreDisplayMode;
  readonly medianLcpMs?: number;
  readonly triage: PerformanceTriageV3;
}): string {
  const perfLabel = performanceColumnLabel(params.scoreDisplayMode);
  const lines: readonly string[] = buildHtmlPerformanceTrustBannerLines(params.scoreDisplayMode);
  const title: string = params.scoreDisplayMode === "throughput"
    ? "Lab performance context (P(ref))"
    : "Performance score (DevTools parity mode)";
  const body: string = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n    ");
  const lcpLine =
    params.medianLcpMs !== undefined
      ? `<p>Median LCP across scored routes: <strong class="lcp-inline ${lcpValueClass(params.medianLcpMs)}">${escapeHtml(formatLcp(params.medianLcpMs))}</strong> under simulated throttling — DevTools on localhost often reports &lt;1s for the same app.</p>`
      : "";
  const triageLine = `<p>Actionable triage: <strong class="issue-red">${params.triage.totals.red} red</strong> / <strong class="issue-yellow">${params.triage.totals.yellow} yellow</strong> performance issues (${params.triage.uniqueIssues.length} unique). Prioritize issue-count fixes over chasing ${escapeHtml(perfLabel)} 90+.</p>`;
  const fidelityCommand =
    params.scoreDisplayMode === "throughput"
      ? "signaler run --contract v3 --mode fidelity --parallel 1 --focus-worst 5"
      : "signaler verify --contract v6 --dir .signaler";
  const fidelityBlock =
    params.scoreDisplayMode === "throughput"
      ? `<div class="fidelity-hint">
    <div class="fidelity-label">DevTools-like validation (worst 5 routes)</div>
    <code class="fidelity-command" id="fidelity-command">${escapeHtml(fidelityCommand)}</code>
    <button type="button" class="copy-btn" data-copy-target="fidelity-command">Copy</button>
  </div>`
      : "";
  return `<div class="trust-banner"><strong>${escapeHtml(title)}</strong>
    ${body}
    ${lcpLine}
    ${triageLine}
    ${fidelityBlock}
  </div>`;
}

function buildHtmlRow(result: PageDeviceSummary, scoreDisplayMode: PerformanceScoreDisplayMode): string {
  const scores = result.scores;
  const perfLabel: string = performanceColumnLabel(scoreDisplayMode);
  const metrics = result.metrics;
  const status = comboStatus(result);
  const lcpSeconds: string = metrics.lcpMs !== undefined ? (metrics.lcpMs / 1000).toFixed(1) + "s" : "-";
  const fcpSeconds: string = metrics.fcpMs !== undefined ? (metrics.fcpMs / 1000).toFixed(1) + "s" : "-";
  const tbtMs: string = metrics.tbtMs !== undefined ? Math.round(metrics.tbtMs) + "ms" : "-";
  const clsVal: string = metrics.cls !== undefined ? metrics.cls.toFixed(3) : "-";
  const inpMs: string = metrics.inpMs !== undefined ? Math.round(metrics.inpMs) + "ms" : "-";
  const issues: string = result.opportunities.slice(0, 3).map((o) =>
    `<div class="issue">${escapeHtml(o.title)}${o.estimatedSavingsMs ? ` (${Math.round(o.estimatedSavingsMs)}ms)` : ""}</div>`,
  ).join("");
  const statusBadge =
    status === "skipped"
      ? `<span class="status-badge status-skipped" title="${escapeHtml(result.runtimeErrorMessage ?? "")}">Skipped</span>`
      : status === "partial"
        ? `<span class="status-badge status-partial" title="${escapeHtml(result.runtimeErrorMessage ?? "")}">Partial</span>`
        : `<span class="status-badge status-scored">Scored</span>`;
  const skipNote =
    status !== "scored" && result.runtimeErrorMessage
      ? `<div class="skip-note">${escapeHtml(result.runtimeErrorMessage)}</div>`
      : "";
  return `<article class="card card--${status}" data-device="${result.device}" data-status="${status}" data-label="${escapeHtml(result.label)}" data-path="${escapeHtml(result.path)}" data-p="${scores.performance ?? ""}" data-a="${scores.accessibility ?? ""}" data-bp="${scores.bestPractices ?? ""}" data-seo="${scores.seo ?? ""}">
      <div class="card-header">
        <div class="card-title">${escapeHtml(result.label)} <span>${escapeHtml(result.path)}</span></div>
        <div class="card-badges">${statusBadge}<span class="device-badge ${result.device}">${result.device}</span></div>
      </div>
      <div class="scores">
        ${buildScoreCircle(perfLabel, scores.performance)}
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
      ${skipNote}
      ${issues ? `<div class="issues"><div class="issues-title">Top opportunities</div>${issues}</div>` : ""}
    </article>`;
}

function buildOverviewRow(result: PageDeviceSummary, scoreDisplayMode: PerformanceScoreDisplayMode): string {
  const perfLabel = performanceColumnLabel(scoreDisplayMode);
  const status = comboStatus(result);
  const fmt = (value: number | undefined): string => (value !== undefined ? String(value) : "-");
  const statusLabel = status === "skipped" ? "Skipped" : status === "partial" ? "Partial" : "Scored";
  const note = result.runtimeErrorMessage ? escapeHtml(result.runtimeErrorMessage.slice(0, 72)) : "-";
  return `<tr class="overview-row row--${status}" data-device="${result.device}" data-status="${status}" data-label="${escapeHtml(result.label)}" data-path="${escapeHtml(result.path)}" data-p="${result.scores.performance ?? ""}">
    <td><strong>${escapeHtml(result.label)}</strong><div class="row-sub">${escapeHtml(result.path)}</div></td>
    <td><span class="device-badge ${result.device}">${result.device}</span></td>
    <td><span class="status-badge status-${status}">${statusLabel}</span></td>
    <td class="num">${fmt(result.scores.performance)}</td>
    <td class="num">${fmt(result.scores.accessibility)}</td>
    <td class="num">${fmt(result.scores.bestPractices)}</td>
    <td class="num">${fmt(result.scores.seo)}</td>
    <td class="num">${result.metrics.lcpMs !== undefined ? (result.metrics.lcpMs / 1000).toFixed(1) + "s" : "-"}</td>
    <td class="muted" title="${note !== "-" ? note : perfLabel}">${note !== "-" ? note : perfLabel}</td>
  </tr>`;
}

export function buildHtmlReport(
  summary: RunSummary,
  scoreDisplayMode: PerformanceScoreDisplayMode = "throughput",
  options?: ReportHtmlOptions,
): string {
  const meta = summary.meta;
  const perfLabel = performanceColumnLabel(scoreDisplayMode);
  const includeYellow = options?.includeYellow ?? true;
  const triage =
    options?.triage
    ?? buildPerformanceTriageV3({
      results: summary.results,
      protocol: {
        contractVersion: "v3",
        workflow: "init-run-review",
        mode: scoreDisplayMode,
        profile: scoreDisplayMode === "throughput" ? "throughput-balanced" : "fidelity-devtools-stable",
        throttlingMethod: meta.throttlingMethod,
        parallel: meta.resolvedParallel,
        sessionIsolation: "shared",
        throughputBackoff: "auto",
        warmUp: meta.warmUp,
        headless: true,
        runsPerCombo: meta.runsPerCombo,
        captureLevel: "diagnostics",
        comparabilityHash: "report-html",
        disclaimer: "",
      },
      includeYellow,
    });
  const sortedResults = [...summary.results].sort((a, b) => scoreSortKey(a) - scoreSortKey(b));
  const scored = sortedResults.filter((row) => comboStatus(row) === "scored" || comboStatus(row) === "partial");
  const skipped = sortedResults.filter((row) => comboStatus(row) === "skipped");
  const avgPerf = medianRounded(scored.map((r) => r.scores.performance).filter((v): v is number => typeof v === "number"));
  const avgA11y = medianRounded(scored.map((r) => r.scores.accessibility).filter((v): v is number => typeof v === "number"));
  const avgBp = medianRounded(scored.map((r) => r.scores.bestPractices).filter((v): v is number => typeof v === "number"));
  const avgSeo = medianRounded(scored.map((r) => r.scores.seo).filter((v): v is number => typeof v === "number"));
  const medianLcpMs = medianMs(scored.map((r) => r.metrics.lcpMs).filter((v): v is number => typeof v === "number"));
  const belowP = countBelowTarget(scored, (r) => r.scores.performance);
  const belowA = countBelowTarget(scored, (r) => r.scores.accessibility);
  const belowBp = countBelowTarget(scored, (r) => r.scores.bestPractices);
  const belowSeo = countBelowTarget(scored, (r) => r.scores.seo);
  const lcpBelow25 = scored.filter((r) => typeof r.metrics.lcpMs === "number" && r.metrics.lcpMs > 2500).length;
  const timestamp = new Date().toISOString();
  const cacheSummary = meta.incremental
    ? `${meta.executedCombos} executed / ${meta.cachedCombos} cached`
    : "disabled";
  const rows = sortedResults.map((result) => buildHtmlRow(result, scoreDisplayMode)).join("\n");
  const tableRows = sortedResults.map((result) => buildOverviewRow(result, scoreDisplayMode)).join("\n");
  const trustBanner = buildHtmlTrustBanner({ scoreDisplayMode, medianLcpMs, triage });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signaler Dashboard</title>
  <style>
    :root {
      --green: #0cce6b;
      --yellow: #ffa400;
      --red: #ff4e42;
      --bg: #070b14;
      --panel: #0b1224;
      --card: #111a33;
      --border: #27324d;
      --text: #e8edf7;
      --muted: #93a4c3;
      --accent: #7c3aed;
      --accent-2: #0ea5e9;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Inter", "IBM Plex Sans", "Segoe UI", system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at 15% 0%, rgba(124, 58, 237, 0.18), transparent 35%),
        radial-gradient(circle at 85% 10%, rgba(14, 165, 233, 0.12), transparent 30%),
        var(--bg);
      color: var(--text);
      line-height: 1.5;
      min-height: 100vh;
    }
    .dash-shell { max-width: 1440px; margin: 0 auto; padding: 1.25rem 1.5rem 3rem; }
    .dash-header {
      display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between;
      gap: 1rem; margin-bottom: 1.25rem;
    }
    .dash-brand h1 { font-size: 1.65rem; letter-spacing: -0.02em; margin-bottom: 0.35rem; }
    .dash-brand p { color: var(--muted); font-size: 0.92rem; }
    .dash-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .chip {
      font-size: 0.78rem; padding: 0.35rem 0.7rem; border-radius: 999px;
      border: 1px solid var(--border); background: rgba(17, 26, 51, 0.8); color: var(--muted);
    }
    .chip strong { color: var(--text); }
    .dash-nav {
      display: flex; flex-wrap: wrap; gap: 0.65rem; margin-bottom: 1.25rem;
    }
    .dash-nav a {
      color: var(--text); text-decoration: none; font-size: 0.86rem;
      padding: 0.45rem 0.85rem; border-radius: 8px; border: 1px solid var(--border);
      background: rgba(12, 21, 42, 0.7);
    }
    .dash-nav a:hover { border-color: var(--accent-2); color: #fff; }
    .kpi-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.85rem; margin-bottom: 1.25rem;
    }
    .kpi {
      background: linear-gradient(160deg, var(--panel), #0e1830);
      border: 1px solid var(--border); border-radius: 12px; padding: 0.95rem 1rem;
      box-shadow: 0 8px 28px rgba(0,0,0,0.25);
    }
    .kpi-label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
    .kpi-value { font-size: 1.45rem; font-weight: 700; margin-top: 0.2rem; }
    .kpi-hint { font-size: 0.75rem; color: var(--muted); margin-top: 0.15rem; }
    .kpi-value.green { color: var(--green); }
    .kpi-value.yellow { color: var(--yellow); }
    .kpi-value.red { color: var(--red); }
    .meta-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.75rem; margin-bottom: 1.25rem;
    }
    .meta-card {
      background: rgba(11, 18, 36, 0.85); border-radius: 10px; padding: 0.75rem 0.9rem;
      border: 1px solid var(--border);
    }
    .meta-label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; }
    .meta-value { font-size: 0.98rem; font-weight: 650; margin-top: 0.15rem; }
    .meta-hint { font-size: 0.72rem; color: var(--muted); margin-top: 0.1rem; }
    .trust-banner {
      margin-bottom: 1.25rem; padding: 0.95rem 1.05rem; border-radius: 12px;
      border: 1px solid #334155;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(14, 165, 233, 0.08));
      color: var(--muted); font-size: 0.88rem;
    }
    .trust-banner strong { color: var(--text); display: block; margin-bottom: 0.35rem; }
    .trust-banner p { margin: 0.2rem 0; }
    .lcp-inline.green { color: var(--green); }
    .lcp-inline.yellow { color: var(--yellow); }
    .lcp-inline.red { color: var(--red); }
    .issue-red { color: var(--red); }
    .issue-yellow { color: var(--yellow); }
    .fidelity-hint {
      margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px dashed var(--border);
      display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;
    }
    .fidelity-label { font-size: 0.78rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; width: 100%; }
    .fidelity-command {
      flex: 1 1 280px; font-family: ui-monospace, "Cascadia Code", monospace;
      font-size: 0.82rem; background: #0c152a; border: 1px solid var(--border);
      border-radius: 8px; padding: 0.5rem 0.65rem; color: #c4d4ff;
    }
    .copy-btn {
      border: 1px solid var(--border); background: rgba(124, 58, 237, 0.2);
      color: var(--text); border-radius: 8px; padding: 0.45rem 0.75rem;
      font-size: 0.8rem; cursor: pointer;
    }
    .copy-btn:hover { border-color: var(--accent-2); }
    .toolbar {
      position: sticky; top: 0; z-index: 20;
      display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: center;
      padding: 0.75rem; margin-bottom: 1rem;
      border: 1px solid var(--border); border-radius: 12px;
      background: rgba(7, 11, 20, 0.92); backdrop-filter: blur(10px);
    }
    .toolbar input[type="search"] {
      flex: 1 1 220px; min-width: 180px;
      background: #0c152a; border: 1px solid var(--border); color: var(--text);
      border-radius: 8px; padding: 0.55rem 0.75rem; font-size: 0.9rem;
    }
    .toolbar label { font-size: 0.82rem; color: var(--muted); display: flex; align-items: center; gap: 0.35rem; }
    .toolbar select {
      background: #0c152a; border: 1px solid var(--border); color: var(--text);
      border-radius: 8px; padding: 0.45rem 0.6rem; font-size: 0.85rem;
    }
    .filter-pills { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .filter-pill {
      border: 1px solid var(--border); background: #0c152a; color: var(--muted);
      border-radius: 999px; padding: 0.35rem 0.7rem; font-size: 0.78rem; cursor: pointer;
    }
    .filter-pill.active { border-color: var(--accent-2); color: #fff; background: rgba(14,165,233,0.15); }
    .section-title {
      font-size: 0.95rem; font-weight: 650; margin: 1.5rem 0 0.75rem;
      letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted);
    }
    .table-wrap {
      overflow: auto; border: 1px solid var(--border); border-radius: 12px;
      background: rgba(11, 18, 36, 0.75); margin-bottom: 1.5rem;
    }
    table.overview { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
    table.overview th, table.overview td { padding: 0.65rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
    table.overview th { color: var(--muted); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; background: rgba(12,21,42,0.9); position: sticky; top: 0; }
    table.overview tr:hover { background: rgba(124, 58, 237, 0.06); }
    table.overview td.num { font-variant-numeric: tabular-nums; }
    .row-sub { font-size: 0.75rem; color: var(--muted); margin-top: 0.1rem; }
    .cards-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1rem;
    }
    .card {
      background: linear-gradient(180deg, var(--card), #0e1a31);
      border-radius: 14px; padding: 1.15rem; border: 1px solid var(--border);
      box-shadow: 0 10px 30px rgba(0,0,0,0.28);
    }
    .card--skipped { opacity: 0.72; border-style: dashed; }
    .card--partial { border-color: rgba(255, 164, 0, 0.45); }
    .card-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 0.75rem; margin-bottom: 0.85rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border);
    }
    .card-title { font-size: 1.02rem; font-weight: 650; }
    .card-title span { color: var(--muted); font-weight: 500; font-size: 0.92rem; }
    .card-badges { display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: flex-end; }
    .device-badge {
      font-size: 0.72rem; padding: 0.28rem 0.55rem; border-radius: 999px;
      border: 1px solid var(--border); text-transform: uppercase; letter-spacing: 0.07em;
    }
    .device-badge.mobile { background: linear-gradient(135deg, #0ea5e9, #0891b2); color: #e6f6ff; border-color: #0ea5e9; }
    .device-badge.desktop { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #f5efff; border-color: #8b5cf6; }
    .status-badge {
      font-size: 0.7rem; padding: 0.25rem 0.5rem; border-radius: 999px; border: 1px solid var(--border);
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .status-scored { color: var(--green); border-color: rgba(12,206,107,0.35); }
    .status-partial { color: var(--yellow); border-color: rgba(255,164,0,0.35); }
    .status-skipped { color: var(--red); border-color: rgba(255,78,66,0.35); }
    .scores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 0.85rem; }
    .score-item { text-align: center; }
    .score-circle {
      width: 56px; height: 56px; border-radius: 10px; margin: 0 auto 0.25rem;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.05rem; font-weight: 700; border: 2px solid var(--border); background: #0c152a;
    }
    .score-circle.green { border-color: var(--green); color: var(--green); }
    .score-circle.yellow { border-color: var(--yellow); color: var(--yellow); }
    .score-circle.red { border-color: var(--red); color: var(--red); }
    .score-label { font-size: 0.72rem; color: var(--muted); }
    .metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.45rem; }
    .metric {
      background: #0c152a; padding: 0.55rem 0.35rem; border-radius: 8px; text-align: center;
      border: 1px solid var(--border);
    }
    .metric-value { font-size: 0.88rem; font-weight: 650; }
    .metric-value.green { color: var(--green); }
    .metric-value.yellow { color: var(--yellow); }
    .metric-value.red { color: var(--red); }
    .metric-label { font-size: 0.68rem; color: var(--muted); margin-top: 0.15rem; }
    .issues {
      margin-top: 0.85rem; padding: 0.75rem; border-radius: 8px;
      border: 1px solid var(--border); background: #0c152a;
    }
    .issues-title { font-size: 0.72rem; color: var(--muted); margin-bottom: 0.35rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .issue { font-size: 0.82rem; padding: 0.25rem 0; border-bottom: 1px dashed var(--border); }
    .issue:last-child { border-bottom: none; }
    .skip-note {
      margin-top: 0.65rem; font-size: 0.78rem; color: var(--yellow);
      padding: 0.55rem 0.65rem; border-radius: 8px; background: rgba(255,164,0,0.08); border: 1px solid rgba(255,164,0,0.25);
    }
    .hidden { display: none !important; }
    @media (max-width: 900px) {
      .metrics { grid-template-columns: repeat(3, 1fr); }
      .scores { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="dash-shell">
    <header class="dash-header">
      <div class="dash-brand">
        <h1>Signaler Dashboard</h1>
        <p>Web quality audit · ${escapeHtml(timestamp)} · mode <strong>${escapeHtml(scoreDisplayMode)}</strong></p>
      </div>
      <div class="dash-chips">
        <span class="chip"><strong>${meta.comboCount}</strong> combos</span>
        <span class="chip"><strong>${scored.length}</strong> scored</span>
        <span class="chip"><strong>${skipped.length}</strong> skipped</span>
        <span class="chip">parallel <strong>${meta.resolvedParallel}</strong></span>
      </div>
    </header>
    <nav class="dash-nav" aria-label="Related artifacts">
      <a href="overview.md">Overview (markdown)</a>
      <a href="triage.md">Triage report</a>
      <a href="../INDEX.md">Artifact index</a>
      <a href="../agent/fix-queue.json">Fix queue (JSON)</a>
      <a href="../agent/coverage.json">Coverage (JSON)</a>
    </nav>
    ${trustBanner}
    <section class="kpi-grid" aria-label="Suite KPIs">
      ${buildKpi(`Median ${perfLabel}`, avgPerf !== undefined ? String(avgPerf) : "-", belowP > 0 ? `${belowP} below 90` : "all ≥ 90", scoreValueClass(avgPerf))}
      ${buildKpi("Median LCP", formatLcp(medianLcpMs), lcpBelow25 > 0 ? `${lcpBelow25} routes >2.5s` : "lab metric", lcpValueClass(medianLcpMs))}
      ${buildKpi("Red issues", String(triage.totals.red), `${triage.uniqueIssues.length} unique`, "red")}
      ${buildKpi("Yellow issues", String(triage.totals.yellow), includeYellow ? "issue-count triage" : "hidden in lean", "yellow")}
      ${buildKpi("Median A11y", avgA11y !== undefined ? String(avgA11y) : "-", belowA > 0 ? `${belowA} below 90` : "all ≥ 90", scoreValueClass(avgA11y))}
      ${buildKpi("Median BP", avgBp !== undefined ? String(avgBp) : "-", belowBp > 0 ? `${belowBp} below 90` : "all ≥ 90", scoreValueClass(avgBp))}
      ${buildKpi("Median SEO", avgSeo !== undefined ? String(avgSeo) : "-", belowSeo > 0 ? `${belowSeo} below 90` : "all ≥ 90", scoreValueClass(avgSeo))}
      ${buildKpi("Below target", `P ${belowP} · A ${belowA} · BP ${belowBp} · SEO ${belowSeo}`, "score < 90")}
    </section>
    <section class="meta-grid" aria-label="Run settings">
      ${buildMetaCard("Elapsed", formatElapsedTime(meta.elapsedMs))}
      ${buildMetaCard("Build ID", meta.buildId ?? "-")}
      ${buildMetaCard("Incremental", meta.incremental ? "Yes" : "No")}
      ${buildMetaCard("Cache", cacheSummary)}
      ${buildMetaCard("Throttling", meta.throttlingMethod)}
      ${buildMetaCard("CPU slowdown", meta.cpuSlowdownMultiplier.toString())}
      ${buildMetaCard("Warm-up", meta.warmUp ? "Yes" : "No")}
    </section>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Filter routes (label or path)…" aria-label="Filter routes">
      <div class="filter-pills" role="group" aria-label="Device filter">
        <button type="button" class="filter-pill active" data-device="all">All devices</button>
        <button type="button" class="filter-pill" data-device="mobile">Mobile</button>
        <button type="button" class="filter-pill" data-device="desktop">Desktop</button>
      </div>
      <label><input id="show-skipped" type="checkbox"> Show skipped</label>
      <select id="sort-by" aria-label="Sort cards">
        <option value="worst-p">Sort: worst ${escapeHtml(perfLabel)} first</option>
        <option value="path">Sort: path A→Z</option>
        <option value="a11y">Sort: worst A11y first</option>
      </select>
    </div>
    <h2 class="section-title">Route overview</h2>
    <div class="table-wrap">
      <table class="overview">
        <thead>
          <tr>
            <th>Route</th><th>Device</th><th>Status</th>
            <th>${escapeHtml(perfLabel)}</th><th>A</th><th>BP</th><th>SEO</th><th>LCP</th><th>Notes</th>
          </tr>
        </thead>
        <tbody id="overview-body">${tableRows}</tbody>
      </table>
    </div>
    <h2 class="section-title">Route detail cards</h2>
    <div class="cards-grid" id="cards">${rows}</div>
  </div>
  <script>
    (function () {
      var search = document.getElementById("search");
      var showSkipped = document.getElementById("show-skipped");
      var sortBy = document.getElementById("sort-by");
      var cards = document.getElementById("cards");
      var overviewBody = document.getElementById("overview-body");
      var deviceFilter = "all";
      document.querySelectorAll(".filter-pill").forEach(function (btn) {
        btn.addEventListener("click", function () {
          document.querySelectorAll(".filter-pill").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          deviceFilter = btn.getAttribute("data-device") || "all";
          applyFilters();
        });
      });
      function matches(el) {
        var q = (search && search.value || "").trim().toLowerCase();
        var label = (el.getAttribute("data-label") || "").toLowerCase();
        var path = (el.getAttribute("data-path") || "").toLowerCase();
        var device = el.getAttribute("data-device") || "";
        var status = el.getAttribute("data-status") || "scored";
        if (deviceFilter !== "all" && device !== deviceFilter) return false;
        if (status === "skipped" && showSkipped && !showSkipped.checked) return false;
        if (q && label.indexOf(q) === -1 && path.indexOf(q) === -1) return false;
        return true;
      }
      function applyFilters() {
        document.querySelectorAll(".card, .overview-row").forEach(function (el) {
          el.classList.toggle("hidden", !matches(el));
        });
      }
      function sortCards() {
        if (!cards || !sortBy) return;
        var items = Array.prototype.slice.call(cards.querySelectorAll(".card"));
        var mode = sortBy.value;
        items.sort(function (a, b) {
          if (mode === "path") return (a.getAttribute("data-path") || "").localeCompare(b.getAttribute("data-path") || "");
          if (mode === "a11y") return (parseFloat(a.getAttribute("data-a") || "999") - parseFloat(b.getAttribute("data-a") || "999"));
          return (parseFloat(a.getAttribute("data-p") || "999") - parseFloat(b.getAttribute("data-p") || "999"));
        });
        items.forEach(function (el) { cards.appendChild(el); });
      }
      if (search) search.addEventListener("input", applyFilters);
      if (showSkipped) showSkipped.addEventListener("change", applyFilters);
      if (sortBy) sortBy.addEventListener("change", sortCards);
      document.querySelectorAll(".copy-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var targetId = btn.getAttribute("data-copy-target");
          var el = targetId ? document.getElementById(targetId) : null;
          if (!el) return;
          var text = el.textContent || "";
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
              btn.textContent = "Copied";
              setTimeout(function () { btn.textContent = "Copy"; }, 1500);
            });
          }
        });
      });
      applyFilters();
    })();
  </script>
</body>
</html>`;
}

function formatElapsedTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem > 0 ? `${minutes}m ${rem}s` : `${minutes}m`;
}
