import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import lighthouse from "lighthouse";
import { launch as launchChrome } from "chrome-launcher";
import type { ApexCategory, ApexDevice, ApexPageScope, ApexThrottlingMethod, CategoryScores, ComboRunStats, FailedAuditSummary, MetricValues, NumericStats, OpportunitySummary, PageDeviceSummary } from "./core/types.js";
import { captureLighthouseArtifacts } from "./runners/lighthouse/capture.js";

type LighthouseLogLevel = "silent" | "error" | "info" | "verbose";

type WorkerRequestMessage = {
  readonly type: "run";
  readonly id: string;
  readonly task: AuditTask;
};

type WorkerResponseMessage =
  | {
    readonly type: "result";
    readonly id: string;
    readonly result: PageDeviceSummary;
  }
  | {
    readonly type: "error";
    readonly id: string;
    readonly errorMessage: string;
  };

type AuditTask = {
  readonly url: string;
  readonly path: string;
  readonly label: string;
  readonly device: ApexDevice;
  readonly pageScope?: ApexPageScope;
  readonly logLevel: LighthouseLogLevel;
  readonly throttlingMethod: ApexThrottlingMethod;
  readonly cpuSlowdownMultiplier: number;
  readonly timeoutMs: number;
  readonly onlyCategories?: readonly ApexCategory[];
  readonly captureLevel?: "diagnostics" | "lhr";
  readonly outputDir: string;
  readonly runs: number;
};

type ChromeSession = {
  readonly port: number;
  readonly close: () => Promise<void>;
};

type LighthouseCategoryLike = {
  readonly score?: number;
};

type LighthouseAuditDetailsLike = {
  readonly type?: string;
  readonly overallSavingsMs?: number;
  readonly overallSavingsBytes?: number;
};

type LighthouseAuditLike = {
  readonly id?: string;
  readonly title?: string;
  readonly scoreDisplayMode?: string;
  readonly numericValue?: number;
  readonly details?: LighthouseAuditDetailsLike;
  readonly score?: number;
  readonly description?: string;
};

type LighthouseResultLike = {
  readonly finalDisplayedUrl?: string;
  readonly audits: { readonly [key: string]: unknown };
  readonly categories: {
    readonly performance?: LighthouseCategoryLike;
    readonly accessibility?: LighthouseCategoryLike;
    readonly ["best-practices"]?: LighthouseCategoryLike;
    readonly seo?: LighthouseCategoryLike;
  };
  readonly runtimeError?: {
    readonly code?: string;
    readonly message?: string;
  };
};

function isTransientLighthouseError(error: unknown): boolean {
  const message: string = error instanceof Error && typeof error.message === "string" ? error.message : "";
  const lowerMessage = message.toLowerCase();

  return (
    // Lighthouse-specific errors
    message.includes("performance mark has not been set") ||
    message.includes("TargetCloseError") ||
    message.includes("Target closed") ||
    message.includes("setAutoAttach") ||
    message.includes("LanternError") ||
    message.includes("top level events") ||
    message.includes("CDP") ||
    message.includes("disconnected") ||
    message.includes("Signaler timeout") ||
    // Network errors
    message.includes("WebSocket") ||
    message.includes("webSocket") ||
    message.includes("fetch failed") ||
    lowerMessage.includes("econnrefused") ||
    lowerMessage.includes("econnreset") ||
    lowerMessage.includes("etimedout") ||
    message.includes("socket hang up") ||
    // Chrome errors
    lowerMessage.includes("chrome") && lowerMessage.includes("crash") ||
    message.includes("Protocol error") ||
    message.includes("Session closed") ||
    // Timeout errors
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("timed out")
  );
}

