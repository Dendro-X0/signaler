import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ApexBudgets, ApexConfig, ApexPageScope, ApexThrottlingMethod, ApexThroughputBackoffPolicy, CategoryBudgetThresholds, MetricBudgetThresholds } from "./types.js";

/**
 * Load and minimally validate the Signaler configuration file.
 */
export async function loadConfig({ configPath }: { configPath: string }): Promise<{
  readonly configPath: string;
  readonly config: ApexConfig;
}> {
  const absolutePath: string = resolve(configPath);
  const raw: string = await readFile(absolutePath, "utf8");
  const parsed: unknown = JSON.parse(raw) as unknown;
  const config: ApexConfig = normaliseConfig(parsed, absolutePath);
  
  // Validate config after normalization
  const validationErrors = validateConfig(config);
  if (validationErrors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${validationErrors.map(e => `  • ${e}`).join('\n')}\n\nConfig file: ${absolutePath}`
    );
  }
  
  return { configPath: absolutePath, config };
}

/**
 * Validate configuration for common issues
 */
function validateConfig(config: ApexConfig): string[] {
  const errors: string[] = [];
  
  // Validate baseUrl format
  if (!config.baseUrl.startsWith('http://') && !config.baseUrl.startsWith('https://')) {
    errors.push('baseUrl must start with http:// or https://');
  }
  
  // Check for common localhost mistakes
  if (config.baseUrl.includes('localhost') && !config.baseUrl.match(/localhost:\d+/)) {
    errors.push('baseUrl with localhost should include a port (e.g., http://localhost:3000)');
  }
  
  // Validate pages
  if (config.pages.length === 0) {
    errors.push('At least one page is required');
  }
  
  // Check for duplicate paths
  const paths = config.pages.map(p => p.path);
  const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate page paths found: ${duplicates.join(', ')}`);
  }
  
  // Validate parallel setting
  if (config.parallel !== undefined && (config.parallel < 1 || config.parallel > 10)) {
    errors.push('parallel must be between 1 and 10');
  }
  
  // Validate timeout
  if (config.auditTimeoutMs !== undefined && config.auditTimeoutMs < 10000) {
    errors.push('auditTimeoutMs should be at least 10000 (10 seconds)');
  }

  // Validate throughput backoff policy
  if (
    (config as { readonly throughputBackoff?: unknown }).throughputBackoff !== undefined &&
    (config as { readonly throughputBackoff?: unknown }).throughputBackoff !== "auto" &&
    (config as { readonly throughputBackoff?: unknown }).throughputBackoff !== "aggressive" &&
    (config as { readonly throughputBackoff?: unknown }).throughputBackoff !== "off"
  ) {
    errors.push('throughputBackoff must be one of: auto, aggressive, off');
  }
  
  return errors;
}

