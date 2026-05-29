import type { ArtifactRule } from "./types.js";

/** Known artifacts: flat path (legacy writers) → tree path (v4.5 layout). */
export const ARTIFACT_RULES: readonly ArtifactRule[] = [
  { id: "agent-index", flatPath: "agent-index.json", treePath: "agent/index.json", audience: "agent", runner: "lighthouse", weight: "entrypoint", contract: "v3", agentReadOrder: 1 },
  { id: "analyze", flatPath: "analyze.json", treePath: "agent/analyze.json", audience: "agent", runner: "analyze", weight: "entrypoint", contract: "v6", agentReadOrder: 2 },
  { id: "performance-triage", flatPath: "performance-triage.json", treePath: "agent/performance-triage.json", audience: "agent", runner: "lighthouse", weight: "entrypoint", contract: "v3", agentReadOrder: 3 },
  { id: "suggestions", flatPath: "suggestions.json", treePath: "agent/suggestions.json", audience: "agent", runner: "lighthouse", weight: "summary", contract: "v3", agentReadOrder: 4 },
  { id: "quality-pack", flatPath: "quality-pack.json", treePath: "gates/quality-pack.json", audience: "ci", runner: "gate", weight: "entrypoint", agentReadOrder: 5 },
  { id: "job-latest", flatPath: "job-latest.json", treePath: "orchestration/job-latest.json", audience: "agent", runner: "orchestration", weight: "entrypoint", contract: "job-v1", agentReadOrder: 0 },

  { id: "run", flatPath: "run.json", treePath: "runs/lighthouse/run.json", audience: "agent", runner: "lighthouse", weight: "entrypoint", contract: "v3" },
  { id: "results", flatPath: "results.json", treePath: "runs/lighthouse/results.json", audience: "diagnostics", runner: "lighthouse", weight: "bulk", contract: "v3" },
  { id: "results-gz", flatPath: "results.json.gz", treePath: "runs/lighthouse/results.json.gz", audience: "diagnostics", runner: "lighthouse", weight: "bulk", contract: "v3" },
  { id: "summary", flatPath: "summary.json", treePath: "runs/lighthouse/summary.json", audience: "diagnostics", runner: "lighthouse", weight: "bulk" },
  { id: "verify", flatPath: "verify.json", treePath: "runs/verify/verify.json", audience: "agent", runner: "verify", weight: "entrypoint", contract: "v6" },

  { id: "report-html", flatPath: "report.html", treePath: "developer/report.html", audience: "developer", runner: "lighthouse", weight: "entrypoint", developerEntrypoint: true },
  { id: "overview", flatPath: "overview.md", treePath: "developer/overview.md", audience: "developer", runner: "lighthouse", weight: "summary", developerEntrypoint: true },
  { id: "triage", flatPath: "triage.md", treePath: "developer/triage.md", audience: "developer", runner: "lighthouse", weight: "summary", developerEntrypoint: true },
  { id: "summary-md", flatPath: "summary.md", treePath: "developer/summary.md", audience: "developer", runner: "lighthouse", weight: "summary" },
  { id: "red-issues", flatPath: "red-issues.md", treePath: "developer/red-issues.md", audience: "developer", runner: "lighthouse", weight: "summary" },
  { id: "red-issues-json", flatPath: "red-issues.json", treePath: "archive/red-issues.json", audience: "legacy", runner: "lighthouse", weight: "bulk" },
  { id: "analyze-md", flatPath: "analyze.md", treePath: "runs/analyze/analyze.md", audience: "developer", runner: "analyze", weight: "summary" },

  { id: "headers", flatPath: "headers.json", treePath: "runners/headers/headers.json", audience: "agent", runner: "headers", weight: "entrypoint" },
  { id: "headers-report", flatPath: "headers.report.md", treePath: "developer/reports/headers.report.md", audience: "developer", runner: "headers", weight: "summary" },
  { id: "headers-ai", flatPath: "headers.ai.json", treePath: "runners/headers/headers.ai.json", audience: "agent", runner: "headers", weight: "summary" },

  { id: "links", flatPath: "links.json", treePath: "runners/links/links.json", audience: "agent", runner: "links", weight: "entrypoint" },
  { id: "links-report", flatPath: "links.report.md", treePath: "developer/reports/links.report.md", audience: "developer", runner: "links", weight: "summary" },
  { id: "links-ai", flatPath: "links.ai.json", treePath: "runners/links/links.ai.json", audience: "agent", runner: "links", weight: "summary" },

  { id: "bundle", flatPath: "bundle-audit.json", treePath: "runners/bundle/bundle-audit.json", audience: "agent", runner: "bundle", weight: "entrypoint" },
  { id: "bundle-report", flatPath: "bundle.report.md", treePath: "developer/reports/bundle.report.md", audience: "developer", runner: "bundle", weight: "summary" },
  { id: "bundle-ai", flatPath: "bundle.ai.json", treePath: "runners/bundle/bundle.ai.json", audience: "agent", runner: "bundle", weight: "summary" },

  { id: "discovery", flatPath: "discovery.json", treePath: "orchestration/discovery.json", audience: "agent", runner: "orchestration", weight: "summary" },
  { id: "session", flatPath: "session.json", treePath: "orchestration/session.json", audience: "diagnostics", runner: "orchestration", weight: "summary" },
  { id: "quality-gate", flatPath: "quality-gate.json", treePath: "gates/quality-gate.json", audience: "ci", runner: "gate", weight: "entrypoint" },
  { id: "baseline-compare", flatPath: "baseline-compare.json", treePath: "gates/baseline-compare.json", audience: "ci", runner: "gate", weight: "entrypoint" },

  { id: "export", flatPath: "export.json", treePath: "export/export.json", audience: "export", runner: "lighthouse", weight: "summary" },
  { id: "export-bundle", flatPath: "export-bundle.json", treePath: "export/export-bundle.json", audience: "export", runner: "lighthouse", weight: "summary" },

  { id: "issues", flatPath: "issues.json", treePath: "archive/issues.json", audience: "legacy", runner: "lighthouse", weight: "bulk" },
  { id: "ai-ledger", flatPath: "ai-ledger.json", treePath: "archive/ai-ledger.json", audience: "legacy", runner: "lighthouse", weight: "bulk" },
  { id: "ai-global-red", flatPath: "ai-global-red.json", treePath: "archive/ai-global-red.json", audience: "legacy", runner: "lighthouse", weight: "summary" },
  { id: "global-red-report", flatPath: "global-red.report.md", treePath: "developer/global-red.report.md", audience: "developer", runner: "lighthouse", weight: "summary" },
  { id: "pwa", flatPath: "pwa.json", treePath: "runs/lighthouse/pwa.json", audience: "diagnostics", runner: "lighthouse", weight: "summary" },
] as const;

export const ARTIFACT_DIRECTORY_RULES: readonly { readonly flatDir: string; readonly treeDir: string }[] = [
  { flatDir: "lighthouse-artifacts", treeDir: "runs/lighthouse/lighthouse-artifacts" },
  { flatDir: "screenshots", treeDir: "runs/lighthouse/screenshots" },
  { flatDir: "jobs", treeDir: "orchestration/jobs" },
  { flatDir: "measure", treeDir: "runners/measure/measure" },
  { flatDir: "accessibility", treeDir: "runners/accessibility/accessibility" },
] as const;

export function findArtifactRule(id: string): ArtifactRule | undefined {
  return ARTIFACT_RULES.find((rule) => rule.id === id);
}

export function flatPathForId(id: string): string | undefined {
  return findArtifactRule(id)?.flatPath;
}

export function treePathForId(id: string): string | undefined {
  return findArtifactRule(id)?.treePath;
}
