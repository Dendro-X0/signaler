import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { summarizeAxeSummary } from "./accessibility.js";
import type { AxeSummary } from "./accessibility-types.js";
import { resolveArtifactPath, resolveFlatPathForId } from "./artifact-layout/index.js";
import { loadConfig } from "./core/config.js";
import type { QualityPackConfig } from "./core/types.js";
import { evaluateLinksCheckStatus, type LinksCheckStatus } from "./links-check-status.js";
import { buildQualityPackGuidance, formatQualityPackGuidanceText, type QualityPackGuidanceSection } from "./quality-pack-guidance.js";

export type QualityPackViolation = {
  readonly id: string;
  readonly message: string;
  readonly severity: "critical";
};

export type QualityPackResult = {
  readonly schemaVersion: 1;
  readonly profile: string;
  readonly passed: boolean;
  readonly violations: readonly QualityPackViolation[];
  readonly evaluatedAt: string;
  readonly summary: {
    readonly headerFailures: number;
    readonly brokenLinks: number;
    readonly linksDiscovered: number;
    readonly linksStatus: LinksCheckStatus;
    readonly bundleScanned: boolean;
    readonly bundleFileCount: number;
    readonly healthErrors: number;
    readonly healthOk: number;
    readonly consoleErrorCombos: number;
    readonly consoleEventCount: number;
    readonly measureRuntimeErrors: number;
    readonly accessibilityCritical: number;
    readonly accessibilitySerious: number;
    readonly accessibilityRuntimeErrors: number;
  };
  readonly artifacts: {
    readonly agentIndex: string;
    readonly headers: string;
    readonly links: string;
    readonly bundle: string;
    readonly health: string;
    readonly console: string;
    readonly measure: string;
    readonly accessibility: string;
  };
  readonly guidance?: readonly QualityPackGuidanceSection[];
};

type HeadersArtifact = {
  readonly results?: readonly {
    readonly missing?: readonly string[];
    readonly runtimeErrorMessage?: string;
  }[];
};

type LinksArtifact = {
  readonly broken?: readonly unknown[];
  readonly discovered?: {
    readonly total?: number;
  };
  readonly checkStatus?: "pass" | "inconclusive" | "fail";
};

type BundleArtifact = {
  readonly totals?: { readonly fileCount?: number };
  readonly meta?: { readonly detected?: { readonly nextDir?: boolean; readonly distDir?: boolean } };
};

type HealthArtifact = {
  readonly results?: readonly {
    readonly statusCode?: number;
    readonly runtimeErrorMessage?: string;
  }[];
};

type ConsoleArtifact = {
  readonly results?: readonly {
    readonly status?: "ok" | "error";
    readonly events?: readonly unknown[];
  }[];
};

type MeasureArtifact = {
  readonly results?: readonly {
    readonly runtimeErrorMessage?: string;
  }[];
};

const DEFAULT_PACK: Required<
  Pick<
    QualityPackConfig,
    | "maxHeaderFailures"
    | "maxBrokenLinks"
    | "maxHealthErrors"
    | "maxConsoleErrorCombos"
    | "maxMeasureRuntimeErrors"
    | "maxAccessibilityCriticalViolations"
    | "maxAccessibilitySeriousViolations"
    | "maxAccessibilityRuntimeErrors"
  >
> = {
  maxHeaderFailures: 0,
  maxBrokenLinks: 0,
  maxHealthErrors: 0,
  maxConsoleErrorCombos: 0,
  maxMeasureRuntimeErrors: 0,
  maxAccessibilityCriticalViolations: 0,
  maxAccessibilitySeriousViolations: 0,
  maxAccessibilityRuntimeErrors: 0,
};

function countHeaderFailures(report: HeadersArtifact | null): number {
  if (!report?.results) {
    return 0;
  }
  return report.results.filter(
    (row) => (row.missing?.length ?? 0) > 0 || Boolean(row.runtimeErrorMessage),
  ).length;
}