function normaliseConfig(input: unknown, absolutePath: string): ApexConfig {
  if (!input || typeof input !== "object") {
    throw new Error(`Invalid config at ${absolutePath}: expected object`);
  }
  const maybeConfig = input as {
    readonly baseUrl?: unknown;
    readonly query?: unknown;
    readonly buildId?: unknown;
    readonly chromePort?: unknown;
    readonly runs?: unknown;
    readonly auditTimeoutMs?: unknown;
    readonly gitIgnoreSignalerDir?: unknown;
    readonly pages?: unknown;
    readonly logLevel?: unknown;
    readonly throttlingMethod?: unknown;
    readonly cpuSlowdownMultiplier?: unknown;
    readonly parallel?: unknown;
    readonly sessionIsolation?: unknown;
    readonly warmUp?: unknown;
    readonly incremental?: unknown;
    readonly throughputBackoff?: unknown;
    readonly budgets?: unknown;
    readonly routes?: unknown;
    readonly incrementalSkip?: unknown;
    readonly qualityGate?: unknown;
    readonly baselineCompare?: unknown;
    readonly qualityPack?: unknown;
  };
  if (typeof maybeConfig.baseUrl !== "string" || maybeConfig.baseUrl.length === 0) {
    throw new Error(`Invalid config at ${absolutePath}: baseUrl must be a non-empty string`);
  }
  const pagesInput: unknown = maybeConfig.pages;
  if (!Array.isArray(pagesInput) || pagesInput.length === 0) {
    throw new Error(`Invalid config at ${absolutePath}: pages must be a non-empty array`);
  }
  const pages = pagesInput.map((page, index) => normalisePage(page, index, absolutePath));
  const baseUrl: string = maybeConfig.baseUrl.replace(/\/$/, "");
  const query: string | undefined = typeof maybeConfig.query === "string" ? maybeConfig.query : undefined;
  const buildId: string | undefined = typeof maybeConfig.buildId === "string" && maybeConfig.buildId.length > 0 ? maybeConfig.buildId : undefined;
  const chromePort: number | undefined = typeof maybeConfig.chromePort === "number" ? maybeConfig.chromePort : undefined;
  const runs: number | undefined = typeof maybeConfig.runs === "number" && maybeConfig.runs > 0 ? maybeConfig.runs : undefined;
  if (runs !== undefined && runs !== 1) {
    throw new Error(`Invalid config at ${absolutePath}: runs must be 1 (multi-run mode is no longer supported)`);
  }
  const auditTimeoutMs: number | undefined =
    typeof maybeConfig.auditTimeoutMs === "number" && maybeConfig.auditTimeoutMs > 0
      ? maybeConfig.auditTimeoutMs
      : undefined;
  const gitIgnoreSignalerDir: boolean | undefined =
    typeof maybeConfig.gitIgnoreSignalerDir === "boolean" ? maybeConfig.gitIgnoreSignalerDir : undefined;
  const rawLogLevel: unknown = maybeConfig.logLevel;
  const logLevel: "silent" | "error" | "info" | "verbose" | undefined =
    rawLogLevel === "silent" || rawLogLevel === "error" || rawLogLevel === "info" || rawLogLevel === "verbose"
      ? rawLogLevel
      : undefined;
  const rawThrottlingMethod: unknown = maybeConfig.throttlingMethod;
  const throttlingMethod: ApexThrottlingMethod | undefined =
    rawThrottlingMethod === "simulate" || rawThrottlingMethod === "devtools"
      ? rawThrottlingMethod
      : undefined;
  const rawCpuSlowdown: unknown = maybeConfig.cpuSlowdownMultiplier;
  const cpuSlowdownMultiplier: number | undefined =
    typeof rawCpuSlowdown === "number" && rawCpuSlowdown > 0 && rawCpuSlowdown <= 20
      ? rawCpuSlowdown
      : undefined;
  const rawParallel: unknown = maybeConfig.parallel;
  const parallel: number | undefined =
    typeof rawParallel === "number" && Number.isInteger(rawParallel) && rawParallel >= 1 && rawParallel <= 10
      ? rawParallel
      : undefined;
  const rawSessionIsolation: unknown = maybeConfig.sessionIsolation;
  const sessionIsolation: "shared" | "per-audit" | undefined =
    rawSessionIsolation === "shared" || rawSessionIsolation === "per-audit"
      ? rawSessionIsolation
      : undefined;
  const rawThroughputBackoff: unknown = maybeConfig.throughputBackoff;
  const throughputBackoff: ApexThroughputBackoffPolicy | undefined =
    rawThroughputBackoff === "auto" || rawThroughputBackoff === "aggressive" || rawThroughputBackoff === "off"
      ? rawThroughputBackoff
      : undefined;
  const warmUp: boolean | undefined =
    typeof maybeConfig.warmUp === "boolean" ? maybeConfig.warmUp : undefined;
  const incremental: boolean | undefined =
    typeof maybeConfig.incremental === "boolean" ? maybeConfig.incremental : undefined;
  const budgets: ApexBudgets | undefined = normaliseBudgets(maybeConfig.budgets, absolutePath);
  const routes = normaliseRouteListFilter(maybeConfig.routes, absolutePath);
  const incrementalSkip = normaliseIncrementalSkip(maybeConfig.incrementalSkip, absolutePath);
  const qualityGate = normaliseQualityGate(maybeConfig.qualityGate, absolutePath);
  const baselineCompare = normaliseBaselineCompare(maybeConfig.baselineCompare, absolutePath);
  const qualityPack = normaliseQualityPack(maybeConfig.qualityPack, absolutePath);
  return {
    baseUrl,
    query,
    buildId,
    chromePort,
    runs,
    auditTimeoutMs,
    gitIgnoreSignalerDir,
    logLevel,
    throttlingMethod,
    cpuSlowdownMultiplier,
    parallel,
    sessionIsolation,
    throughputBackoff,
    warmUp,
    incremental,
    pages,
    budgets,
    routes,
    incrementalSkip,
    qualityGate,
    baselineCompare,
    qualityPack,
  };
}

