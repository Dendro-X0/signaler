import type { ApexBudgets, CategoryBudgetThresholds, MetricBudgetThresholds, PageDeviceSummary } from "./types.js";

export interface PerformanceBudgetConfig {
  readonly categories?: CategoryBudgetThresholds;
  readonly metrics?: MetricBudgetThresholds;
  readonly failureThreshold?: "any" | "majority" | "all";
  readonly excludePages?: readonly string[];
  readonly includePages?: readonly string[];
}

export interface BudgetViolation {
  readonly pageLabel: string;
  readonly path: string;
  readonly device: "mobile" | "desktop";
  readonly kind: "category" | "metric";
  readonly id: string;
  readonly value: number;
  readonly limit: number;
  readonly severity: "critical" | "warning";
}

export interface BudgetResult {
  readonly passed: boolean;
  readonly violations: readonly BudgetViolation[];
  readonly summary: {
    readonly totalPages: number;
    readonly failedPages: number;
    readonly criticalViolations: number;
    readonly warningViolations: number;
  };
}

export class PerformanceBudgetManager {
  constructor(private readonly config: PerformanceBudgetConfig) {}

  /**
   * Evaluate performance results against configured budgets
   */
  evaluateBudgets(results: readonly PageDeviceSummary[]): BudgetResult {
    const filteredResults = this.filterResults(results);
    const violations: BudgetViolation[] = [];

    for (const result of filteredResults) {
      if (this.config.categories) {
        violations.push(...this.checkCategoryBudgets(result, this.config.categories));
      }
      if (this.config.metrics) {
        violations.push(...this.checkMetricBudgets(result, this.config.metrics));
      }
    }

    const criticalViolations = violations.filter(v => v.severity === "critical").length;
    const warningViolations = violations.filter(v => v.severity === "warning").length;
    const failedPages = new Set(violations.map(v => `${v.path}|${v.device}`)).size;

    const passed = this.determineBudgetPassed(violations, filteredResults.length);

    return {
      passed,
      violations,
      summary: {
        totalPages: filteredResults.length,
        failedPages,
        criticalViolations,
        warningViolations,
      },
    };
  }

  /**
   * Generate appropriate exit code based on budget results
   */
  getExitCode(budgetResult: BudgetResult, ciMode: boolean, failOnBudget: boolean): number {
    if (!ciMode && !failOnBudget) {
      return 0;
    }

    if (!budgetResult.passed) {
      return 1; // Budget violations detected
    }

    return 0; // All budgets passed
  }

  /**
   * Create performance budget configuration from legacy ApexBudgets
   */
  static fromApexBudgets(budgets: ApexBudgets): PerformanceBudgetConfig {
    return {
      categories: budgets.categories,
      metrics: budgets.metrics,
      failureThreshold: "any", // Default to fail on any violation
    };
  }

  private filterResults(results: readonly PageDeviceSummary[]): readonly PageDeviceSummary[] {
    let filtered = [...results];

    // Apply include filter if specified
    if (this.config.includePages && this.config.includePages.length > 0) {
      filtered = filtered.filter(result => 
        this.config.includePages!.some(pattern => 
          result.path.includes(pattern) || result.label.includes(pattern)
        )
      );
    }

    // Apply exclude filter if specified
    if (this.config.excludePages && this.config.excludePages.length > 0) {
      filtered = filtered.filter(result => 
        !this.config.excludePages!.some(pattern => 
          result.path.includes(pattern) || result.label.includes(pattern)
        )
      );
    }

    return filtered;
  }

  private checkCategoryBudgets(
    result: PageDeviceSummary,
    categories: CategoryBudgetThresholds
  ): BudgetViolation[] {
    const violations: BudgetViolation[] = [];
    const scores = result.scores;

    this.checkCategoryScore("performance", scores.performance, categories.performance, result, violations);
    this.checkCategoryScore("accessibility", scores.accessibility, categories.accessibility, result, violations);
    this.checkCategoryScore("bestPractices", scores.bestPractices, categories.bestPractices, result, violations);
    this.checkCategoryScore("seo", scores.seo, categories.seo, result, violations);

    return violations;
  }