function countHealthErrors(report: HealthArtifact | null): { readonly errors: number; readonly ok: number } {
  if (!report?.results) {
    return { errors: 0, ok: 0 };
  }
  let errors = 0;
  let ok = 0;
  for (const row of report.results) {
    if (row.runtimeErrorMessage) {
      errors += 1;
      continue;
    }
    const code = row.statusCode ?? 0;
    if (code >= 200 && code < 400) {
      ok += 1;
    } else {
      errors += 1;
    }
  }
  return { errors, ok };
}

function countConsoleErrorCombos(report: ConsoleArtifact | null): { readonly errorCombos: number; readonly eventCount: number } {
  if (!report?.results) {
    return { errorCombos: 0, eventCount: 0 };
  }
  const errorCombos = report.results.filter((row) => row.status === "error").length;
  const eventCount = report.results.reduce((sum, row) => sum + (row.events?.length ?? 0), 0);
  return { errorCombos, eventCount };
}

function countMeasureRuntimeErrors(report: MeasureArtifact | null): number {
  if (!report?.results) {
    return 0;
  }
  return report.results.filter((row) => Boolean(row.runtimeErrorMessage)).length;
}

export function evaluateQualityPack(params: {
  readonly profile: string;
  readonly pack?: QualityPackConfig;
  readonly headers: HeadersArtifact | null;
  readonly links: LinksArtifact | null;
  readonly bundle: BundleArtifact | null;
  readonly health?: HealthArtifact | null;
  readonly console?: ConsoleArtifact | null;
  readonly measure?: MeasureArtifact | null;
  readonly accessibility?: AxeSummary | null;
}): QualityPackResult {
  const limits = { ...DEFAULT_PACK, ...params.pack };
  const violations: QualityPackViolation[] = [];

  const headerFailures = countHeaderFailures(params.headers);
  if (params.headers === null) {
    violations.push({
      id: "headers-missing",
      message: "headers.json not found after quality profile run.",
      severity: "critical",
    });
  } else if (headerFailures > limits.maxHeaderFailures) {
    violations.push({
      id: "max-header-failures",
      message: `${headerFailures} route(s) failed security headers (max ${limits.maxHeaderFailures}).`,
      severity: "critical",
    });
  }

  const brokenLinks = params.links?.broken?.length ?? 0;
  const linksDiscovered = params.links?.discovered?.total ?? 0;
  const linksStatus =
    params.links?.checkStatus ?? evaluateLinksCheckStatus({ discoveredCount: linksDiscovered, brokenCount: brokenLinks });
  if (params.links === null) {
    violations.push({
      id: "links-missing",
      message: "links.json not found after quality profile run.",
      severity: "critical",
    });
  } else if (linksStatus === "inconclusive") {
    violations.push({
      id: "links-inconclusive",
      message:
        "Links check is inconclusive: 0 URLs discovered (sitemap/crawl found nothing). Broken=0 is not a meaningful pass.",
      severity: "critical",
    });
  } else if (brokenLinks > limits.maxBrokenLinks) {
    violations.push({
      id: "max-broken-links",
      message: `${brokenLinks} broken link(s) (max ${limits.maxBrokenLinks}).`,
      severity: "critical",
    });
  }

  const bundleDetected =
    Boolean(params.bundle?.meta?.detected?.nextDir) || Boolean(params.bundle?.meta?.detected?.distDir);
  const bundleFileCount = params.bundle?.totals?.fileCount ?? 0;
  if (params.bundle === null) {
    violations.push({
      id: "bundle-missing",
      message: "bundle-audit.json not found after quality profile run.",
      severity: "critical",
    });
  } else if (bundleDetected && bundleFileCount === 0) {
    violations.push({
      id: "bundle-empty",
      message: "Build output detected but bundle scan found 0 files.",
      severity: "critical",
    });
  }

  const healthStats = countHealthErrors(params.health ?? null);
  if (params.health === null || params.health === undefined) {
    violations.push({
      id: "health-missing",
      message: "health.json not found after quality profile run.",
      severity: "critical",
    });
  } else if (healthStats.errors > limits.maxHealthErrors) {
    violations.push({
      id: "max-health-errors",
      message: `${healthStats.errors} route(s) failed health checks (max ${limits.maxHealthErrors}).`,
      severity: "critical",
    });
  }

  const consoleStats = countConsoleErrorCombos(params.console ?? null);
  if (params.console === null || params.console === undefined) {
    violations.push({
      id: "console-missing",
      message: "console.json not found after quality profile run.",
      severity: "critical",
    });
  } else if (consoleStats.errorCombos > limits.maxConsoleErrorCombos) {
    violations.push({
      id: "max-console-error-combos",
      message: `${consoleStats.errorCombos} combo(s) had console errors (max ${limits.maxConsoleErrorCombos}).`,
      severity: "critical",
    });
  }

  const measureRuntimeErrors = countMeasureRuntimeErrors(params.measure ?? null);
  if (params.measure === null || params.measure === undefined) {
    violations.push({
      id: "measure-missing",
      message: "measure-summary.json not found after quality profile run.",
      severity: "critical",
    });
  } else if (measureRuntimeErrors > limits.maxMeasureRuntimeErrors) {
    violations.push({
      id: "max-measure-runtime-errors",
      message: `${measureRuntimeErrors} measure combo(s) failed at runtime (max ${limits.maxMeasureRuntimeErrors}).`,
      severity: "critical",
    });
  }

  const accessibilitySummary = params.accessibility ?? null;
  const accessibilityStats =
    accessibilitySummary === null ? { impactCounts: { critical: 0, serious: 0, moderate: 0, minor: 0 }, errored: 0, total: 0 } : summarizeAxeSummary(accessibilitySummary);
  if (accessibilitySummary === null) {
    violations.push({
      id: "accessibility-missing",
      message: "accessibility-summary.json not found after quality profile run.",
      severity: "critical",
    });
  } else if (accessibilityStats.impactCounts.critical > limits.maxAccessibilityCriticalViolations) {
    violations.push({
      id: "max-accessibility-critical",
      message: `${accessibilityStats.impactCounts.critical} critical accessibility violation(s) (max ${limits.maxAccessibilityCriticalViolations}).`,
      severity: "critical",
    });
  } else if (accessibilityStats.impactCounts.serious > limits.maxAccessibilitySeriousViolations) {
    violations.push({
      id: "max-accessibility-serious",
      message: `${accessibilityStats.impactCounts.serious} serious accessibility violation(s) (max ${limits.maxAccessibilitySeriousViolations}).`,
      severity: "critical",
    });
  } else if (accessibilityStats.errored > limits.maxAccessibilityRuntimeErrors) {
    violations.push({
      id: "max-accessibility-runtime-errors",
      message: `${accessibilityStats.errored} accessibility combo(s) errored at runtime (max ${limits.maxAccessibilityRuntimeErrors}).`,
      severity: "critical",
    });
  }

  const result: QualityPackResult = {
    schemaVersion: 1,
    profile: params.profile,
    passed: violations.length === 0,
    violations,
    evaluatedAt: new Date().toISOString(),
    summary: {
      headerFailures,
      brokenLinks,
      linksDiscovered,
      linksStatus,
      bundleScanned: params.bundle !== null,
      bundleFileCount,
      healthErrors: healthStats.errors,
      healthOk: healthStats.ok,
      consoleErrorCombos: consoleStats.errorCombos,
      consoleEventCount: consoleStats.eventCount,
      measureRuntimeErrors,
      accessibilityCritical: accessibilityStats.impactCounts.critical,
      accessibilitySerious: accessibilityStats.impactCounts.serious,
      accessibilityRuntimeErrors: accessibilityStats.errored,
    },
    artifacts: {
      agentIndex: "agent-index.json",
      headers: "headers.json",
      links: "links.json",
      bundle: "bundle-audit.json",
      health: "health.json",
      console: "console.json",
      measure: "measure-summary.json",
      accessibility: "accessibility-summary.json",
    },
  };
  return {
    ...result,
    guidance: buildQualityPackGuidance(result),
  };
}

