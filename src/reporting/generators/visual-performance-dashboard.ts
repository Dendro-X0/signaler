/**
 * Visual Performance Dashboard - Enhanced performance visualizations
 * 
 * This module creates comprehensive visual dashboards with before/after comparisons,
 * progress tracking, and mobile-friendly responsive interfaces.
 */

import type { ProcessedAuditData, PageAuditResult } from './report-generator-engine.js';

/**
 * Configuration options for the visual performance dashboard.
 */
export interface DashboardConfig {
  enableComparisons: boolean;
  enableProgressTracking: boolean;
  mobileOptimized: boolean;
  theme: 'light' | 'dark' | 'auto';
  animationsEnabled: boolean;
}

/**
 * Historical summary snapshot used for trend charts.
 */
export interface HistoricalData {
  timestamp: string;
  averagePerformanceScore: number;
  totalPages: number;
  criticalIssuesCount: number;
  estimatedTotalSavings: number;
}

/**
 * Before/after dataset used for comparison dashboards.
 */
export interface ComparisonData {
  before: ProcessedAuditData;
  after: ProcessedAuditData;
  improvements: PerformanceImprovement[];
}

/**
 * Single metric improvement entry.
 */
export interface PerformanceImprovement {
  metric: string;
  beforeValue: number;
  afterValue: number;
  improvement: number;
  improvementPercentage: number;
}

/**
 * Generates visual performance dashboards with advanced charts and comparisons
 */
export class VisualPerformanceDashboard {
  private config: DashboardConfig;

  constructor(config: DashboardConfig = {
    enableComparisons: true,
    enableProgressTracking: true,
    mobileOptimized: true,
    theme: 'auto',
    animationsEnabled: true
  }) {
    this.config = config;
  }

  /**
   * Generate complete visual dashboard
   */
  async generateDashboard(data: ProcessedAuditData, historicalData?: HistoricalData[], comparisonData?: ComparisonData): Promise<string> {
    return `
    <div class="visual-dashboard">
      ${this.generateDashboardHeader(data)}
      ${this.generatePerformanceOverview(data)}
      ${this.generateScoreVisualization(data)}
      ${this.generateMetricsComparison(data)}
      ${this.config.enableProgressTracking && historicalData ? this.generateProgressTracking(historicalData) : ''}
      ${this.config.enableComparisons && comparisonData ? this.generateBeforeAfterComparison(comparisonData) : ''}
      ${this.generatePagePerformanceMatrix(data)}
      ${this.generateIssueHeatmap(data)}
      ${this.generateOptimizationRoadmap(data)}
    </div>
    
    <style>
      ${this.generateDashboardCSS()}
    </style>
    
    <script>
      ${this.generateDashboardScripts(data, historicalData, comparisonData)}
    </script>`;
  }