  private checkCategoryScore(
    id: string,
    actual: number | undefined,
    limit: number | undefined,
    result: PageDeviceSummary,
    violations: BudgetViolation[]
  ): void {
    if (limit === undefined || actual === undefined) {
      return;
    }

    if (actual < limit) {
      violations.push({
        pageLabel: result.label,
        path: result.path,
        device: result.device,
        kind: "category",
        id,
        value: actual,
        limit,
        severity: this.getCategorySeverity(id, actual, limit),
      });
    }
  }

  private checkMetricBudgets(
    result: PageDeviceSummary,
    metrics: MetricBudgetThresholds
  ): BudgetViolation[] {
    const violations: BudgetViolation[] = [];
    const resultMetrics = result.metrics;

    this.checkMetricValue("lcpMs", resultMetrics.lcpMs, metrics.lcpMs, result, violations);
    this.checkMetricValue("fcpMs", resultMetrics.fcpMs, metrics.fcpMs, result, violations);
    this.checkMetricValue("tbtMs", resultMetrics.tbtMs, metrics.tbtMs, result, violations);
    this.checkMetricValue("cls", resultMetrics.cls, metrics.cls, result, violations);
    this.checkMetricValue("inpMs", resultMetrics.inpMs, metrics.inpMs, result, violations);

    return violations;
  }

  private checkMetricValue(
    id: string,
    actual: number | undefined,
    limit: number | undefined,
    result: PageDeviceSummary,
    violations: BudgetViolation[]
  ): void {
    if (limit === undefined || actual === undefined) {
      return;
    }

    if (actual > limit) {
      violations.push({
        pageLabel: result.label,
        path: result.path,
        device: result.device,
        kind: "metric",
        id,
        value: actual,
        limit,
        severity: this.getMetricSeverity(id, actual, limit),
      });
    }
  }

  private getCategorySeverity(id: string, actual: number, limit: number): "critical" | "warning" {
    const difference = limit - actual;
    
    // Performance scores below 50 are critical, others are warnings
    if (id === "performance" && actual < 50) {
      return "critical";
    }
    
    // Large differences (>20 points) are critical
    if (difference > 20) {
      return "critical";
    }
    
    return "warning";
  }

  private getMetricSeverity(id: string, actual: number, limit: number): "critical" | "warning" {
    const ratio = actual / limit;
    
    // Core Web Vitals thresholds for critical severity
    if (id === "lcpMs" && actual > 4000) return "critical";
    if (id === "fcpMs" && actual > 3000) return "critical";
    if (id === "tbtMs" && actual > 600) return "critical";
    if (id === "cls" && actual > 0.25) return "critical";
    if (id === "inpMs" && actual > 500) return "critical";
    
    // If actual is more than 50% over limit, it's critical
    if (ratio > 1.5) {
      return "critical";
    }
    
    return "warning";
  }

  private determineBudgetPassed(violations: readonly BudgetViolation[], totalPages: number): boolean {
    const failureThreshold = this.config.failureThreshold ?? "any";
    const failedPages = new Set(violations.map(v => `${v.path}|${v.device}`)).size;
    
    switch (failureThreshold) {
      case "any":
        return violations.length === 0;
      case "majority":
        return failedPages < Math.ceil(totalPages / 2);
      case "all":
        return failedPages < totalPages;
      default:
        return violations.length === 0;
    }
  }
}

/**
 * Enhanced budget configuration with CI/CD specific settings
 */
export interface CIBudgetConfig extends PerformanceBudgetConfig {
  readonly exitOnFailure?: boolean;
  readonly reportFormat?: "console" | "json" | "junit";
  readonly outputFile?: string;
  readonly webhookUrl?: string;
  readonly webhookRetries?: number;
  readonly webhookTimeout?: number;
}

/**
 * CI/CD platform specific configuration
 */
export interface CIPlatformConfig {
  readonly github?: {
    readonly commentOnPR?: boolean;
    readonly failOnRegression?: boolean;
    readonly artifactPath?: string;
  };
  readonly gitlab?: {
    readonly mergeRequestNotes?: boolean;
    readonly artifactReports?: boolean;
  };
  readonly jenkins?: {
    readonly publishResults?: boolean;
    readonly archiveArtifacts?: boolean;
  };
}

/**
 * Enhanced performance budget configuration for CI/CD integration
 */
export interface EnhancedBudgetConfig extends CIBudgetConfig {
  readonly platform?: CIPlatformConfig;
  readonly thresholds?: {
    readonly warningThreshold?: number; // Percentage of pages that can fail before warning
    readonly errorThreshold?: number;   // Percentage of pages that can fail before error
  };
}