function normaliseQualityPack(
  value: unknown,
  absolutePath: string,
): ApexConfig["qualityPack"] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "object") {
    throw new Error(`Invalid config at ${absolutePath}: qualityPack must be an object`);
  }
  const record = value as Record<string, unknown>;
  const readNonNegative = (key: string, source: Record<string, unknown> = record, prefix = "qualityPack"): number | undefined => {
    const raw = source[key];
    if (raw === undefined) {
      return undefined;
    }
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
      throw new Error(`Invalid config at ${absolutePath}: ${prefix}.${key} must be a non-negative number`);
    }
    return raw;
  };
  const readBoolean = (key: string, source: Record<string, unknown>, prefix: string): boolean | undefined => {
    const raw = source[key];
    if (raw === undefined) {
      return undefined;
    }
    if (typeof raw !== "boolean") {
      throw new Error(`Invalid config at ${absolutePath}: ${prefix}.${key} must be a boolean`);
    }
    return raw;
  };
  const readFamilyLimits = (key: string, source: Record<string, unknown>, prefix: string) => {
    const raw = source[key];
    if (raw === undefined || raw === null) {
      return undefined;
    }
    if (typeof raw !== "object") {
      throw new Error(`Invalid config at ${absolutePath}: ${prefix}.${key} must be an object`);
    }
    const family = raw as Record<string, unknown>;
    const familyPrefix = `${prefix}.${key}`;
    return {
      maxRecords: readNonNegative("maxRecords", family, familyPrefix),
      maxMissingHeaders: readNonNegative("maxMissingHeaders", family, familyPrefix),
      maxTlsConfigIssues: readNonNegative("maxTlsConfigIssues", family, familyPrefix),
      maxCriticalViolations: readNonNegative("maxCriticalViolations", family, familyPrefix),
      maxSeriousViolations: readNonNegative("maxSeriousViolations", family, familyPrefix),
      maxHighLatencyRoutes: readNonNegative("maxHighLatencyRoutes", family, familyPrefix),
      maxIndexabilityIssues: readNonNegative("maxIndexabilityIssues", family, familyPrefix),
      maxCrawlabilityIssues: readNonNegative("maxCrawlabilityIssues", family, familyPrefix),
    };
  };

  let benchmarkSignals: NonNullable<ApexConfig["qualityPack"]>["benchmarkSignals"];
  const benchmarkRaw = record.benchmarkSignals;
  if (benchmarkRaw !== undefined && benchmarkRaw !== null) {
    if (typeof benchmarkRaw !== "object") {
      throw new Error(`Invalid config at ${absolutePath}: qualityPack.benchmarkSignals must be an object`);
    }
    const benchmarkRecord = benchmarkRaw as Record<string, unknown>;
    benchmarkSignals = {
      enabled: readBoolean("enabled", benchmarkRecord, "qualityPack.benchmarkSignals"),
      requireBridge: readBoolean("requireBridge", benchmarkRecord, "qualityPack.benchmarkSignals"),
      highLatencyMs: readNonNegative("highLatencyMs", benchmarkRecord, "qualityPack.benchmarkSignals"),
      securityBaseline: readFamilyLimits("securityBaseline", benchmarkRecord, "qualityPack.benchmarkSignals"),
      accessibilityExtended: readFamilyLimits("accessibilityExtended", benchmarkRecord, "qualityPack.benchmarkSignals"),
      reliabilitySlo: readFamilyLimits("reliabilitySlo", benchmarkRecord, "qualityPack.benchmarkSignals"),
      seoTechnical: readFamilyLimits("seoTechnical", benchmarkRecord, "qualityPack.benchmarkSignals"),
    };
  }

  return {
    maxHeaderFailures: readNonNegative("maxHeaderFailures"),
    maxBrokenLinks: readNonNegative("maxBrokenLinks"),
    maxHealthErrors: readNonNegative("maxHealthErrors"),
    maxConsoleErrorCombos: readNonNegative("maxConsoleErrorCombos"),
    maxMeasureRuntimeErrors: readNonNegative("maxMeasureRuntimeErrors"),
    maxAccessibilityCriticalViolations: readNonNegative("maxAccessibilityCriticalViolations"),
    maxAccessibilitySeriousViolations: readNonNegative("maxAccessibilitySeriousViolations"),
    maxAccessibilityRuntimeErrors: readNonNegative("maxAccessibilityRuntimeErrors"),
    ...(benchmarkSignals !== undefined ? { benchmarkSignals } : {}),
  };
}

