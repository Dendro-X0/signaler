import { relative, resolve } from "node:path";
import type { AxeSummary, AxeViolation } from "./accessibility-types.js";
import type { MultiBenchmarkSignalsFileV1 } from "./contracts/multi-benchmark-v1.js";

type IssuesLike = {
  readonly topIssues?: readonly { readonly id?: unknown }[];
  readonly failing?: readonly {
    readonly path?: unknown;
    readonly topOpportunities?: readonly { readonly id?: unknown }[];
  }[];
};

export type AccessibilityBenchmarkIssueMapping = {
  readonly defaultIssueId?: string;
  readonly routeIssueIdByPath: Readonly<Record<string, string>>;
};

export type BuildAccessibilityBenchmarkSignalsParams = {
  readonly summary: AxeSummary;
  readonly sourceRelPath: string;
  readonly collectedAt?: string;
  readonly confidence?: "high" | "medium" | "low";
  readonly defaultIssueId?: string;
  readonly routeIssueIdByPath?: Readonly<Record<string, string>>;
  readonly minViolationNodes?: number;
};

const APG_RULE_HINTS: readonly RegExp[] = [
  /^aria-required-parent$/,
  /^aria-required-children$/,
  /^aria-allowed-attr$/,
  /^aria-allowed-role$/,
  /^aria-roles$/,
  /^aria-valid-attr$/,
  /^aria-valid-attr-value$/,
  /^aria-input-field-name$/,
  /^aria-hidden-focus$/,
  /^nested-interactive$/,
  /^presentation-role-conflict$/,
] as const;

const FOCUS_APPEARANCE_HINTS: readonly RegExp[] = [
  /^focus-visible$/,
  /^focus-indicator$/,
  /^focus-appearance$/,
] as const;

const FOCUS_NOT_OBSCURED_HINTS: readonly RegExp[] = [
  /^focus-not-obscured$/,
  /^focus-obscured$/,
] as const;

const TARGET_SIZE_HINTS: readonly RegExp[] = [
  /^target-size$/,
  /^tap-target$/,
] as const;

const DRAGGING_HINTS: readonly RegExp[] = [
  /^dragging$/,
  /^dragging-movements$/,
] as const;

const KEYBOARD_HINTS: readonly RegExp[] = [
  /^keyboard$/,
  /^tabindex$/,
  /^accesskeys$/,
  /^aria-hidden-focus$/,
  /^focus-order-semantics$/,
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function normalizeIssueId(value: string): string {
  return value.trim();
}

function normalizeRuleId(value: string): string {
  return value.trim().toLowerCase();
}

function matchesAnyRule(ruleId: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(ruleId));
}

function countViolationWeight(violation: AxeViolation): number {
  const nodeCount: number = Array.isArray(violation.nodes) ? violation.nodes.length : 0;
  return Math.max(1, nodeCount);
}