/**
 * Generate CI-friendly budget report
 */
export function generateCIBudgetReport(
  budgetResult: BudgetResult,
  format: "console" | "json" | "junit" = "console"
): string {
  switch (format) {
    case "json":
      return JSON.stringify({
        passed: budgetResult.passed,
        summary: budgetResult.summary,
        violations: budgetResult.violations.map(v => ({
          page: `${v.pageLabel} (${v.path})`,
          device: v.device,
          type: `${v.kind}:${v.id}`,
          actual: v.value,
          limit: v.limit,
          severity: v.severity,
        })),
        timestamp: new Date().toISOString(),
        version: "1.0",
      }, null, 2);
      
    case "junit":
      return generateJUnitReport(budgetResult);
      
    case "console":
    default:
      return generateConsoleReport(budgetResult);
  }
}

/**
 * Send budget results to webhook with retry logic
 */
export async function sendBudgetWebhook(
  budgetResult: BudgetResult,
  config: {
    readonly url: string;
    readonly retries?: number;
    readonly timeout?: number;
    readonly headers?: Record<string, string>;
  }
): Promise<void> {
  const maxRetries = config.retries ?? 3;
  const timeout = config.timeout ?? 10000;
  
  const payload = {
    passed: budgetResult.passed,
    summary: budgetResult.summary,
    violations: budgetResult.violations,
    timestamp: new Date().toISOString(),
    source: "signaler-performance-budget",
    version: "1.0",
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Signaler-Performance-Budget/1.0',
        ...config.headers,
      };
      
      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return; // Success
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Failed to send webhook after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Validate webhook URL format
 */
export function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Create webhook payload for monitoring systems
 */
export function createMonitoringPayload(
  budgetResult: BudgetResult,
  metadata?: {
    readonly projectName?: string;
    readonly buildId?: string;
    readonly branch?: string;
    readonly commitSha?: string;
  }
): Record<string, unknown> {
  return {
    // Standard monitoring fields
    status: budgetResult.passed ? 'success' : 'failure',
    message: budgetResult.passed 
      ? 'All performance budgets passed' 
      : `${budgetResult.summary.criticalViolations} critical violations, ${budgetResult.summary.warningViolations} warnings`,
    
    // Detailed budget information
    budget: {
      passed: budgetResult.passed,
      summary: budgetResult.summary,
      violations: budgetResult.violations.map(v => ({
        page: v.pageLabel,
        path: v.path,
        device: v.device,
        metric: `${v.kind}:${v.id}`,
        actual: v.value,
        limit: v.limit,
        severity: v.severity,
        overagePercent: Math.round(((v.value - v.limit) / v.limit) * 100)
      }))
    },
    
    // Metadata
    timestamp: new Date().toISOString(),
    source: 'signaler-performance-budget',
    version: '1.0',
    ...metadata,
    
    // Metrics for monitoring dashboards
    metrics: {
      total_pages: budgetResult.summary.totalPages,
      failed_pages: budgetResult.summary.failedPages,
      critical_violations: budgetResult.summary.criticalViolations,
      warning_violations: budgetResult.summary.warningViolations,
      success_rate: budgetResult.summary.totalPages > 0 
        ? Math.round(((budgetResult.summary.totalPages - budgetResult.summary.failedPages) / budgetResult.summary.totalPages) * 100)
        : 100
    }
  };
}

function generateConsoleReport(budgetResult: BudgetResult): string {
  const lines: string[] = [];
  
  if (budgetResult.passed) {
    lines.push("✅ Performance budgets PASSED");
  } else {
    lines.push("❌ Performance budgets FAILED");
    lines.push(`   ${budgetResult.summary.criticalViolations} critical, ${budgetResult.summary.warningViolations} warning violations`);
    lines.push(`   ${budgetResult.summary.failedPages}/${budgetResult.summary.totalPages} pages affected`);
  }
  
  if (budgetResult.violations.length > 0) {
    lines.push("");
    lines.push("Violations:");
    for (const violation of budgetResult.violations) {
      const severity = violation.severity === "critical" ? "🔴" : "🟡";
      const value = violation.kind === "metric" ? `${Math.round(violation.value)}ms` : Math.round(violation.value).toString();
      const limit = violation.kind === "metric" ? `${Math.round(violation.limit)}ms` : Math.round(violation.limit).toString();
      lines.push(`  ${severity} ${violation.pageLabel} [${violation.device}] ${violation.id}: ${value} > ${limit}`);
    }
  }
  
  return lines.join("\n");
}

function generateJUnitReport(budgetResult: BudgetResult): string {
  const testCases = budgetResult.violations.map(violation => {
    const testName = `${violation.pageLabel}_${violation.device}_${violation.id}`;
    const className = `PerformanceBudget.${violation.kind}`;
    
    if (violation.severity === "critical") {
      return `    <testcase name="${testName}" classname="${className}">
      <failure message="Budget violation: ${violation.value} > ${violation.limit}">
        Page: ${violation.pageLabel} (${violation.path})
        Device: ${violation.device}
        Metric: ${violation.id}
        Actual: ${violation.value}
        Limit: ${violation.limit}
      </failure>
    </testcase>`;
    } else {
      return `    <testcase name="${testName}" classname="${className}">
      <error message="Budget warning: ${violation.value} > ${violation.limit}">
        Page: ${violation.pageLabel} (${violation.path})
        Device: ${violation.device}
        Metric: ${violation.id}
        Actual: ${violation.value}
        Limit: ${violation.limit}
      </error>
    </testcase>`;
    }
  });
  
  const totalTests = budgetResult.summary.totalPages;
  const failures = budgetResult.summary.criticalViolations;
  const errors = budgetResult.summary.warningViolations;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="PerformanceBudgets" tests="${totalTests}" failures="${failures}" errors="${errors}">
${testCases.join("\n")}
</testsuite>`;
}

/**
 * Generate GitHub Actions compatible output
 */
export function generateGitHubActionsReport(budgetResult: BudgetResult): string {
  const lines: string[] = [];
  
  if (budgetResult.passed) {
    lines.push("::notice title=Performance Budget::All performance budgets passed ✅");
  } else {
    lines.push(`::error title=Performance Budget::${budgetResult.summary.criticalViolations} critical violations, ${budgetResult.summary.warningViolations} warnings`);
    
    // Add individual violations as annotations
    for (const violation of budgetResult.violations) {
      const level = violation.severity === "critical" ? "error" : "warning";
      const message = `${violation.pageLabel} [${violation.device}] ${violation.id}: ${violation.value} > ${violation.limit}`;
      lines.push(`::${level} title=Budget Violation::${message}`);
    }
  }
  
  // Set output variables for use in other steps
  lines.push(`::set-output name=budget-passed::${budgetResult.passed}`);
  lines.push(`::set-output name=critical-violations::${budgetResult.summary.criticalViolations}`);
  lines.push(`::set-output name=warning-violations::${budgetResult.summary.warningViolations}`);
  lines.push(`::set-output name=failed-pages::${budgetResult.summary.failedPages}`);
  
  return lines.join("\n");
}

/**
 * Generate GitLab CI compatible output
 */
export function generateGitLabCIReport(budgetResult: BudgetResult): string {
  const report = {
    version: "1.0.0",
    success: budgetResult.passed,
    summary: {
      total: budgetResult.summary.totalPages,
      failed: budgetResult.summary.failedPages,
      critical: budgetResult.summary.criticalViolations,
      warnings: budgetResult.summary.warningViolations,
    },
    violations: budgetResult.violations.map(v => ({
      severity: v.severity,
      page: v.pageLabel,
      path: v.path,
      device: v.device,
      metric: `${v.kind}:${v.id}`,
      actual: v.value,
      limit: v.limit,
    })),
  };
  
  return JSON.stringify(report, null, 2);
}

/**
 * Generate Jenkins compatible output
 */
export function generateJenkinsReport(budgetResult: BudgetResult): {
  readonly junit: string;
  readonly properties: string;
} {
  const junit = generateJUnitReport(budgetResult);
  
  const properties = [
    `budget.passed=${budgetResult.passed}`,
    `budget.total.pages=${budgetResult.summary.totalPages}`,
    `budget.failed.pages=${budgetResult.summary.failedPages}`,
    `budget.critical.violations=${budgetResult.summary.criticalViolations}`,
    `budget.warning.violations=${budgetResult.summary.warningViolations}`,
  ].join("\n");
  
  return { junit, properties };
}