function normaliseBaselineCompare(
  value: unknown,
  absolutePath: string,
): ApexConfig["baselineCompare"] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid config at ${absolutePath}: baselineCompare must be an object`);
  }
  const record = value as {
    readonly enabled?: unknown;
    readonly baselineDir?: unknown;
    readonly maxRedIncrease?: unknown;
    readonly maxActionableIncrease?: unknown;
    readonly requireComparabilityMatch?: unknown;
    readonly failOnIncomparable?: unknown;
    readonly benchmarkFamilies?: unknown;
    readonly qualityPack?: unknown;
  };
  const readNonNegativeInt = (field: keyof typeof record, label: string): number | undefined => {
    const raw = record[field];
    if (raw === undefined) {
      return undefined;
    }
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
      throw new Error(`Invalid config at ${absolutePath}: baselineCompare.${label} must be a non-negative number`);
    }
    return Math.floor(raw);
  };
  const readNestedLimits = (prefix: string, raw: unknown) => {
    if (raw === undefined || raw === null) {
      return undefined;
    }
    if (typeof raw !== "object") {
      throw new Error(`Invalid config at ${absolutePath}: baselineCompare.${prefix} must be an object`);
    }
    const nested = raw as Record<string, unknown>;
    const readNestedNonNegative = (key: string): number | undefined => {
      const value = nested[key];
      if (value === undefined) {
        return undefined;
      }
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid config at ${absolutePath}: baselineCompare.${prefix}.${key} must be a non-negative number`);
      }
      return Math.floor(value);
    };
    const readNestedBoolean = (key: string): boolean | undefined => {
      const value = nested[key];
      if (value === undefined) {
        return undefined;
      }
      if (typeof value !== "boolean") {
        throw new Error(`Invalid config at ${absolutePath}: baselineCompare.${prefix}.${key} must be a boolean`);
      }
      return value;
    };
    return {
      enabled: readNestedBoolean("enabled"),
      maxRecordIncrease: readNestedNonNegative("maxRecordIncrease"),
      maxHeaderFailureIncrease: readNestedNonNegative("maxHeaderFailureIncrease"),
      maxBrokenLinkIncrease: readNestedNonNegative("maxBrokenLinkIncrease"),
      maxHealthErrorIncrease: readNestedNonNegative("maxHealthErrorIncrease"),
      maxConsoleErrorComboIncrease: readNestedNonNegative("maxConsoleErrorComboIncrease"),
      maxAccessibilityCriticalIncrease: readNestedNonNegative("maxAccessibilityCriticalIncrease"),
      maxAccessibilitySeriousIncrease: readNestedNonNegative("maxAccessibilitySeriousIncrease"),
    };
  };
  const benchmarkFamiliesRaw = readNestedLimits("benchmarkFamilies", record.benchmarkFamilies);
  const qualityPackRaw = readNestedLimits("qualityPack", record.qualityPack);
  const benchmarkFamilies =
    benchmarkFamiliesRaw === undefined
      ? undefined
      : {
          enabled: benchmarkFamiliesRaw.enabled,
          maxRecordIncrease: benchmarkFamiliesRaw.maxRecordIncrease,
        };
  const qualityPack =
    qualityPackRaw === undefined
      ? undefined
      : {
          enabled: qualityPackRaw.enabled,
          maxHeaderFailureIncrease: qualityPackRaw.maxHeaderFailureIncrease,
          maxBrokenLinkIncrease: qualityPackRaw.maxBrokenLinkIncrease,
          maxHealthErrorIncrease: qualityPackRaw.maxHealthErrorIncrease,
          maxConsoleErrorComboIncrease: qualityPackRaw.maxConsoleErrorComboIncrease,
          maxAccessibilityCriticalIncrease: qualityPackRaw.maxAccessibilityCriticalIncrease,
          maxAccessibilitySeriousIncrease: qualityPackRaw.maxAccessibilitySeriousIncrease,
        };
  const baselineDir =
    typeof record.baselineDir === "string" && record.baselineDir.trim().length > 0
      ? record.baselineDir.trim()
      : undefined;
  const gate = {
    enabled: typeof record.enabled === "boolean" ? record.enabled : undefined,
    baselineDir,
    maxRedIncrease: readNonNegativeInt("maxRedIncrease", "maxRedIncrease"),
    maxActionableIncrease: readNonNegativeInt("maxActionableIncrease", "maxActionableIncrease"),
    requireComparabilityMatch:
      typeof record.requireComparabilityMatch === "boolean" ? record.requireComparabilityMatch : undefined,
    failOnIncomparable:
      typeof record.failOnIncomparable === "boolean" ? record.failOnIncomparable : undefined,
    ...(benchmarkFamilies !== undefined ? { benchmarkFamilies } : {}),
    ...(qualityPack !== undefined ? { qualityPack } : {}),
  };
  if (
    gate.enabled === undefined
    && gate.baselineDir === undefined
    && gate.maxRedIncrease === undefined
    && gate.maxActionableIncrease === undefined
    && gate.requireComparabilityMatch === undefined
    && gate.failOnIncomparable === undefined
    && gate.benchmarkFamilies === undefined
    && gate.qualityPack === undefined
  ) {
    return undefined;
  }
  return gate;
}