async function createChromeSession(): Promise<ChromeSession> {
  const userDataDir: string = await mkdtemp(join(tmpdir(), "signaler-chrome-"));
  const chrome = await launchChrome({
    chromeFlags: [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-default-apps",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${userDataDir}`,
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-client-side-phishing-detection",
      "--disable-sync",
      "--disable-translate",
      "--metrics-recording-only",
      "--safebrowsing-disable-auto-update",
      "--password-store=basic",
      "--use-mock-keychain",
      // Stability flags for parallel runs
      "--disable-hang-monitor",
      "--disable-ipc-flooding-protection",
      "--disable-domain-reliability",
      "--disable-component-update",
    ],
  });
  return {
    port: chrome.port,
    close: async (): Promise<void> => {
      try {
        await chrome.kill();
        await rm(userDataDir, { recursive: true, force: true });
      } catch {
        return;
      }
    },
  };
}

async function delayMs(durationMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function computeRetryDelayMs(params: { readonly attempt: number }): number {
  const baseDelayMs: number = 250;
  const maxDelayMs: number = 5000;
  const exp: number = Math.min(5, params.attempt);
  const candidate: number = baseDelayMs * Math.pow(2, exp);
  const jitter: number = Math.floor(Math.random() * 200);
  return Math.min(maxDelayMs, candidate + jitter);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise: Promise<T> = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Signaler timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

type ChromeSessionRef = {
  session: ChromeSession;
};

async function runTaskWithRetry(task: AuditTask, sessionRef: ChromeSessionRef, maxRetries: number): Promise<PageDeviceSummary> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= maxRetries) {
    try {
      return await withTimeout(
        runSingleAudit({
          url: task.url,
          path: task.path,
          label: task.label,
          device: task.device,
          pageScope: task.pageScope,
          port: sessionRef.session.port,
          logLevel: task.logLevel,
          throttlingMethod: task.throttlingMethod,
          cpuSlowdownMultiplier: task.cpuSlowdownMultiplier,
          onlyCategories: task.onlyCategories,
          captureLevel: task.captureLevel,
          outputDir: task.outputDir,
        }),
        task.timeoutMs,
      );
    } catch (error: unknown) {
      lastError = error;
      const shouldRetry: boolean = isTransientLighthouseError(error) && attempt < maxRetries;
      if (!shouldRetry) {
        throw error instanceof Error ? error : new Error("Lighthouse failed");
      }
      await sessionRef.session.close();
      await delayMs(computeRetryDelayMs({ attempt }));
      sessionRef.session = await createChromeSession();
      attempt += 1;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Lighthouse failed after retries");
}

async function runSingleAudit(params: {
  readonly url: string;
  readonly path: string;
  readonly label: string;
  readonly device: ApexDevice;
  readonly pageScope?: ApexPageScope;
  readonly port: number;
  readonly logLevel: LighthouseLogLevel;
  readonly throttlingMethod: ApexThrottlingMethod;
  readonly cpuSlowdownMultiplier: number;
  readonly onlyCategories?: readonly ApexCategory[];
  readonly captureLevel?: "diagnostics" | "lhr";
  readonly outputDir: string;
}): Promise<PageDeviceSummary> {
  const onlyCategories: readonly ApexCategory[] = params.onlyCategories ?? ["performance", "accessibility", "best-practices", "seo"];
  const options: Record<string, unknown> = {
    port: params.port,
    output: "json" as const,
    logLevel: params.logLevel,
    onlyCategories,
    formFactor: params.device,
    throttlingMethod: params.throttlingMethod,
    screenEmulation: params.device === "mobile"
      ? { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false }
      : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
  };
  if (params.throttlingMethod === "simulate") {
    options.throttling = {
      cpuSlowdownMultiplier: params.cpuSlowdownMultiplier,
      rttMs: 150,
      throughputKbps: 1638.4,
      requestLatencyMs: 150 * 3.75,
      downloadThroughputKbps: 1638.4,
      uploadThroughputKbps: 750,
    };
  }
  const runnerResult = await lighthouse(params.url, options);
  const lhrUnknown: unknown = runnerResult.lhr as unknown;
  if (!lhrUnknown || typeof lhrUnknown !== "object") {
    throw new Error("Lighthouse did not return a valid result");
  }

  if (params.captureLevel !== undefined) {
    await captureLighthouseArtifacts({
      outputRoot: resolve(params.outputDir),
      captureLevel: params.captureLevel,
      key: { label: params.label, path: params.path, device: params.device },
      lhr: lhrUnknown,
    });
  }

  const lhr: LighthouseResultLike = lhrUnknown as LighthouseResultLike;
  const scores: CategoryScores = extractScores(lhr);
  const metrics: MetricValues = extractMetrics(lhr);
  const opportunities: readonly OpportunitySummary[] = extractTopOpportunities(lhr, 3);
  const failedAudits: readonly FailedAuditSummary[] = extractFailedAudits(lhr);

  return {
    url: lhr.finalDisplayedUrl ?? params.url,
    path: params.path,
    label: params.label,
    device: params.device,
    pageScope: params.pageScope,
    scores,
    metrics,
    opportunities,
    failedAudits,
    runtimeErrorCode: typeof lhr.runtimeError?.code === "string" ? lhr.runtimeError.code : undefined,
    runtimeErrorMessage: typeof lhr.runtimeError?.message === "string" ? lhr.runtimeError.message : undefined,
  };
}

function extractScores(lhr: LighthouseResultLike): CategoryScores {
  const performanceScore: number | undefined = lhr.categories.performance?.score;
  const accessibilityScore: number | undefined = lhr.categories.accessibility?.score;
  const bestPracticesScore: number | undefined = lhr.categories["best-practices"]?.score;
  const seoScore: number | undefined = lhr.categories.seo?.score;
  return {
    performance: normaliseScore(performanceScore),
    accessibility: normaliseScore(accessibilityScore),
    bestPractices: normaliseScore(bestPracticesScore),
    seo: normaliseScore(seoScore),
  };
}

function normaliseScore(score: number | undefined): number | undefined {
  if (typeof score !== "number") {
    return undefined;
  }
  return Math.round(score * 100);
}

function extractMetrics(lhr: LighthouseResultLike): MetricValues {
  const audits = lhr.audits;
  const lcpAudit = audits["largest-contentful-paint"] as LighthouseAuditLike | undefined;
  const fcpAudit = audits["first-contentful-paint"] as LighthouseAuditLike | undefined;
  const tbtAudit = audits["total-blocking-time"] as LighthouseAuditLike | undefined;
  const clsAudit = audits["cumulative-layout-shift"] as LighthouseAuditLike | undefined;
  const inpAudit = audits["interaction-to-next-paint"] as LighthouseAuditLike | undefined;
  const lcpMs: number | undefined = typeof lcpAudit?.numericValue === "number" ? lcpAudit.numericValue : undefined;
  const fcpMs: number | undefined = typeof fcpAudit?.numericValue === "number" ? fcpAudit.numericValue : undefined;
  const tbtMs: number | undefined = typeof tbtAudit?.numericValue === "number" ? tbtAudit.numericValue : undefined;
  const cls: number | undefined = typeof clsAudit?.numericValue === "number" ? clsAudit.numericValue : undefined;
  const inpMs: number | undefined = typeof inpAudit?.numericValue === "number" ? inpAudit.numericValue : undefined;
  return {
    lcpMs,
    fcpMs,
    tbtMs,
    cls,
    inpMs,
  };
}

function extractTopOpportunities(lhr: LighthouseResultLike, limit: number): readonly OpportunitySummary[] {
  const audits: LighthouseAuditLike[] = Object.values(lhr.audits) as LighthouseAuditLike[];
  const candidates: OpportunitySummary[] = audits
    .filter((audit) => audit.details?.type === "opportunity")
    .map((audit) => {
      const savingsMs: number | undefined = audit.details?.overallSavingsMs;
      const savingsBytes: number | undefined = audit.details?.overallSavingsBytes;
      return {
        id: audit.id ?? "unknown",
        title: audit.title ?? (audit.id ?? "Unknown"),
        estimatedSavingsMs: typeof savingsMs === "number" ? savingsMs : undefined,
        estimatedSavingsBytes: typeof savingsBytes === "number" ? savingsBytes : undefined,
      };
    });
  candidates.sort((a, b) => (b.estimatedSavingsMs ?? 0) - (a.estimatedSavingsMs ?? 0));
  return candidates.slice(0, limit);
}

function extractFailedAudits(lhr: LighthouseResultLike): readonly FailedAuditSummary[] {
  const audits: LighthouseAuditLike[] = Object.values(lhr.audits) as LighthouseAuditLike[];
  return audits
    .filter((audit) => {
      // We want audits that failed (score < 0.9)
      // scoreDisplayMode 'binary' means 0 or 1.
      // scoreDisplayMode 'numeric' means 0 to 1.
      // We also include informative/manual audits if they are relevant, but usually we stick to score.
      if (audit.scoreDisplayMode === 'manual' || audit.scoreDisplayMode === 'informative') {
        return false;
      }
      return typeof audit.score === 'number' && audit.score < 0.9;
    })
    .map((audit) => ({
      id: audit.id ?? "unknown",
      title: audit.title ?? (audit.id ?? "Unknown"),
      description: audit.description ?? "",
      score: audit.score ?? 0,
      scoreDisplayMode: audit.scoreDisplayMode ?? "numeric",
      details: audit.details,
    }));
}

function medianOf(values: readonly (number | undefined)[]): number | undefined {
  const defined: number[] = values.filter((v): v is number => typeof v === "number");
  if (defined.length === 0) {
    return undefined;
  }
  return computeMedian(defined);
}

function medianRounded(values: readonly (number | undefined)[]): number | undefined {
  const median: number | undefined = medianOf(values);
  return typeof median === "number" ? Math.round(median) : undefined;
}

function computeMedian(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted: number[] = [...values].sort((a, b) => a - b);
  const mid: number = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? 0;
  }
  const a: number = sorted[mid - 1] ?? 0;
  const b: number = sorted[mid] ?? 0;
  return (a + b) / 2;
}

function computeP75(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted: number[] = [...values].sort((a, b) => a - b);
  const index: number = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.75) - 1));
  return sorted[index] ?? 0;
}

