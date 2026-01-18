/**
 * Report Generators - Different output format generators
 */

import type { ReportGenerator } from '../index.js';

// Export the main report generator engine
export * from './report-generator-engine.js';

// Export CSV export functionality
export { CSVExportGenerator, CSVExportConfig, TrendData as CSVTrendData } from './csv-export-generator.js';

// Export AI-optimized generators with explicit exports to avoid conflicts
export { AIAnalysisTemplate, AIAnalysisReport, IssuePattern, PrioritizedFix, GlobalRecommendation } from './ai-analysis-generator.js';
export { StructuredIssuesTemplate, StructuredIssuesReport, DetailedIssue, FilePathAnalysis, OptimizationRecommendation, MachineInstruction } from './structured-issues-generator.js';

// Export executive dashboard generators
export { DashboardGenerator, DashboardData, PerformanceOverview, ScoreDistribution, WorstPerformingPage, PotentialGains, ImpactCategory, AuditSummary } from './dashboard-generator.js';
export { PerformanceSummaryGenerator, PerformanceSummaryReport, SummaryMetadata, OverallMetrics, PageMetrics, CategoryBreakdown, IssuesSummary, TrendData, ComparisonBaseline } from './performance-summary-generator.js';

// Export HTML report generators
export { HTMLReportGenerator, HTMLReportConfig, ChartData, ChartDataset, FilterOptions, ScoreRange } from './html-report-generator.js';
export { VisualPerformanceDashboard, DashboardConfig, HistoricalData, ComparisonData, PerformanceImprovement } from './visual-performance-dashboard.js';
export { IssueVisualization, IssueVisualizationConfig, IssueGroup, PageIssueInfo, CodeExample, ActionWorkflow, ActionStep } from './issue-visualization.js';

// Export actionable recommendation generators
export { ActionableRecommendationGenerator, ActionableRecommendation, RecommendationContext } from './actionable-recommendation-generator.js';
export { CodeExampleTemplates, CodeTemplate } from './code-example-templates.js';

// Re-export generators (will be added during migration)
// export * from './html.js';
// export * from './json.js';
// export * from './markdown.js';
// export * from './export.js';