  /**
   * Generate dashboard header with key metrics
   */
  private generateDashboardHeader(data: ProcessedAuditData): string {
    const { performanceMetrics } = data;
    const auditDate = new Date(data.auditMetadata.completedAt).toLocaleDateString();
    
    return `
    <div class="dashboard-header">
      <div class="header-content">
        <div class="header-main">
          <h1 class="dashboard-title">Performance Dashboard</h1>
          <p class="dashboard-subtitle">Comprehensive performance analysis for ${performanceMetrics.totalPages} pages</p>
          <p class="audit-date">Last updated: ${auditDate}</p>
        </div>
        
        <div class="header-metrics">
          <div class="metric-card primary">
            <div class="metric-icon">⚡</div>
            <div class="metric-content">
              <div class="metric-value">${performanceMetrics.averagePerformanceScore}</div>
              <div class="metric-label">Avg Performance</div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-icon">🎯</div>
            <div class="metric-content">
              <div class="metric-value">${performanceMetrics.totalPages}</div>
              <div class="metric-label">Pages Audited</div>
            </div>
          </div>
          
          <div class="metric-card warning">
            <div class="metric-icon">⚠️</div>
            <div class="metric-content">
              <div class="metric-value">${performanceMetrics.criticalIssuesCount}</div>
              <div class="metric-label">Critical Issues</div>
            </div>
          </div>
          
          <div class="metric-card success">
            <div class="metric-icon">💾</div>
            <div class="metric-content">
              <div class="metric-value">${Math.round(performanceMetrics.estimatedTotalSavings / 1000)}s</div>
              <div class="metric-label">Potential Savings</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate performance overview with gauge charts
   */
  private generatePerformanceOverview(data: ProcessedAuditData): string {
    const avgScores = this.calculateAverageScores(data.pages);
    
    return `
    <div class="dashboard-section">
      <h2 class="section-title">Performance Overview</h2>
      
      <div class="gauges-container">
        <div class="gauge-card">
          <div class="gauge-header">
            <h3>Performance</h3>
            <span class="gauge-score ${this.getScoreClass(avgScores.performance)}">${avgScores.performance}</span>
          </div>
          <div class="gauge-chart" id="performanceGauge"></div>
          <div class="gauge-description">
            Core Web Vitals and loading performance
          </div>
        </div>
        
        <div class="gauge-card">
          <div class="gauge-header">
            <h3>Accessibility</h3>
            <span class="gauge-score ${this.getScoreClass(avgScores.accessibility)}">${avgScores.accessibility}</span>
          </div>
          <div class="gauge-chart" id="accessibilityGauge"></div>
          <div class="gauge-description">
            WCAG compliance and usability
          </div>
        </div>
        
        <div class="gauge-card">
          <div class="gauge-header">
            <h3>Best Practices</h3>
            <span class="gauge-score ${this.getScoreClass(avgScores.bestPractices)}">${avgScores.bestPractices}</span>
          </div>
          <div class="gauge-chart" id="bestPracticesGauge"></div>
          <div class="gauge-description">
            Security and modern standards
          </div>
        </div>
        
        <div class="gauge-card">
          <div class="gauge-header">
            <h3>SEO</h3>
            <span class="gauge-score ${this.getScoreClass(avgScores.seo)}">${avgScores.seo}</span>
          </div>
          <div class="gauge-chart" id="seoGauge"></div>
          <div class="gauge-description">
            Search engine optimization
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate score distribution visualization
   */
  private generateScoreVisualization(data: ProcessedAuditData): string {
    return `
    <div class="dashboard-section">
      <h2 class="section-title">Score Distribution</h2>
      
      <div class="visualization-grid">
        <div class="chart-card">
          <h3 class="chart-title">Performance Score Distribution</h3>
          <div class="chart-container">
            <canvas id="scoreDistributionChart"></canvas>
          </div>
          <div class="chart-insights">
            <div class="insight-item">
              <span class="insight-label">Pages scoring 90+:</span>
              <span class="insight-value">${this.countPagesInRange(data.pages, 90, 100)}</span>
            </div>
            <div class="insight-item">
              <span class="insight-label">Pages needing attention:</span>
              <span class="insight-value">${this.countPagesInRange(data.pages, 0, 50)}</span>
            </div>
          </div>
        </div>
        
        <div class="chart-card">
          <h3 class="chart-title">Core Web Vitals</h3>
          <div class="chart-container">
            <canvas id="coreWebVitalsChart"></canvas>
          </div>
          <div class="chart-insights">
            <div class="insight-item">
              <span class="insight-label">Good LCP:</span>
              <span class="insight-value">${this.countGoodMetrics(data.pages, 'lcpMs', 2500)}</span>
            </div>
            <div class="insight-item">
              <span class="insight-label">Good CLS:</span>
              <span class="insight-value">${this.countGoodMetrics(data.pages, 'cls', 0.1)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate metrics comparison radar chart
   */
  private generateMetricsComparison(data: ProcessedAuditData): string {
    return `
    <div class="dashboard-section">
      <h2 class="section-title">Performance Metrics Analysis</h2>
      
      <div class="metrics-analysis">
        <div class="chart-card large">
          <h3 class="chart-title">Multi-dimensional Performance View</h3>
          <div class="chart-container">
            <canvas id="radarChart"></canvas>
          </div>
        </div>
        
        <div class="metrics-summary">
          <h3>Key Insights</h3>
          <div class="insights-list">
            ${this.generatePerformanceInsights(data)}
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate progress tracking over time
   */
  private generateProgressTracking(historicalData: HistoricalData[]): string {
    return `
    <div class="dashboard-section">
      <h2 class="section-title">Progress Tracking</h2>
      
      <div class="progress-container">
        <div class="chart-card full-width">
          <h3 class="chart-title">Performance Trends Over Time</h3>
          <div class="chart-container">
            <canvas id="progressChart"></canvas>
          </div>
          <div class="progress-controls">
            <button class="btn btn-sm" onclick="setTimeRange('7d')">7 Days</button>
            <button class="btn btn-sm active" onclick="setTimeRange('30d')">30 Days</button>
            <button class="btn btn-sm" onclick="setTimeRange('90d')">90 Days</button>
          </div>
        </div>
        
        <div class="progress-stats">
          <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-content">
              <div class="stat-value">+${this.calculateTrend(historicalData, 'averagePerformanceScore')}</div>
              <div class="stat-label">Performance Improvement</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">🎯</div>
            <div class="stat-content">
              <div class="stat-value">-${this.calculateTrend(historicalData, 'criticalIssuesCount')}</div>
              <div class="stat-label">Critical Issues Resolved</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate before/after comparison
   */
  private generateBeforeAfterComparison(comparisonData: ComparisonData): string {
    return `
    <div class="dashboard-section">
      <h2 class="section-title">Before vs After Comparison</h2>
      
      <div class="comparison-container">
        <div class="comparison-header">
          <div class="comparison-period">
            <span class="period-label">Before</span>
            <span class="period-date">${new Date(comparisonData.before.auditMetadata.completedAt).toLocaleDateString()}</span>
          </div>
          <div class="comparison-arrow">→</div>
          <div class="comparison-period">
            <span class="period-label">After</span>
            <span class="period-date">${new Date(comparisonData.after.auditMetadata.completedAt).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div class="comparison-metrics">
          ${comparisonData.improvements.map(improvement => `
            <div class="improvement-card">
              <div class="improvement-metric">${improvement.metric}</div>
              <div class="improvement-values">
                <span class="before-value">${improvement.beforeValue}</span>
                <span class="arrow">→</span>
                <span class="after-value">${improvement.afterValue}</span>
              </div>
              <div class="improvement-change ${improvement.improvement > 0 ? 'positive' : 'negative'}">
                ${improvement.improvement > 0 ? '+' : ''}${improvement.improvement} 
                (${improvement.improvementPercentage > 0 ? '+' : ''}${improvement.improvementPercentage.toFixed(1)}%)
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="chart-card">
          <h3 class="chart-title">Performance Score Comparison</h3>
          <div class="chart-container">
            <canvas id="comparisonChart"></canvas>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate page performance matrix
   */
  private generatePagePerformanceMatrix(data: ProcessedAuditData): string {
    return `
    <div class="dashboard-section">
      <h2 class="section-title">Page Performance Matrix</h2>
      
      <div class="matrix-container">
        <div class="matrix-controls">
          <select id="matrixMetric" class="control-select">
            <option value="performance">Performance Score</option>
            <option value="lcpMs">Largest Contentful Paint</option>
            <option value="fcpMs">First Contentful Paint</option>
            <option value="tbtMs">Total Blocking Time</option>
            <option value="cls">Cumulative Layout Shift</option>
          </select>
        </div>
        
        <div class="performance-matrix" id="performanceMatrix">
          ${this.generateMatrixGrid(data.pages)}
        </div>
        
        <div class="matrix-legend">
          <div class="legend-item">
            <div class="legend-color excellent"></div>
            <span>Excellent (90-100)</span>
          </div>
          <div class="legend-item">
            <div class="legend-color good"></div>
            <span>Good (75-89)</span>
          </div>
          <div class="legend-item">
            <div class="legend-color needs-improvement"></div>
            <span>Needs Improvement (50-74)</span>
          </div>
          <div class="legend-item">
            <div class="legend-color poor"></div>
            <span>Poor (0-49)</span>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate issue heatmap
   */
  private generateIssueHeatmap(data: ProcessedAuditData): string {
    return `
    <div class="dashboard-section">
      <h2 class="section-title">Issue Heatmap</h2>
      
      <div class="heatmap-container">
        <div class="heatmap-chart" id="issueHeatmap">
          ${this.generateHeatmapGrid(data)}
        </div>
        
        <div class="heatmap-sidebar">
          <h3>Issue Categories</h3>
          <div class="category-list">
            ${this.generateIssueCategoryList(data)}
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate optimization roadmap
   */
  private generateOptimizationRoadmap(data: ProcessedAuditData): string {
    const prioritizedIssues = this.prioritizeIssues(data);
    
    return `
    <div class="dashboard-section">
      <h2 class="section-title">Optimization Roadmap</h2>
      
      <div class="roadmap-container">
        <div class="roadmap-timeline">
          ${prioritizedIssues.map((issue, index) => `
            <div class="roadmap-item priority-${issue.priority}">
              <div class="roadmap-marker">${index + 1}</div>
              <div class="roadmap-content">
                <h4 class="roadmap-title">${issue.title}</h4>
                <p class="roadmap-description">${issue.description}</p>
                <div class="roadmap-metrics">
                  <span class="metric">Impact: ${issue.impact}</span>
                  <span class="metric">Effort: ${issue.effort}</span>
                  <span class="metric">Savings: ${Math.round(issue.savings / 1000)}s</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="roadmap-summary">
          <h3>Quick Wins</h3>
          <div class="quick-wins">
            ${prioritizedIssues.slice(0, 3).map(issue => `
              <div class="quick-win-item">
                <div class="quick-win-title">${issue.title}</div>
                <div class="quick-win-impact">+${Math.round(issue.savings / 1000)}s potential</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate dashboard CSS
   */
  private generateDashboardCSS(): string {
    return `
    .visual-dashboard {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: var(--text-primary);
    }

    .dashboard-header {
      background: linear-gradient(135deg, var(--primary-color), #3b82f6);
      color: white;
      padding: 2rem 0;
      margin-bottom: 2rem;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 2rem;
    }

    .dashboard-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .dashboard-subtitle {
      font-size: 1.125rem;
      opacity: 0.9;
      margin-bottom: 0.25rem;
    }

    .audit-date {
      font-size: 0.875rem;
      opacity: 0.8;
    }

    .header-metrics {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .metric-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 0.75rem;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 120px;
    }

    .metric-card.primary {
      background: rgba(255, 255, 255, 0.2);
    }

    .metric-card.warning {
      background: rgba(239, 68, 68, 0.2);
    }

    .metric-card.success {
      background: rgba(34, 197, 94, 0.2);
    }

    .metric-icon {
      font-size: 1.5rem;
    }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1;
    }

    .metric-label {
      font-size: 0.75rem;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .dashboard-section {
      max-width: 1200px;
      margin: 0 auto 3rem;
      padding: 0 1rem;
    }

    .section-title {
      font-size: 1.875rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      color: var(--text-primary);
    }

    .gauges-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .gauge-card {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.5rem;
      text-align: center;
    }

    .gauge-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .gauge-score {
      font-size: 1.25rem;
      font-weight: 700;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      color: white;
    }

    .gauge-chart {
      height: 150px;
      margin-bottom: 1rem;
    }

    .gauge-description {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .visualization-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .chart-card {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .chart-card.large {
      grid-column: span 2;
    }

    .chart-card.full-width {
      grid-column: 1 / -1;
    }

    .chart-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .chart-container {
      position: relative;
      height: 300px;
      margin-bottom: 1rem;
    }

    .chart-insights {
      display: flex;
      justify-content: space-around;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
    }

    .insight-item {
      text-align: center;
    }

    .insight-label {
      display: block;
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }

    .insight-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .metrics-analysis {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
    }

    .metrics-summary {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .insights-list {
      space-y: 1rem;
    }

    .insight-card {
      padding: 1rem;
      background: var(--background-color);
      border-radius: 0.5rem;
      border-left: 4px solid var(--primary-color);
    }

    .performance-matrix {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .matrix-cell {
      aspect-ratio: 1;
      border-radius: 0.25rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: white;
      text-align: center;
      padding: 0.5rem;
    }

    .matrix-cell.excellent { background: var(--success-color); }
    .matrix-cell.good { background: #22c55e; }
    .matrix-cell.needs-improvement { background: var(--warning-color); }
    .matrix-cell.poor { background: var(--error-color); }

    .matrix-legend {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .legend-color {
      width: 1rem;
      height: 1rem;
      border-radius: 0.25rem;
    }

    .legend-color.excellent { background: var(--success-color); }
    .legend-color.good { background: #22c55e; }
    .legend-color.needs-improvement { background: var(--warning-color); }
    .legend-color.poor { background: var(--error-color); }

    .roadmap-timeline {
      position: relative;
    }

    .roadmap-timeline::before {
      content: '';
      position: absolute;
      left: 1rem;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--border-color);
    }

    .roadmap-item {
      position: relative;
      padding-left: 3rem;
      margin-bottom: 2rem;
    }

    .roadmap-marker {
      position: absolute;
      left: 0;
      top: 0;
      width: 2rem;
      height: 2rem;
      background: var(--primary-color);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.875rem;
    }

    .roadmap-content {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .roadmap-title {
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .roadmap-description {
      color: var(--text-secondary);
      margin-bottom: 0.75rem;
    }

    .roadmap-metrics {
      display: flex;
      gap: 1rem;
      font-size: 0.875rem;
    }

    .roadmap-metrics .metric {
      padding: 0.25rem 0.5rem;
      background: var(--background-color);
      border-radius: 0.25rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        text-align: center;
      }

      .header-metrics {
        justify-content: center;
      }

      .dashboard-title {
        font-size: 2rem;
      }

      .gauges-container {
        grid-template-columns: 1fr;
      }

      .visualization-grid {
        grid-template-columns: 1fr;
      }

      .metrics-analysis {
        grid-template-columns: 1fr;
      }

      .chart-card.large {
        grid-column: span 1;
      }

      .performance-matrix {
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      }

      .legend-item {
        font-size: 0.75rem;
      }
    }

    /* Animation classes */
    ${this.config.animationsEnabled ? `
    .metric-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .chart-card {
      transition: transform 0.2s ease;
    }

    .chart-card:hover {
      transform: translateY(-1px);
    }

    .matrix-cell {
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .matrix-cell:hover {
      transform: scale(1.05);
      opacity: 0.9;
    }
    ` : ''}
    `;
  }

  /**
   * Generate dashboard JavaScript
   */
  private generateDashboardScripts(data: ProcessedAuditData, historicalData?: HistoricalData[], comparisonData?: ComparisonData): string {
    return `
    // Dashboard initialization
    document.addEventListener('DOMContentLoaded', function() {
      initializeGauges();
      initializeCharts();
      ${historicalData ? 'initializeProgressTracking();' : ''}
      ${comparisonData ? 'initializeComparisons();' : ''}
      initializeMatrix();
      initializeHeatmap();
    });

    function initializeGauges() {
      const gaugeOptions = {
        responsive: true,
        maintainAspectRatio: false,
        circumference: Math.PI,
        rotation: Math.PI,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          y: { display: false },
          x: { display: false }
        }
      };

      // Performance gauge
      const perfCtx = document.getElementById('performanceGauge');
      if (perfCtx) {
        new Chart(perfCtx, {
          type: 'doughnut',
          data: {
            datasets: [{
              data: [${data.performanceMetrics.averagePerformanceScore}, ${100 - data.performanceMetrics.averagePerformanceScore}],
              backgroundColor: ['${this.getScoreColor(data.performanceMetrics.averagePerformanceScore)}', '#e5e7eb'],
              borderWidth: 0
            }]
          },
          options: gaugeOptions
        });
      }

      // Similar gauges for other metrics...
    }

    function initializeCharts() {
      // Score distribution chart
      const scoreCtx = document.getElementById('scoreDistributionChart');
      if (scoreCtx) {
        new Chart(scoreCtx, {
          type: 'bar',
          data: {
            labels: ['Excellent\\n(90-100)', 'Good\\n(75-89)', 'Needs Improvement\\n(50-74)', 'Poor\\n(0-49)'],
            datasets: [{
              label: 'Number of Pages',
              data: [
                ${this.countPagesInRange(data.pages, 90, 100)},
                ${this.countPagesInRange(data.pages, 75, 89)},
                ${this.countPagesInRange(data.pages, 50, 74)},
                ${this.countPagesInRange(data.pages, 0, 49)}
              ],
              backgroundColor: ['#16a34a', '#22c55e', '#d97706', '#dc2626']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: { beginAtZero: true }
            }
          }
        });
      }

      // Core Web Vitals chart
      const cwvCtx = document.getElementById('coreWebVitalsChart');
      if (cwvCtx) {
        new Chart(cwvCtx, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'LCP vs CLS',
              data: ${JSON.stringify(data.pages.map(page => ({
                x: page.metrics.lcpMs,
                y: page.metrics.cls
              })))},
              backgroundColor: '#2563eb'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { 
                title: { display: true, text: 'LCP (ms)' },
                beginAtZero: true
              },
              y: { 
                title: { display: true, text: 'CLS' },
                beginAtZero: true
              }
            }
          }
        });
      }

      // Radar chart
      const radarCtx = document.getElementById('radarChart');
      if (radarCtx) {
        const avgScores = ${JSON.stringify(this.calculateAverageScores(data.pages))};
        new Chart(radarCtx, {
          type: 'radar',
          data: {
            labels: ['Performance', 'Accessibility', 'Best Practices', 'SEO'],
            datasets: [{
              label: 'Average Scores',
              data: [avgScores.performance, avgScores.accessibility, avgScores.bestPractices, avgScores.seo],
              backgroundColor: 'rgba(37, 99, 235, 0.2)',
              borderColor: '#2563eb',
              pointBackgroundColor: '#2563eb'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              r: {
                beginAtZero: true,
                max: 100
              }
            }
          }
        });
      }
    }

    ${historicalData ? `
    function initializeProgressTracking() {
      const progressCtx = document.getElementById('progressChart');
      if (progressCtx) {
        const historicalData = ${JSON.stringify(historicalData)};
        new Chart(progressCtx, {
          type: 'line',
          data: {
            labels: historicalData.map(d => new Date(d.timestamp).toLocaleDateString()),
            datasets: [{
              label: 'Performance Score',
              data: historicalData.map(d => d.averagePerformanceScore),
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              fill: true
            }, {
              label: 'Critical Issues',
              data: historicalData.map(d => d.criticalIssuesCount),
              borderColor: '#dc2626',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              yAxisID: 'y1'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                max: 100
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                grid: { drawOnChartArea: false }
              }
            }
          }
        });
      }
    }
    ` : ''}

    ${comparisonData ? `
    function initializeComparisons() {
      const compCtx = document.getElementById('comparisonChart');
      if (compCtx) {
        const compData = ${JSON.stringify(comparisonData)};
        new Chart(compCtx, {
          type: 'bar',
          data: {
            labels: ['Performance', 'Accessibility', 'Best Practices', 'SEO'],
            datasets: [{
              label: 'Before',
              data: [
                compData.before.performanceMetrics.averagePerformanceScore,
                // Add other metrics...
              ],
              backgroundColor: '#94a3b8'
            }, {
              label: 'After',
              data: [
                compData.after.performanceMetrics.averagePerformanceScore,
                // Add other metrics...
              ],
              backgroundColor: '#2563eb'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true, max: 100 }
            }
          }
        });
      }
    }
    ` : ''}

    function initializeMatrix() {
      const matrixSelect = document.getElementById('matrixMetric');
      if (matrixSelect) {
        matrixSelect.addEventListener('change', updateMatrix);
      }
    }

    function updateMatrix() {
      const metric = document.getElementById('matrixMetric').value;
      const matrix = document.getElementById('performanceMatrix');
      // Update matrix based on selected metric
      // Implementation would update the grid colors based on the selected metric
    }

    function initializeHeatmap() {
      // Initialize issue heatmap with interactive features
      const heatmapCells = document.querySelectorAll('.heatmap-cell');
      heatmapCells.forEach(cell => {
        cell.addEventListener('click', function() {
          // Show detailed issue information
          showIssueDetails(this.dataset.issueId);
        });
      });
    }

    function showIssueDetails(issueId) {
      // Implementation for showing detailed issue information
      console.log('Showing details for issue:', issueId);
    }

    function setTimeRange(range) {
      // Update progress chart based on time range
      const buttons = document.querySelectorAll('.progress-controls .btn');
      buttons.forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      
      // Filter and update chart data based on range
      // Implementation would filter historical data and update the chart
    }
    `;
  }

  /**
   * Helper methods
   */
  private calculateAverageScores(pages: PageAuditResult[]): any {
    const totals = pages.reduce((acc, page) => ({
      performance: acc.performance + page.scores.performance,
      accessibility: acc.accessibility + page.scores.accessibility,
      bestPractices: acc.bestPractices + page.scores.bestPractices,
      seo: acc.seo + page.scores.seo
    }), { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 });

    const count = pages.length;
    return {
      performance: Math.round(totals.performance / count),
      accessibility: Math.round(totals.accessibility / count),
      bestPractices: Math.round(totals.bestPractices / count),
      seo: Math.round(totals.seo / count)
    };
  }

  private getScoreClass(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }

  private getScoreColor(score: number): string {
    if (score >= 90) return '#16a34a';
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#d97706';
    return '#dc2626';
  }

  private countPagesInRange(pages: PageAuditResult[], min: number, max: number): number {
    return pages.filter(page => page.scores.performance >= min && page.scores.performance <= max).length;
  }

  private countGoodMetrics(pages: PageAuditResult[], metric: keyof PageAuditResult['metrics'], threshold: number): number {
    return pages.filter(page => {
      const value = page.metrics[metric];
      return metric === 'cls' ? value <= threshold : value <= threshold;
    }).length;
  }

  private generatePerformanceInsights(data: ProcessedAuditData): string {
    const insights = [];
    
    if (data.performanceMetrics.averagePerformanceScore < 50) {
      insights.push('<div class="insight-card">🚨 Performance needs immediate attention - average score below 50</div>');
    }
    
    if (data.performanceMetrics.criticalIssuesCount > 0) {
      insights.push(`<div class="insight-card">⚠️ ${data.performanceMetrics.criticalIssuesCount} critical issues require urgent fixes</div>`);
    }
    
    const potentialSavings = Math.round(data.performanceMetrics.estimatedTotalSavings / 1000);
    if (potentialSavings > 5) {
      insights.push(`<div class="insight-card">💡 Significant optimization opportunity: ${potentialSavings}s potential savings</div>`);
    }
    
    return insights.join('');
  }

  private calculateTrend(historicalData: HistoricalData[], metric: keyof HistoricalData): number {
    if (historicalData.length < 2) return 0;
    
    const latest = historicalData[historicalData.length - 1];
    const previous = historicalData[historicalData.length - 2];
    
    const latestValue = latest[metric] as number;
    const previousValue = previous[metric] as number;
    
    return latestValue - previousValue;
  }

  private generateMatrixGrid(pages: PageAuditResult[]): string {
    return pages.map(page => `
      <div class="matrix-cell ${this.getScoreClass(page.scores.performance)}" 
           data-page="${page.label}" 
           data-performance="${page.scores.performance}"
           title="${page.label}: ${page.scores.performance}">
        <div class="matrix-score">${page.scores.performance}</div>
        <div class="matrix-label">${page.label.substring(0, 10)}${page.label.length > 10 ? '...' : ''}</div>
      </div>
    `).join('');
  }

  private generateHeatmapGrid(data: ProcessedAuditData): string {
    // Generate a heatmap showing issue density across pages
    const issueTypes = ['javascript', 'css', 'images', 'caching', 'network'];
    
    return `
      <div class="heatmap-grid">
        ${data.pages.map(page => `
          <div class="heatmap-row">
            <div class="heatmap-label">${page.label}</div>
            ${issueTypes.map(type => {
              const issueCount = page.issues.filter(issue => issue.category === type).length;
              const intensity = Math.min(issueCount / 5, 1); // Normalize to 0-1
              return `<div class="heatmap-cell" style="background-color: rgba(220, 38, 38, ${intensity})" title="${type}: ${issueCount} issues"></div>`;
            }).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  private generateIssueCategoryList(data: ProcessedAuditData): string {
    const categories = ['javascript', 'css', 'images', 'caching', 'network'];
    
    return categories.map(category => {
      const count = data.pages.reduce((sum, page) => 
        sum + page.issues.filter(issue => issue.category === category).length, 0
      );
      
      return `
        <div class="category-item">
          <span class="category-name">${category}</span>
          <span class="category-count">${count}</span>
        </div>
      `;
    }).join('');
  }

  private prioritizeIssues(data: ProcessedAuditData): any[] {
    const allIssues = data.pages.flatMap(page => page.issues);
    
    // Group by issue type and calculate priority
    const groupedIssues = allIssues.reduce((groups, issue) => {
      if (!groups[issue.id]) {
        groups[issue.id] = {
          title: issue.title,
          description: issue.description,
          count: 0,
          totalSavings: 0,
          severity: issue.severity
        };
      }
      groups[issue.id].count++;
      groups[issue.id].totalSavings += issue.estimatedSavings.timeMs;
      return groups;
    }, {} as any);

    // Convert to array and sort by impact
    return Object.values(groupedIssues)
      .map((issue: any) => ({
        ...issue,
        impact: this.calculateImpact(issue),
        effort: this.calculateEffort(issue),
        priority: this.calculatePriority(issue),
        savings: issue.totalSavings
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10); // Top 10 issues
  }

  private calculateImpact(issue: any): string {
    const avgSavings = issue.totalSavings / issue.count;
    if (avgSavings > 2000) return 'High';
    if (avgSavings > 1000) return 'Medium';
    return 'Low';
  }

  private calculateEffort(issue: any): string {
    // Simple heuristic based on issue type
    if (issue.title.includes('unused')) return 'Low';
    if (issue.title.includes('image')) return 'Medium';
    return 'High';
  }

  private calculatePriority(issue: any): number {
    const severityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    const impactWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    const effortWeight: Record<string, number> = { Low: 3, Medium: 2, High: 1 };
    
    return (severityWeight[issue.severity] || 1) * 
           (impactWeight[this.calculateImpact(issue)] || 1) * 
           (effortWeight[this.calculateEffort(issue)] || 1) * 
           issue.count;
  }
}