async function readJsonIfExists<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function evaluateAndWriteQualityPack(params: {
  readonly outputDir: string;
  readonly profile: string;
  readonly cwd: string;
  readonly configPath?: string;
}): Promise<QualityPackResult> {
  const outputDir = resolve(params.outputDir);
  let packConfig: QualityPackConfig | undefined;
  if (params.configPath) {
    const { config } = await loadConfig({ configPath: resolve(params.cwd, params.configPath) });
    packConfig = config.qualityPack;
  }

  const headers = await readJsonIfExists<HeadersArtifact>(await resolveArtifactPath(outputDir, "headers"));
  const links = await readJsonIfExists<LinksArtifact>(await resolveArtifactPath(outputDir, "links"));
  const bundle = await readJsonIfExists<BundleArtifact>(await resolveArtifactPath(outputDir, "bundle"));
  const health = await readJsonIfExists<HealthArtifact>(await resolveArtifactPath(outputDir, "health"));
  const consoleReport = await readJsonIfExists<ConsoleArtifact>(await resolveArtifactPath(outputDir, "console"));
  const measure = await readJsonIfExists<MeasureArtifact>(await resolveArtifactPath(outputDir, "measure-summary"));
  const accessibility = await readJsonIfExists<AxeSummary>(await resolveArtifactPath(outputDir, "accessibility-summary"));

  const result = evaluateQualityPack({
    profile: params.profile,
    pack: packConfig,
    headers,
    links,
    bundle,
    health,
    console: consoleReport,
    measure,
    accessibility,
  });

  await writeFile(resolve(outputDir, "quality-pack.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await mergeQualityPackIntoAgentIndex({ outputDir, pack: result });
  return result;
}

export async function mergeQualityPackIntoAgentIndex(params: {
  readonly outputDir: string;
  readonly pack: QualityPackResult;
}): Promise<void> {
  const root = resolve(params.outputDir);
  const agentIndexPath = await resolveArtifactPath(root, "agent-index");
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(agentIndexPath, "utf8")) as unknown;
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== "object") {
    return;
  }
  const index = parsed as Record<string, unknown>;
  if (index.contractVersion !== "v3") {
    return;
  }
  const entrypoints =
    typeof index.entrypoints === "object" && index.entrypoints !== null
      ? { ...(index.entrypoints as Record<string, string>) }
      : {};
  entrypoints.headers = "headers.json";
  entrypoints.links = "links.json";
  entrypoints.bundle = "bundle-audit.json";
  entrypoints.health = "health.json";
  entrypoints.console = "console.json";
  entrypoints.measure = "measure-summary.json";
  entrypoints.accessibility = "accessibility-summary.json";
  entrypoints.qualityPack = "quality-pack.json";
  const updated = {
    ...index,
    entrypoints,
    qualityPack: {
      profile: params.pack.profile,
      passed: params.pack.passed,
      relativePath: "quality-pack.json" as const,
      summary: {
        headerFailures: params.pack.summary.headerFailures,
        brokenLinks: params.pack.summary.brokenLinks,
        linksDiscovered: params.pack.summary.linksDiscovered,
        linksStatus: params.pack.summary.linksStatus,
        bundleFileCount: params.pack.summary.bundleFileCount,
        healthErrors: params.pack.summary.healthErrors,
        consoleErrorCombos: params.pack.summary.consoleErrorCombos,
        measureRuntimeErrors: params.pack.summary.measureRuntimeErrors,
        accessibilityCritical: params.pack.summary.accessibilityCritical,
        accessibilitySerious: params.pack.summary.accessibilitySerious,
      },
      ...(params.pack.guidance && params.pack.guidance.length > 0
        ? { guidance: params.pack.guidance.map((section) => section.title) }
        : {}),
    },
  };
  await writeFile(resolve(root, resolveFlatPathForId("agent-index")), `${JSON.stringify(updated, null, 2)}\n`, "utf8");
}

export function mergeQualityPackExitCode(priorExitCode: number, pack: QualityPackResult): number {
  if (priorExitCode !== 0) {
    return priorExitCode;
  }
  return pack.passed ? 0 : 1;
}

export function formatQualityPackFailures(pack: QualityPackResult): string {
  const lines = pack.violations.map((v) => `- ${v.message}`);
  const guidanceText = formatQualityPackGuidanceText(pack.guidance ?? buildQualityPackGuidance(pack));
  if (guidanceText.length > 0) {
    lines.push("", guidanceText);
  }
  return lines.join("\n");
}
