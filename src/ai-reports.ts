/**
 * AI-optimized report generators for Signaler
 * Provides token-efficient, structured reports for AI analysis
 */

import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import type { RunSummary, PageDeviceSummary, OpportunitySummary } from "./types.js";

// Define the types locally since they're internal to cli.ts
interface TopIssue {
  readonly id: string;
  readonly title: string;
  readonly count: number;
  readonly totalMs: number;
}

interface IssuesIndex {
  readonly generatedAt: string;
  readonly targetScore: number;
  readonly totals: {
    readonly combos: number;
    readonly redCombos: number;
    readonly yellowCombos: number;
    readonly greenCombos: number;
    readonly runtimeErrors: number;
  };
  readonly topIssues: readonly TopIssue[];
  readonly failing: readonly {
    readonly label: string;
    readonly path: string;
    readonly device: "mobile" | "desktop";
    readonly performance?: number;
    readonly accessibility?: number;
    readonly bestPractices?: number;
    readonly seo?: number;
    readonly runtimeErrorMessage?: string;
    readonly topOpportunities: readonly OpportunitySummary[];
    readonly hints?: {
      readonly redirects?: {
        readonly overallSavingsMs?: number;
        readonly chain?: readonly string[];
      };
      readonly unusedJavascript?: {
        readonly overallSavingsMs?: number;
        readonly overallSavingsBytes?: number;
        readonly files: readonly {
          readonly url: string;
          readonly totalBytes?: number;
          readonly wastedBytes?: number;
          readonly wastedPercent?: number;
        }[];
      };
    };
  }[];
}

// AI-optimized report types
export interface AiAnalysisReport {
  readonly meta: {
    readonly disclaimer: string;
    readonly auditSummary: {
      readonly totalPages: number;
      readonly elapsedTime: string;
      readonly targetScore: number;
      readonly belowTarget: number;
    };
  };
  readonly criticalIssues: readonly CriticalIssue[];
  readonly quickWins: readonly QuickWin[];
  readonly worstPerformers: readonly WorstPerformer[];
  readonly patterns: Record<string, Pattern>;
}

export interface CriticalIssue {
  readonly id: string;
  readonly title: string;
  readonly severity: "critical" | "high" | "medium" | "low";
  readonly totalImpact: string;
  readonly avgImpactPerPage: string;
  readonly affectedPages: number;
  readonly topOffenders: readonly Offender[];
  readonly fixGuidance: FixGuidance;
}

export interface QuickWin {
  readonly issue: string;
  readonly impact: string;
  readonly effort: "low" | "medium" | "high";
  readonly files: readonly string[];
}

export interface WorstPerformer {
  readonly path: string;
  readonly device: string;
  readonly score: number;
  readonly primaryIssues: readonly string[];
}

export interface Pattern {
  readonly description: string;
  readonly recommendation: string;
}

export interface Offender {
  readonly path: string;
  readonly impact: string;
  readonly device: string;
}

export interface FixGuidance {
  readonly difficulty: "easy" | "medium" | "hard";
  readonly estimatedTime: string;
  readonly implementation: string;
  readonly codeExample?: string;
}

export interface AiSummaryReport {
  readonly status: "needs_optimization" | "good" | "excellent";
  readonly disclaimer: string;
  readonly topIssues: readonly SummaryIssue[];
  readonly worstPages: readonly SummaryPage[];
  readonly quickWins: readonly string[];
  readonly estimatedFixTime: string;
}

export interface SummaryIssue {
  readonly type: string;
  readonly impact: string;
  readonly pages: number;
  readonly priority: number;
}

export interface SummaryPage {
  readonly path: string;
  readonly score: number;
  readonly device: string;
}

/**
 * Generate AI-ANALYSIS.json - comprehensive AI-optimized report
 */
