import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runAccessibilityAudit, summarizeAxeSummary } from "./accessibility.js";
import type { AxeResult, AxeSummary, AxeViolation } from "./accessibility-types.js";
import { writeArtifactsNavigation } from "./artifacts-navigation.js";
import type { ApexConfig, ApexDevice } from "./core/types.js";
import { loadConfig } from "./core/config.js";
import { writeRunnerReports } from "./runner-reporting.js";
import { renderPanel } from "./ui/components/panel.js";
import { UiTheme } from "./ui/themes/theme.js";

type DeviceFilterFlag = "mobile" | "desktop";

type AccessibilityArgs = {
  readonly configPath: string;
  readonly deviceFilter?: DeviceFilterFlag;
  readonly parallelOverride?: number;
  readonly timeoutMs?: number;
  readonly jsonOutput: boolean;
};

type RunnerFinding = {
  readonly title: string;
  readonly severity: "info" | "warn" | "error";
  readonly details: readonly string[];
  readonly evidence: readonly { readonly kind: "file"; readonly path: string }[];
};

const NO_COLOR: boolean = Boolean(process.env.NO_COLOR) || process.env.CI === "true";
const theme: UiTheme = new UiTheme({ noColor: NO_COLOR });

function parseArgs(argv: readonly string[]): AccessibilityArgs {
  let configPath: string | undefined;
  let deviceFilter: DeviceFilterFlag | undefined;
  let parallelOverride: number | undefined;
  let timeoutMs: number | undefined;
  let jsonOutput = false;
  for (let i = 2; i < argv.length; i += 1) {
    const arg: string = argv[i] ?? "";
    if ((arg === "--config" || arg === "-c") && i + 1 < argv.length) {
      configPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--mobile-only") {
      deviceFilter = "mobile";
      continue;
    }
    if (arg === "--desktop-only") {
      deviceFilter = "desktop";
      continue;
    }
    if (arg === "--parallel" && i + 1 < argv.length) {
      const value = Number.parseInt(argv[i + 1] ?? "", 10);
      if (!Number.isFinite(value) || value < 1 || value > 10) {
        throw new Error(`Invalid --parallel value: ${argv[i + 1]}. Expected integer between 1 and 10.`);
      }
      parallelOverride = value;
      i += 1;
      continue;
    }
    if (arg === "--timeout-ms" && i + 1 < argv.length) {
      const value = Number.parseInt(argv[i + 1] ?? "", 10);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid --timeout-ms value: ${argv[i + 1]}. Expected a positive integer.`);
      }
      timeoutMs = value;
      i += 1;
      continue;
    }
    if (arg === "--json") {
      jsonOutput = true;
    }
  }
  return {
    configPath: configPath ?? "signaler.config.json",
    deviceFilter,
    parallelOverride,
    timeoutMs,
    jsonOutput,
  };
}

function filterConfigDevices(config: ApexConfig, deviceFilter: ApexDevice | undefined): ApexConfig {
  if (!deviceFilter) {
    return config;
  }
  return {
    ...config,
    pages: config.pages.map((page) => ({
      ...page,
      devices: page.devices.filter((device) => device === deviceFilter),
    })).filter((page) => page.devices.length > 0),
  };
}

function selectTopViolations(result: AxeResult, limit: number): readonly AxeViolation[] {
  const impactRank: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  return [...result.violations]
    .sort((a, b) => {
      const rankA = impactRank[a.impact ?? ""] ?? 5;
      const rankB = impactRank[b.impact ?? ""] ?? 5;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return b.nodes.length - a.nodes.length;
    })
    .slice(0, limit);
}

function buildAccessibilityFindings(summary: AxeSummary): readonly RunnerFinding[] {
  const aggregated = summarizeAxeSummary(summary);
  const evidence: readonly { readonly kind: "file"; readonly path: string }[] = [
    { kind: "file", path: ".signaler/accessibility-summary.json" },
  ];
  const findings: RunnerFinding[] = [];
  findings.push({
    title: "Impact counts",
    severity:
      aggregated.impactCounts.critical > 0 || aggregated.impactCounts.serious > 0 ? "error" : "info",
    details: [
      `critical: ${aggregated.impactCounts.critical}`,
      `serious: ${aggregated.impactCounts.serious}`,
      `moderate: ${aggregated.impactCounts.moderate}`,
      `minor: ${aggregated.impactCounts.minor}`,
      `errored: ${aggregated.errored}/${aggregated.total}`,
    ],
    evidence,
  });
  const top = [...summary.results]
    .filter((result) => !result.runtimeErrorMessage)
    .sort((a, b) => b.violations.length - a.violations.length)
    .slice(0, 5);
  if (top.length > 0) {
    findings.push({
      title: "Worst pages (top 5 by violation count)",
      severity: "warn",
      details: top.map((result) => {
        const sample = selectTopViolations(result, 3);
        const sampleTitles = sample.map((violation) => violation.help ?? violation.id);
        return `${result.label} ${result.path} [${result.device}] – ${result.violations.length} violations: ${sampleTitles.join(" | ")}`;
      }),
      evidence,
    });
  }
  const errored = summary.results
    .filter((result) => typeof result.runtimeErrorMessage === "string" && result.runtimeErrorMessage.length > 0)
    .slice(0, 10);
  if (errored.length > 0) {
    findings.push({
      title: "Errored pages",
      severity: "error",
      details: errored.map(
        (result) => `${result.label} ${result.path} [${result.device}] – ${result.runtimeErrorMessage ?? ""}`,
      ),
      evidence,
    });
  }
  return findings;
}

export async function runAccessibilityCli(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv);
  const outputDir = resolve(".signaler");
  await mkdir(outputDir, { recursive: true });
  const { configPath, config } = await loadConfig({ configPath: args.configPath });
  const filteredConfig = filterConfigDevices(config, args.deviceFilter);
  const artifactsDir = resolve(outputDir, "accessibility");
  const summary = await runAccessibilityAudit({
    config: filteredConfig,
    configPath,
    parallelOverride: args.parallelOverride,
    timeoutMs: args.timeoutMs,
    artifactsDir,
  });
  await writeFile(resolve(outputDir, "accessibility-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeRunnerReports({
    outputDir,
    runner: "accessibility",
    generatedAt: new Date().toISOString(),
    humanTitle: "Signaler Accessibility report",
    humanSummaryLines: [
      `Combos: ${summary.meta.comboCount}`,
      `Elapsed: ${Math.round(summary.meta.elapsedMs / 1000)}s`,
    ],
    artifacts: [
      { label: "Accessibility summary (JSON)", relativePath: "accessibility-summary.json" },
      { label: "Accessibility artifacts", relativePath: "accessibility/" },
    ],
    aiMeta: {
      configPath,
      comboCount: summary.meta.comboCount,
      elapsedMs: summary.meta.elapsedMs,
    },
    aiFindings: buildAccessibilityFindings(summary),
  });
  await writeArtifactsNavigation({ outputDir });

  if (args.jsonOutput) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const aggregated = summarizeAxeSummary(summary);
  const lines = [
    `Config: ${configPath}`,
    `Base URL: ${config.baseUrl}`,
    `Combos: ${summary.meta.comboCount}`,
    `Critical: ${aggregated.impactCounts.critical}`,
    `Serious: ${aggregated.impactCounts.serious}`,
    `Errored combos: ${aggregated.errored}`,
    `Output: .signaler/accessibility-summary.json`,
  ];
  console.log(renderPanel({ title: theme.bold("Accessibility"), lines }));
}
