import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { runAuditsForConfig } from "./lighthouse-runner.js";
import type { RunSummary, PageDeviceSummary, OpportunitySummary } from "./types.js";

interface CliArgs {
  readonly configPath: string;
}

const ANSI_RESET = "\u001B[0m" as const;
const ANSI_RED = "\u001B[31m" as const;
const ANSI_YELLOW = "\u001B[33m" as const;
const ANSI_GREEN = "\u001B[32m" as const;

function parseArgs(argv: readonly string[]): CliArgs {
  let configPath: string | undefined;
  for (let i = 2; i < argv.length; i += 1) {
    const arg: string = argv[i];
    if ((arg === "--config" || arg === "-c") && i + 1 < argv.length) {
      configPath = argv[i + 1];
      i += 1;
    }
  }
  const finalConfigPath: string = configPath ?? "apex.config.json";
  return { configPath: finalConfigPath };
}

/**
 * Runs the ApexAuditor audit CLI.
 *
 * @param argv - The process arguments array.
 */
export async function runAuditCli(argv: readonly string[]): Promise<void> {
  const args: CliArgs = parseArgs(argv);
  const { configPath, config } = await loadConfig({ configPath: args.configPath });
  const summary: RunSummary = await runAuditsForConfig({ config, configPath });
  const outputDir: string = resolve(".apex-auditor");
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  const markdown: string = buildMarkdown(summary.results);
  await writeFile(resolve(outputDir, "summary.md"), markdown, "utf8");
  // Also echo a compact, colourised table to stdout for quick viewing.
  const consoleTable: string = buildConsoleTable(summary.results);
  // eslint-disable-next-line no-console
  console.log(consoleTable);
  printRedIssues(summary.results);
}

function buildMarkdown(results: readonly PageDeviceSummary[]): string {
  const header: string = [
    "| Label | Path | Device | P | A | BP | SEO | LCP (s) | FCP (s) | TBT (ms) | CLS | Error | Top issues |",
    "|-------|------|--------|---|---|----|-----|---------|---------|----------|-----|-------|-----------|",
  ].join("\n");
  const lines: string[] = results.map((result) => buildRow(result));
  return `${header}\n${lines.join("\n")}`;
}

function buildConsoleTable(results: readonly PageDeviceSummary[]): string {
  const header: string = [
    "| Label | Path | Device | P | A | BP | SEO | LCP (s) | FCP (s) | TBT (ms) | CLS | Error | Top issues |",
    "|-------|------|--------|---|---|----|-----|---------|---------|----------|-----|-------|-----------|",
  ].join("\n");
  const lines: string[] = results.map((result) => buildConsoleRow(result));
  return `${header}\n${lines.join("\n")}`;
}

function buildRow(result: PageDeviceSummary): string {
  const scores = result.scores;
  const metrics = result.metrics;
  const lcpSeconds: string = metrics.lcpMs !== undefined ? (metrics.lcpMs / 1000).toFixed(1) : "-";
  const fcpSeconds: string = metrics.fcpMs !== undefined ? (metrics.fcpMs / 1000).toFixed(1) : "-";
  const tbtMs: string = metrics.tbtMs !== undefined ? Math.round(metrics.tbtMs).toString() : "-";
  const cls: string = metrics.cls !== undefined ? metrics.cls.toFixed(3) : "-";
  const issues: string = formatTopIssues(result.opportunities);
  const error: string =
    result.runtimeErrorCode ?? (result.runtimeErrorMessage !== undefined ? result.runtimeErrorMessage : "");
  return `| ${result.label} | ${result.path} | ${result.device} | ${scores.performance ?? "-"} | ${scores.accessibility ?? "-"} | ${scores.bestPractices ?? "-"} | ${scores.seo ?? "-"} | ${lcpSeconds} | ${fcpSeconds} | ${tbtMs} | ${cls} | ${error} | ${issues} |`;
}

function buildConsoleRow(result: PageDeviceSummary): string {
  const scores = result.scores;
  const metrics = result.metrics;
  const lcpSeconds: string = metrics.lcpMs !== undefined ? (metrics.lcpMs / 1000).toFixed(1) : "-";
  const fcpSeconds: string = metrics.fcpMs !== undefined ? (metrics.fcpMs / 1000).toFixed(1) : "-";
  const tbtMs: string = metrics.tbtMs !== undefined ? Math.round(metrics.tbtMs).toString() : "-";
  const cls: string = metrics.cls !== undefined ? metrics.cls.toFixed(3) : "-";
  const issues: string = formatTopIssues(result.opportunities);
  const error: string =
    result.runtimeErrorCode ?? (result.runtimeErrorMessage !== undefined ? result.runtimeErrorMessage : "");
  const performanceText: string = colourScore(scores.performance);
  const accessibilityText: string = colourScore(scores.accessibility);
  const bestPracticesText: string = colourScore(scores.bestPractices);
  const seoText: string = colourScore(scores.seo);
  return `| ${result.label} | ${result.path} | ${result.device} | ${performanceText} | ${accessibilityText} | ${bestPracticesText} | ${seoText} | ${lcpSeconds} | ${fcpSeconds} | ${tbtMs} | ${cls} | ${error} | ${issues} |`;
}

function formatTopIssues(opportunities: readonly OpportunitySummary[]): string {
  if (opportunities.length === 0) {
    return "";
  }
  const items: string[] = opportunities.map((opp) => {
    const savingsMs: string = opp.estimatedSavingsMs !== undefined ? `${Math.round(opp.estimatedSavingsMs)}ms` : "";
    const savingsBytes: string = opp.estimatedSavingsBytes !== undefined ? `${Math.round(opp.estimatedSavingsBytes / 1024)}KB` : "";
    const parts: string[] = [savingsMs, savingsBytes].filter((p) => p.length > 0);
    const suffix: string = parts.length > 0 ? ` (${parts.join(", ")})` : "";
    return `${opp.id}${suffix}`;
  });
  return items.join("; ");
}

function colourScore(score: number | undefined): string {
  if (score === undefined) {
    return "-";
  }
  const value: number = score;
  const text: string = value.toString();
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
    return;
  }
  // eslint-disable-next-line no-console
  console.log("\nRed issues (scores below 50):");
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
    // eslint-disable-next-line no-console
    console.log(`- ${result.label} ${result.path} [${result.device}] – ${badParts.join(", ")} – ${issues}`);
  }
}