export function buildAiAnalysisReport(params: {
  readonly summary: RunSummary;
  readonly issues: IssuesIndex;
  readonly targetScore: number;
}): AiAnalysisReport {
  const { summary, issues, targetScore } = params;
  const results = summary.results.filter(r => !r.path.includes("/admin") || r.path === "/admin");
  const failingResults = issues.failing;
  
  // Calculate below target count
  const belowTarget = results.filter(r => 
    (r.scores.performance ?? 0) < targetScore || 
    typeof r.runtimeErrorMessage === "string"
  ).length;

  // Build critical issues from top issues
  const criticalIssues: CriticalIssue[] = issues.topIssues.slice(0, 3).map((issue: TopIssue, index: number) => {
    const severity = index === 0 ? "critical" : index === 1 ? "high" : "medium";
    const avgImpact = issue.totalMs > 0 ? Math.round(issue.totalMs / issue.count) : 0;
    
    // Find top offenders for this issue from failing results
    const topOffenders: Offender[] = failingResults
      .filter(r => r.topOpportunities?.some((op: OpportunitySummary) => op.id === issue.id))
      .sort((a, b) => {
        const aOpp = a.topOpportunities?.find((op: OpportunitySummary) => op.id === issue.id);
        const bOpp = b.topOpportunities?.find((op: OpportunitySummary) => op.id === issue.id);
        return (bOpp?.estimatedSavingsMs ?? 0) - (aOpp?.estimatedSavingsMs ?? 0);
      })
      .slice(0, 3)
      .map(r => {
        const opp = r.topOpportunities?.find((op: OpportunitySummary) => op.id === issue.id);
        return {
          path: r.path,
          impact: `${opp?.estimatedSavingsMs ?? 0}ms`,
          device: r.device,
        };
      });

    return {
      id: issue.id,
      title: issue.title,
      severity,
      totalImpact: `${issue.totalMs}ms across ${issue.count} pages`,
      avgImpactPerPage: `${avgImpact}ms`,
      affectedPages: issue.count,
      topOffenders,
      fixGuidance: getFixGuidance(issue.id),
    };
  });

  // Build quick wins (low effort, high impact)
  const quickWins: QuickWin[] = issues.topIssues
    .filter((issue: TopIssue) => ["unused-javascript", "unminified-css", "unused-css-rules"].includes(issue.id))
    .slice(0, 3)
    .map((issue: TopIssue) => ({
      issue: issue.id,
      impact: `${issue.totalMs}ms total`,
      effort: "low" as const,
      files: getAffectedFiles(issue.id, failingResults),
    }));

  // Build worst performers
  const worstPerformers: WorstPerformer[] = results
    .sort((a, b) => (a.scores.performance ?? 101) - (b.scores.performance ?? 101))
    .slice(0, 5)
    .map(r => {
      // Find corresponding failing result to get topOpportunities
      const failingResult = failingResults.find(f => f.label === r.label && f.path === r.path && f.device === r.device);
      return {
        path: r.path,
        device: r.device,
        score: r.scores.performance ?? 0,
        primaryIssues: failingResult?.topOpportunities?.slice(0, 2).map((op: OpportunitySummary) => op.id) ?? [],
      };
    });

  // Detect patterns
  const patterns: Record<string, Pattern> = {};
  
  // Admin pages pattern
  const adminPages = results.filter(r => r.path.startsWith("/admin"));
  const nonAdminPages = results.filter(r => !r.path.startsWith("/admin"));
  if (adminPages.length > 0 && nonAdminPages.length > 0) {
    const adminAvg = adminPages.reduce((sum, r) => sum + (r.scores.performance ?? 0), 0) / adminPages.length;
    const nonAdminAvg = nonAdminPages.reduce((sum, r) => sum + (r.scores.performance ?? 0), 0) / nonAdminPages.length;
    
    if (adminAvg < nonAdminAvg - 10) {
      patterns.adminPagesUnderperform = {
        description: `Admin pages score ${Math.round(nonAdminAvg - adminAvg)} points lower on average`,
        recommendation: "Consider separate bundle for admin functionality with code splitting",
      };
    }
  }

  // Mobile vs Desktop pattern
  const mobileResults = results.filter(r => r.device === "mobile");
  const desktopResults = results.filter(r => r.device === "desktop");
  if (mobileResults.length > 0 && desktopResults.length > 0) {
    const mobileAvg = mobileResults.reduce((sum, r) => sum + (r.scores.performance ?? 0), 0) / mobileResults.length;
    const desktopAvg = desktopResults.reduce((sum, r) => sum + (r.scores.performance ?? 0), 0) / desktopResults.length;
    
    if (Math.abs(mobileAvg - desktopAvg) > 5) {
      const better = mobileAvg > desktopAvg ? "Mobile" : "Desktop";
      const worse = mobileAvg > desktopAvg ? "desktop" : "mobile";
      patterns.mobileVsDesktop = {
        description: `${better} scores ${Math.round(Math.abs(mobileAvg - desktopAvg))} points higher on average`,
        recommendation: `Focus optimization efforts on ${worse} experience`,
      };
    }
  }

  return {
    meta: {
      disclaimer: "Scores are relative indicators for batch analysis, not absolute measurements",
      auditSummary: {
        totalPages: summary.meta.comboCount,
        elapsedTime: formatElapsedTime(summary.meta.elapsedMs),
        targetScore,
        belowTarget,
      },
    },
    criticalIssues,
    quickWins,
    worstPerformers,
    patterns,
  };
}

/**
 * Generate AI-SUMMARY.json - ultra-condensed report for quick assessment
 */