function normaliseQualityGate(
  value: unknown,
  absolutePath: string,
): ApexConfig["qualityGate"] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid config at ${absolutePath}: qualityGate must be an object`);
  }
  const record = value as {
    readonly enabled?: unknown;
    readonly maxRedPerfIssues?: unknown;
    readonly maxUniqueRedIssues?: unknown;
    readonly minCategoryScores?: unknown;
    readonly requireHeadersPass?: unknown;
  };
  const readNonNegativeInt = (field: keyof typeof record, label: string): number | undefined => {
    const raw = record[field];
    if (raw === undefined) {
      return undefined;
    }
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
      throw new Error(`Invalid config at ${absolutePath}: qualityGate.${label} must be a non-negative number`);
    }
    return Math.floor(raw);
  };
  let minCategoryScores: CategoryBudgetThresholds | undefined;
  if (record.minCategoryScores !== undefined) {
    const budgets = normaliseBudgets({ categories: record.minCategoryScores }, absolutePath);
    minCategoryScores = budgets?.categories;
  }
  const gate = {
    enabled: typeof record.enabled === "boolean" ? record.enabled : undefined,
    maxRedPerfIssues: readNonNegativeInt("maxRedPerfIssues", "maxRedPerfIssues"),
    maxUniqueRedIssues: readNonNegativeInt("maxUniqueRedIssues", "maxUniqueRedIssues"),
    ...(minCategoryScores !== undefined ? { minCategoryScores } : {}),
    requireHeadersPass:
      typeof record.requireHeadersPass === "boolean" ? record.requireHeadersPass : undefined,
  };
  if (
    gate.enabled === undefined
    && gate.maxRedPerfIssues === undefined
    && gate.maxUniqueRedIssues === undefined
    && gate.minCategoryScores === undefined
    && gate.requireHeadersPass === undefined
  ) {
    return undefined;
  }
  return gate;
}

function normaliseStringArray(value: unknown, field: string, absolutePath: string): readonly string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error(`Invalid config at ${absolutePath}: ${field} must be an array of strings`);
  }
  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new Error(`Invalid config at ${absolutePath}: ${field}[${index}] must be a non-empty string`);
    }
    return entry.trim();
  });
}

function normaliseRouteListFilter(
  value: unknown,
  absolutePath: string,
): ApexConfig["routes"] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid config at ${absolutePath}: routes must be an object`);
  }
  const record = value as { readonly includePaths?: unknown; readonly excludePaths?: unknown };
  const includePaths = normaliseStringArray(record.includePaths, "routes.includePaths", absolutePath);
  const excludePaths = normaliseStringArray(record.excludePaths, "routes.excludePaths", absolutePath);
  if (!includePaths?.length && !excludePaths?.length) {
    return undefined;
  }
  return { includePaths, excludePaths };
}