function buildArtifactRelPath(pathname: string, device: "mobile" | "desktop"): string {
  const baseName: string = pathname.replace(/\//g, "_").replace(/^_/, "") || "page";
  return normalizePath(`accessibility/${baseName}_${device}_axe.json`);
}

function buildRecordId(pathname: string, device: "mobile" | "desktop", index: number): string {
  const normalizedPath: string = pathname
    .replace(/^\//, "")
    .replace(/\/+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();
  const safePath: string = normalizedPath.length > 0 ? normalizedPath : "root";
  return `a11y-${safePath}-${device}-${index + 1}`;
}

function toRelativeSourcePath(sourcePath: string): string {
  const resolvedSource: string = resolve(sourcePath);
  const rel: string = normalizePath(relative(process.cwd(), resolvedSource));
  if (rel.length === 0) return normalizePath(sourcePath);
  if (!rel.startsWith("..")) return rel;
  return normalizePath(sourcePath);
}

function assertIsoTimestamp(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid ${fieldName}: expected ISO timestamp.`);
  }
}

function assertAxeSummary(summary: unknown): AxeSummary {
  if (!isRecord(summary)) {
    throw new Error("Invalid accessibility summary: expected object.");
  }
  if (!isRecord(summary.meta)) {
    throw new Error("Invalid accessibility summary: meta is required.");
  }
  if (!isNonEmptyString(summary.meta.completedAt)) {
    throw new Error("Invalid accessibility summary: meta.completedAt is required.");
  }
  assertIsoTimestamp(summary.meta.completedAt, "meta.completedAt");
  if (!Array.isArray(summary.results)) {
    throw new Error("Invalid accessibility summary: results must be an array.");
  }
  for (const row of summary.results) {
    if (!isRecord(row)) {
      throw new Error("Invalid accessibility summary result: expected object.");
    }
    if (!isNonEmptyString(row.path)) {
      throw new Error("Invalid accessibility summary result.path.");
    }
    if (row.device !== "mobile" && row.device !== "desktop") {
      throw new Error("Invalid accessibility summary result.device.");
    }
    if (!Array.isArray(row.violations)) {
      throw new Error("Invalid accessibility summary result.violations.");
    }
    for (const violation of row.violations) {
      if (!isRecord(violation) || !isNonEmptyString(violation.id) || !Array.isArray(violation.nodes)) {
        throw new Error("Invalid accessibility summary violation.");
      }
    }
  }
  return summary as AxeSummary;
}

export function deriveIssueMappingFromIssuesJson(raw: unknown): AccessibilityBenchmarkIssueMapping {
  if (!isRecord(raw)) {
    return { routeIssueIdByPath: {} };
  }
  const issues = raw as IssuesLike;
  const routeIssueIdByPath: Record<string, string> = {};
  if (Array.isArray(issues.failing)) {
    for (const row of issues.failing) {
      if (!isRecord(row) || !isNonEmptyString(row.path) || !Array.isArray(row.topOpportunities)) {
        continue;
      }
      const top = row.topOpportunities.find((opportunity) => isRecord(opportunity) && isNonEmptyString(opportunity.id));
      if (!top || !isRecord(top) || !isNonEmptyString(top.id)) {
        continue;
      }
      routeIssueIdByPath[row.path] = normalizeIssueId(top.id);
    }
  }
  const defaultIssueId: string | undefined = Array.isArray(issues.topIssues)
    ? (() => {
      const first = issues.topIssues.find((row) => isRecord(row) && isNonEmptyString(row.id));
      return first && isRecord(first) && isNonEmptyString(first.id) ? normalizeIssueId(first.id) : undefined;
    })()
    : undefined;
  return {
    ...(defaultIssueId !== undefined ? { defaultIssueId } : {}),
    routeIssueIdByPath,
  };
}

function deriveMetrics(violations: readonly AxeViolation[]): NonNullable<MultiBenchmarkSignalsFileV1["sources"][number]["records"][number]["metrics"]> | undefined {
  let wcagViolationCount = 0;
  let seriousViolationCount = 0;
  let criticalViolationCount = 0;
  let ariaPatternMismatchCount = 0;
  let focusAppearanceIssueCount = 0;
  let focusNotObscuredIssueCount = 0;
  let targetSizeIssueCount = 0;
  let draggingAlternativeIssueCount = 0;
  let apgPatternMismatchCount = 0;
  let keyboardSupportIssueCount = 0;

  for (const violation of violations) {
    const weight: number = countViolationWeight(violation);
    const ruleId: string = normalizeRuleId(violation.id);
    const impact: string = typeof violation.impact === "string" ? violation.impact.toLowerCase() : "";

    wcagViolationCount += weight;
    if (impact === "serious") seriousViolationCount += weight;
    if (impact === "critical") criticalViolationCount += weight;
    if (ruleId.includes("aria")) ariaPatternMismatchCount += weight;
    if (matchesAnyRule(ruleId, FOCUS_APPEARANCE_HINTS)) focusAppearanceIssueCount += weight;
    if (matchesAnyRule(ruleId, FOCUS_NOT_OBSCURED_HINTS)) focusNotObscuredIssueCount += weight;
    if (matchesAnyRule(ruleId, TARGET_SIZE_HINTS)) targetSizeIssueCount += weight;
    if (matchesAnyRule(ruleId, DRAGGING_HINTS)) draggingAlternativeIssueCount += weight;
    if (matchesAnyRule(ruleId, APG_RULE_HINTS)) apgPatternMismatchCount += weight;
    if (matchesAnyRule(ruleId, KEYBOARD_HINTS)) keyboardSupportIssueCount += weight;
  }

  const metrics = {
    ...(wcagViolationCount > 0 ? { wcagViolationCount } : {}),
    ...(seriousViolationCount > 0 ? { seriousViolationCount } : {}),
    ...(criticalViolationCount > 0 ? { criticalViolationCount } : {}),
    ...(ariaPatternMismatchCount > 0 ? { ariaPatternMismatchCount } : {}),
    ...(focusAppearanceIssueCount > 0 ? { focusAppearanceIssueCount } : {}),
    ...(focusNotObscuredIssueCount > 0 ? { focusNotObscuredIssueCount } : {}),
    ...(targetSizeIssueCount > 0 ? { targetSizeIssueCount } : {}),
    ...(draggingAlternativeIssueCount > 0 ? { draggingAlternativeIssueCount } : {}),
    ...(apgPatternMismatchCount > 0 ? { apgPatternMismatchCount } : {}),
    ...(keyboardSupportIssueCount > 0 ? { keyboardSupportIssueCount } : {}),
  };
  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

export function buildAccessibilityBenchmarkSignalsFromSummary(params: BuildAccessibilityBenchmarkSignalsParams): MultiBenchmarkSignalsFileV1 {
  const summary: AxeSummary = assertAxeSummary(params.summary);
  const confidence: "high" | "medium" | "low" = params.confidence ?? "high";
  const minViolationNodes: number = Math.max(1, Math.floor(params.minViolationNodes ?? 1));
  const sourceRelPath: string = normalizePath(params.sourceRelPath);
  const collectedAt: string = params.collectedAt ?? summary.meta.completedAt;
  assertIsoTimestamp(collectedAt, "collectedAt");

  const routeIssueIdByPath: Readonly<Record<string, string>> = params.routeIssueIdByPath ?? {};
  const defaultIssueId: string | undefined = params.defaultIssueId;

  const records: MultiBenchmarkSignalsFileV1["sources"][number]["records"][number][] = [];
  for (let index = 0; index < summary.results.length; index += 1) {
    const result = summary.results[index];
    if (typeof result.runtimeErrorMessage === "string" && result.runtimeErrorMessage.length > 0) {
      continue;
    }

    const violationNodeCount: number = result.violations.reduce((total, violation) => total + countViolationWeight(violation), 0);
    if (violationNodeCount < minViolationNodes) {
      continue;
    }

    const mappedIssueId: string | undefined = routeIssueIdByPath[result.path] ?? defaultIssueId;
    if (!isNonEmptyString(mappedIssueId)) {
      throw new Error(`No issueId mapping found for path "${result.path}". Provide --default-issue-id or --issues mapping.`);
    }

    const metrics = deriveMetrics(result.violations);
    records.push({
      id: buildRecordId(result.path, result.device, index),
      target: {
        issueId: normalizeIssueId(mappedIssueId),
        path: result.path,
        device: result.device,
      },
      confidence,
      evidence: [
        {
          sourceRelPath,
          pointer: `/results/${index}`,
          artifactRelPath: buildArtifactRelPath(result.path, result.device),
        },
      ],
      ...(metrics !== undefined ? { metrics } : {}),
    });
  }

  return {
    schemaVersion: 1,
    sources: [
      {
        sourceId: "accessibility-extended",
        collectedAt,
        records,
      },
    ],
  };
}

export function resolveAccessibilitySummarySourcePath(inputPath: string): string {
  return toRelativeSourcePath(inputPath);
}