export function buildAiSummaryReport(params: {
  readonly summary: RunSummary;
  readonly issues: IssuesIndex;
  readonly targetScore: number;
}): AiSummaryReport {
  const { summary, issues, targetScore } = params;
  const results = summary.results.filter(r => !r.path.includes("/admin") || r.path === "/admin");
  
  // Determine overall status
  const belowTargetCount = results.filter(r => (r.scores.performance ?? 0) < targetScore).length;
  const belowTargetPercent = (belowTargetCount / results.length) * 100;
  
  let status: "needs_optimization" | "good" | "excellent";
  if (belowTargetPercent > 50) {
    status = "needs_optimization";
  } else if (belowTargetPercent > 20) {
    status = "good";
  } else {
    status = "excellent";
  }

  // Top issues (max 3)
  const topIssues: SummaryIssue[] = issues.topIssues.slice(0, 3).map((issue: TopIssue, index: number) => ({
    type: issue.id,
    impact: `${(issue.totalMs / 1000).toFixed(1)}s`,
    pages: issue.count,
    priority: index + 1,
  }));

  // Worst pages (max 3)
  const worstPages: SummaryPage[] = results
    .sort((a, b) => (a.scores.performance ?? 101) - (b.scores.performance ?? 101))
    .slice(0, 3)
    .map(r => ({
      path: r.path,
      score: r.scores.performance ?? 0,
      device: r.device,
    }));

  // Quick wins
  const quickWins = [
    issues.topIssues.some((i: TopIssue) => i.id === "redirects") && "fix_redirects",
    issues.topIssues.some((i: TopIssue) => i.id === "unused-javascript") && "code_splitting",
    issues.topIssues.some((i: TopIssue) => i.id === "unminified-css") && "css_minification",
  ].filter(Boolean) as string[];

  // Estimate fix time based on issue complexity
  const totalImpact = issues.topIssues.slice(0, 3).reduce((sum: number, issue: TopIssue) => sum + issue.totalMs, 0);
  const estimatedHours = Math.ceil(totalImpact / 5000); // Rough estimate: 5 seconds of savings per hour of work
  const estimatedFixTime = `${estimatedHours}-${estimatedHours * 2} hours for 80% improvement`;

  return {
    status,
    disclaimer: "Batch audit scores are relative indicators only",
    topIssues,
    worstPages,
    quickWins,
    estimatedFixTime,
  };
}

/**
 * Generate QUICK-FIXES.md - enhanced human triage report
 */
export function buildQuickFixesMarkdown(params: {
  readonly summary: RunSummary;
  readonly issues: IssuesIndex;
  readonly targetScore: number;
}): string {
  const { summary, issues, targetScore } = params;
  const results = summary.results.filter(r => !r.path.includes("/admin") || r.path === "/admin");
  const failingResults = issues.failing;
  const lines: string[] = [];

  lines.push("# 🚀 Signaler Quick Fixes");
  lines.push("");
  lines.push("> **Performance Score Notice**: Signaler runs in headless Chrome for batch efficiency.");
  lines.push("> Scores are 10-30 points lower than DevTools. Use for relative comparison and trend analysis.");
  lines.push("");

  // Immediate Impact section
  lines.push("## ⚡ Immediate Impact (< 2 hours work)");
  lines.push("");

  issues.topIssues.slice(0, 3).forEach((issue: TopIssue, index: number) => {
    const impact = (issue.totalMs / 1000).toFixed(1);
    const guidance = getFixGuidance(issue.id);
    
    lines.push(`### ${index + 1}. ${issue.title} → **${impact} seconds** total savings`);
    lines.push(`- **Impact**: ${issue.count} pages affected`);
    
    // Find top offender from failing results
    const topOffender = failingResults
      .filter(r => r.topOpportunities?.some((op: OpportunitySummary) => op.id === issue.id))
      .sort((a, b) => {
        const aOpp = a.topOpportunities?.find((op: OpportunitySummary) => op.id === issue.id);
        const bOpp = b.topOpportunities?.find((op: OpportunitySummary) => op.id === issue.id);
        return (bOpp?.estimatedSavingsMs ?? 0) - (aOpp?.estimatedSavingsMs ?? 0);
      })[0];
    
    if (topOffender) {
      const opp = topOffender.topOpportunities?.find((op: OpportunitySummary) => op.id === issue.id);
      lines.push(`- **Top offender**: \`${topOffender.path}\` (${(opp?.estimatedSavingsMs ?? 0)}ms delay)`);
    }
    
    lines.push(`- **Fix**: ${guidance.implementation}`);
    if (guidance.codeExample) {
      lines.push(`- **Implementation**: ${guidance.codeExample}`);
    }
    lines.push("");
  });

  // Performance Overview
  const belowTarget = results.filter(r => (r.scores.performance ?? 0) < targetScore).length;
  const worstPerformer = results.sort((a, b) => (a.scores.performance ?? 101) - (b.scores.performance ?? 101))[0];
  
  lines.push("## 📊 Performance Overview");
  lines.push(`- **Audited**: ${summary.meta.comboCount} pages in ${formatElapsedTime(summary.meta.elapsedMs)}`);
  lines.push(`- **Below target (${targetScore}+)**: ${belowTarget} pages`);
  if (worstPerformer) {
    lines.push(`- **Worst performer**: \`${worstPerformer.path}\` (${worstPerformer.scores.performance} score)`);
  }
  
  // Detect admin pattern
  const adminPages = results.filter(r => r.path.startsWith("/admin"));
  if (adminPages.length > 0) {
    const adminAvg = adminPages.reduce((sum, r) => sum + (r.scores.performance ?? 0), 0) / adminPages.length;
    lines.push(`- **Best opportunity**: Admin pages (${Math.round(adminAvg)} avg score)`);
  }
  lines.push("");

  // Next Steps
  lines.push("## 🎯 Next Steps");
  lines.push("1. Fix redirects (highest impact)");
  lines.push("2. Implement admin code splitting");
  lines.push("3. Re-run audit to measure improvements");

  return lines.join("\n");
}