function normaliseIncrementalSkip(
  value: unknown,
  absolutePath: string,
): ApexConfig["incrementalSkip"] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid config at ${absolutePath}: incrementalSkip must be an object`);
  }
  const record = value as {
    readonly enabled?: unknown;
    readonly minPerformanceScore?: unknown;
    readonly minAccessibilityScore?: unknown;
    readonly minBestPracticesScore?: unknown;
    readonly minSeoScore?: unknown;
    readonly maxFailedAudits?: unknown;
    readonly requireNoRuntimeErrors?: unknown;
  };
  const readScore = (field: keyof typeof record, label: string): number | undefined => {
    const raw = record[field];
    if (raw === undefined) {
      return undefined;
    }
    if (typeof raw !== "number" || raw < 0 || raw > 100) {
      throw new Error(`Invalid config at ${absolutePath}: incrementalSkip.${label} must be 0-100`);
    }
    return raw;
  };
  return {
    enabled: typeof record.enabled === "boolean" ? record.enabled : undefined,
    minPerformanceScore: readScore("minPerformanceScore", "minPerformanceScore"),
    minAccessibilityScore: readScore("minAccessibilityScore", "minAccessibilityScore"),
    minBestPracticesScore: readScore("minBestPracticesScore", "minBestPracticesScore"),
    minSeoScore: readScore("minSeoScore", "minSeoScore"),
    maxFailedAudits:
      typeof record.maxFailedAudits === "number" && record.maxFailedAudits >= 0
        ? Math.floor(record.maxFailedAudits)
        : undefined,
    requireNoRuntimeErrors:
      typeof record.requireNoRuntimeErrors === "boolean" ? record.requireNoRuntimeErrors : undefined,
  };
}

function normalisePage(page: unknown, index: number, absolutePath: string) {
  if (!page || typeof page !== "object") {
    throw new Error(`Invalid page at index ${index} in ${absolutePath}: expected object`);
  }
  const maybePage = page as {
    readonly path?: unknown;
    readonly label?: unknown;
    readonly devices?: unknown;
    readonly scope?: unknown;
  };
  if (typeof maybePage.path !== "string" || !maybePage.path.startsWith("/")) {
    throw new Error(`Invalid page at index ${index} in ${absolutePath}: path must start with '/'`);
  }
  const label: string = typeof maybePage.label === "string" && maybePage.label.length > 0
    ? maybePage.label
    : maybePage.path;
  const devicesInput: unknown = maybePage.devices;
  const devices: ("mobile" | "desktop")[] = Array.isArray(devicesInput) && devicesInput.length > 0
    ? devicesInput.map((d, deviceIndex) => {
        if (d !== "mobile" && d !== "desktop") {
          throw new Error(`Invalid device at pages[${index}].devices[${deviceIndex}] in ${absolutePath}`);
        }
        return d;
      })
    : ["mobile"];
  const rawScope: unknown = maybePage.scope;
  const scope: ApexPageScope | undefined = rawScope === "public" || rawScope === "requires-auth" ? rawScope : undefined;
  return {
    path: maybePage.path,
    label,
    devices,
    scope,
  } as const;
}

function normaliseBudgets(input: unknown, absolutePath: string): ApexBudgets | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (!input || typeof input !== "object") {
    throw new Error(`Invalid budgets in ${absolutePath}: expected object`);
  }
  const maybeBudgets = input as {
    readonly categories?: unknown;
    readonly metrics?: unknown;
  };
  const categories: CategoryBudgetThresholds | undefined = normaliseCategoryBudgets(maybeBudgets.categories, absolutePath);
  const metrics: MetricBudgetThresholds | undefined = normaliseMetricBudgets(maybeBudgets.metrics, absolutePath);
  if (!categories && !metrics) {
    return undefined;
  }
  return {
    categories,
    metrics,
  };
}

function normaliseCategoryBudgets(input: unknown, absolutePath: string): CategoryBudgetThresholds | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (!input || typeof input !== "object") {
    throw new Error(`Invalid budgets.categories in ${absolutePath}: expected object`);
  }
  const maybeCategories = input as {
    readonly performance?: unknown;
    readonly accessibility?: unknown;
    readonly bestPractices?: unknown;
    readonly seo?: unknown;
  };
  const performance: number | undefined = normaliseScoreBudget(maybeCategories.performance, "performance", absolutePath);
  const accessibility: number | undefined = normaliseScoreBudget(maybeCategories.accessibility, "accessibility", absolutePath);
  const bestPractices: number | undefined = normaliseScoreBudget(maybeCategories.bestPractices, "bestPractices", absolutePath);
  const seo: number | undefined = normaliseScoreBudget(maybeCategories.seo, "seo", absolutePath);
  if (
    performance === undefined &&
    accessibility === undefined &&
    bestPractices === undefined &&
    seo === undefined
  ) {
    return undefined;
  }
  return {
    performance,
    accessibility,
    bestPractices,
    seo,
  };
}

function normaliseMetricBudgets(input: unknown, absolutePath: string): MetricBudgetThresholds | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (!input || typeof input !== "object") {
    throw new Error(`Invalid budgets.metrics in ${absolutePath}: expected object`);
  }
  const maybeMetrics = input as {
    readonly lcpMs?: unknown;
    readonly fcpMs?: unknown;
    readonly tbtMs?: unknown;
    readonly cls?: unknown;
    readonly inpMs?: unknown;
  };
  const lcpMs: number | undefined = normaliseMetricBudget(maybeMetrics.lcpMs, "lcpMs", absolutePath);
  const fcpMs: number | undefined = normaliseMetricBudget(maybeMetrics.fcpMs, "fcpMs", absolutePath);
  const tbtMs: number | undefined = normaliseMetricBudget(maybeMetrics.tbtMs, "tbtMs", absolutePath);
  const cls: number | undefined = normaliseMetricBudget(maybeMetrics.cls, "cls", absolutePath);
  const inpMs: number | undefined = normaliseMetricBudget(maybeMetrics.inpMs, "inpMs", absolutePath);
  if (lcpMs === undefined && fcpMs === undefined && tbtMs === undefined && cls === undefined && inpMs === undefined) {
    return undefined;
  }
  return {
    lcpMs,
    fcpMs,
    tbtMs,
    cls,
    inpMs,
  };
}

function normaliseScoreBudget(value: unknown, key: string, absolutePath: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || value < 0 || value > 100) {
    throw new Error(
      `Invalid budgets.categories.${key} in ${absolutePath}: expected number between 0 and 100`,
    );
  }
  return value;
}

function normaliseMetricBudget(value: unknown, key: string, absolutePath: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || value < 0) {
    throw new Error(
      `Invalid budgets.metrics.${key} in ${absolutePath}: expected non-negative number`,
    );
  }
  return value;
}