function computeStddev(values: readonly number[], mean: number): number {
  if (values.length < 2) {
    return 0;
  }
  const variance: number = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function buildNumericStats(values: readonly (number | undefined)[]): NumericStats | undefined {
  const defined: number[] = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (defined.length === 0) {
    return undefined;
  }
  const sorted: number[] = [...defined].sort((a, b) => a - b);
  const n: number = sorted.length;
  const min: number = sorted[0] ?? 0;
  const max: number = sorted[sorted.length - 1] ?? 0;
  const mean: number = sorted.reduce((sum, v) => sum + v, 0) / n;
  const median: number = computeMedian(sorted);
  const p75: number = computeP75(sorted);
  const stddev: number = computeStddev(sorted, mean);
  return { n, min, max, mean, median, p75, stddev };
}

function aggregateSummaries(summaries: readonly PageDeviceSummary[]): PageDeviceSummary {
  if (summaries.length === 1) {
    return summaries[0];
  }
  const base: PageDeviceSummary = summaries[0];
  const aggregateScores: CategoryScores = {
    performance: medianRounded(summaries.map((s) => s.scores.performance)),
    accessibility: medianRounded(summaries.map((s) => s.scores.accessibility)),
    bestPractices: medianRounded(summaries.map((s) => s.scores.bestPractices)),
    seo: medianRounded(summaries.map((s) => s.scores.seo)),
  };
  const aggregateMetrics: MetricValues = {
    lcpMs: medianOf(summaries.map((s) => s.metrics.lcpMs)),
    fcpMs: medianOf(summaries.map((s) => s.metrics.fcpMs)),
    tbtMs: medianOf(summaries.map((s) => s.metrics.tbtMs)),
    cls: medianOf(summaries.map((s) => s.metrics.cls)),
    inpMs: medianOf(summaries.map((s) => s.metrics.inpMs)),
  };
  const runStats: ComboRunStats = {
    scores: {
      performance: buildNumericStats(summaries.map((s) => s.scores.performance)),
      accessibility: buildNumericStats(summaries.map((s) => s.scores.accessibility)),
      bestPractices: buildNumericStats(summaries.map((s) => s.scores.bestPractices)),
      seo: buildNumericStats(summaries.map((s) => s.scores.seo)),
    },
    metrics: {
      lcpMs: buildNumericStats(summaries.map((s) => s.metrics.lcpMs)),
      fcpMs: buildNumericStats(summaries.map((s) => s.metrics.fcpMs)),
      tbtMs: buildNumericStats(summaries.map((s) => s.metrics.tbtMs)),
      cls: buildNumericStats(summaries.map((s) => s.metrics.cls)),
      inpMs: buildNumericStats(summaries.map((s) => s.metrics.inpMs)),
    },
  };
  return {
    ...base,
    scores: aggregateScores,
    metrics: aggregateMetrics,
    opportunities: summaries[0].opportunities,
    failedAudits: summaries[0].failedAudits,
    runStats,
  };
}

function buildFailureSummary(task: AuditTask, errorMessage: string): PageDeviceSummary {
  return {
    url: task.url,
    path: task.path,
    label: task.label,
    device: task.device,
    pageScope: task.pageScope,
    scores: {},
    metrics: {},
    opportunities: [],
    failedAudits: [],
    runtimeErrorMessage: errorMessage,
  };
}

function send(message: WorkerResponseMessage): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function runAggregatedTask(task: AuditTask, sessionRef: ChromeSessionRef, maxRetries: number): Promise<PageDeviceSummary> {
  const runs: number = Math.max(1, task.runs);
  const summaries: PageDeviceSummary[] = [];
  for (let runIndex = 0; runIndex < runs; runIndex += 1) {
    try {
      const summary: PageDeviceSummary = await runTaskWithRetry(task, sessionRef, maxRetries);
      summaries.push(summary);
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : "Unknown error";
      summaries.push(buildFailureSummary(task, message));
    }
  }
  return aggregateSummaries(summaries);
}

function parseWorkerMessage(raw: string): WorkerRequestMessage | undefined {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    const record = parsed as Record<string, unknown>;
    if (record.type !== "run") {
      return undefined;
    }
    if (typeof record.id !== "string" || !record.task || typeof record.task !== "object") {
      return undefined;
    }
    return record as WorkerRequestMessage;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const maxRetries = 3;
  // Recycle Chrome periodically to prevent memory leaks
  const maxTasksPerChrome = 10;
  const sessionRef: ChromeSessionRef = { session: await createChromeSession() };
  let tasksSinceChromeStart = 0;
  const lineReader = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lineReader) {
    const trimmed: string = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (trimmed === "{\"type\":\"shutdown\"}") {
      break;
    }
    const message: WorkerRequestMessage | undefined = parseWorkerMessage(trimmed);
    if (!message) {
      continue;
    }
    try {
      const result: PageDeviceSummary = await runAggregatedTask(message.task, sessionRef, maxRetries);
      send({ type: "result", id: message.id, result });
      tasksSinceChromeStart += 1;
      if (tasksSinceChromeStart >= maxTasksPerChrome) {
        tasksSinceChromeStart = 0;
        await sessionRef.session.close();
        sessionRef.session = await createChromeSession();
      }
    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : "Unknown error";
      send({ type: "error", id: message.id, errorMessage });
      try {
        await sessionRef.session.close();
      } catch {
        // Ignore close errors
      }
      sessionRef.session = await createChromeSession();
      tasksSinceChromeStart = 0;
    }
  }
  try {
    await sessionRef.session.close();
  } catch {
    // Ignore close errors on shutdown.
  }
}

void main();