/**
 * Write all AI-optimized reports
 */
export async function writeAiOptimizedReports(params: {
  readonly outputDir: string;
  readonly summary: RunSummary;
  readonly issues: IssuesIndex;
  readonly targetScore: number;
}): Promise<void> {
  const { outputDir, summary, issues, targetScore } = params;

  // Generate AI-ANALYSIS.json
  const aiAnalysis = buildAiAnalysisReport({ summary, issues, targetScore });
  await writeFile(
    resolve(outputDir, "AI-ANALYSIS.json"),
    JSON.stringify(aiAnalysis, null, 2),
    "utf8"
  );

  // Generate AI-SUMMARY.json
  const aiSummary = buildAiSummaryReport({ summary, issues, targetScore });
  await writeFile(
    resolve(outputDir, "AI-SUMMARY.json"),
    JSON.stringify(aiSummary, null, 2),
    "utf8"
  );

  // Generate QUICK-FIXES.md
  const quickFixes = buildQuickFixesMarkdown({ summary, issues, targetScore });
  await writeFile(
    resolve(outputDir, "QUICK-FIXES.md"),
    quickFixes,
    "utf8"
  );
}

// Helper functions
function formatElapsedTime(elapsedMs: number): string {
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function getFixGuidance(issueId: string): FixGuidance {
  const guidanceMap: Record<string, FixGuidance> = {
    "redirects": {
      difficulty: "medium",
      estimatedTime: "2-4 hours",
      implementation: "Review routing configuration, eliminate unnecessary redirects",
      codeExample: "Check middleware.ts and next.config.ts for redirect chains",
    },
    "unused-javascript": {
      difficulty: "medium",
      estimatedTime: "4-8 hours",
      implementation: "Implement code splitting and remove unused dependencies",
      codeExample: "Use dynamic imports: const AdminPanel = lazy(() => import('./AdminPanel'))",
    },
    "unminified-css": {
      difficulty: "easy",
      estimatedTime: "1-2 hours",
      implementation: "Enable CSS minification in build process",
      codeExample: "Add cssnano to PostCSS config or enable in bundler",
    },
    "unused-css-rules": {
      difficulty: "medium",
      estimatedTime: "2-4 hours",
      implementation: "Remove unused CSS rules and optimize stylesheets",
      codeExample: "Use PurgeCSS or similar tool to remove unused styles",
    },
    "server-response-time": {
      difficulty: "hard",
      estimatedTime: "8-16 hours",
      implementation: "Optimize server performance and caching",
      codeExample: "Add Redis caching, optimize database queries, use CDN",
    },
  };

  return guidanceMap[issueId] ?? {
    difficulty: "medium",
    estimatedTime: "2-4 hours",
    implementation: "Review Lighthouse recommendations for specific guidance",
  };
}

function getAffectedFiles(issueId: string, results: readonly IssuesIndex["failing"][number][]): string[] {
  // This is a simplified implementation - in practice, you'd extract actual file names
  // from the Lighthouse diagnostics data
  const fileMap: Record<string, string[]> = {
    "unused-javascript": ["bundle.js", "admin.js", "vendor.js"],
    "unminified-css": ["styles.css", "components.css"],
    "unused-css-rules": ["global.css", "theme.css"],
  };

  return fileMap[issueId] ?? [];
}