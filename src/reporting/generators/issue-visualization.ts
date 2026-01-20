/**
 * Issue Visualization - Interactive issue explorer with code examples
 * 
 * This module creates interactive issue exploration interfaces with
 * syntax highlighting, implementation difficulty indicators, and
 * clear action item workflows.
 */

import type { ProcessedAuditData, PageAuditResult, Issue, ActionableRecommendation } from './report-generator-engine.js';

/**
 * Configuration options for the issue explorer visualization.
 */
export interface IssueVisualizationConfig {
  enableSyntaxHighlighting: boolean;
  enableCodeExamples: boolean;
  enableDifficultyIndicators: boolean;
  enableActionWorkflows: boolean;
  groupSimilarIssues: boolean;
  theme: 'light' | 'dark' | 'auto';
}

/**
 * Grouped issue model used for rendering the explorer.
 */
export interface IssueGroup {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;

  affectedPages: PageIssueInfo[];
  totalSavings: number;
  recommendations: ActionableRecommendation[];
  codeExamples: CodeExample[];
}

/**
 * Page-level issue info used within a grouped issue.
 */
export interface PageIssueInfo {
  pageLabel: string;
  pagePath: string;
  issueCount: number;
  estimatedSavings: number;
  resources: string[];
}

/**
 * Code example entry used within issue recommendations.
 */
export interface CodeExample {
  language: string;
  title: string;
  description: string;
  beforeCode?: string;

  afterCode?: string;
  singleCode?: string;
  framework?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Multi-step action workflow to address a grouped issue.
 */
export interface ActionWorkflow {
  id: string;
  title: string;
  steps: ActionStep[];
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisites: string[];
}

/**
 * Single step in an action workflow.
 */
export interface ActionStep {
  stepNumber: number;
  title: string;
  description: string;
  codeExample?: string;
  verificationMethod: string;
}

/**
 * Generates interactive issue visualization with code examples and workflows
 */
export class IssueVisualization {
  private config: IssueVisualizationConfig;

  constructor(config: IssueVisualizationConfig = {
    enableSyntaxHighlighting: true,
    enableCodeExamples: true,
    enableDifficultyIndicators: true,
    enableActionWorkflows: true,
    groupSimilarIssues: true,
    theme: 'auto'
  }) {
    this.config = config;
  }

  /**
   * Generate complete issue visualization interface
   */
  async generateIssueExplorer(data: ProcessedAuditData): Promise<string> {
    const issueGroups = this.groupIssues(data);
    
    return `
    <div class="issue-explorer">
      ${this.generateExplorerHeader(data)}
      ${this.generateFilterControls(issueGroups)}
      ${this.generateIssueOverview(issueGroups)}
      ${this.generateIssueGroups(issueGroups)}
      ${this.generateActionWorkflows(issueGroups)}
    </div>
    
    <style>
      ${this.generateIssueCSS()}
    </style>
    
    <script>
      ${this.generateIssueScripts()}
    </script>`;
  }
  /**
   * Generate explorer header with summary statistics
   */
  private generateExplorerHeader(data: ProcessedAuditData): string {
    const totalIssues = data.pages.reduce((sum, page) => sum + page.issues.length, 0);
    const criticalIssues = data.pages.reduce((sum, page) => 
      sum + page.issues.filter(issue => issue.severity === 'critical').length, 0
    );
    
    return `
    <div class="explorer-header">
      <div class="header-content">
        <h1 class="explorer-title">Issue Explorer</h1>
        <p class="explorer-subtitle">Interactive analysis of ${totalIssues} performance issues across ${data.performanceMetrics.totalPages} pages</p>
        
        <div class="issue-stats">
          <div class="stat-item critical">
            <div class="stat-icon">🚨</div>
            <div class="stat-content">
              <div class="stat-value">${criticalIssues}</div>
              <div class="stat-label">Critical Issues</div>
            </div>
          </div>
          
          <div class="stat-item">
            <div class="stat-icon">⏱️</div>
            <div class="stat-content">
              <div class="stat-value">${Math.round(data.performanceMetrics.estimatedTotalSavings / 1000)}s</div>
              <div class="stat-label">Potential Savings</div>
            </div>
          </div>
          
          <div class="stat-item">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">${this.countUniqueIssueTypes(data)}</div>
              <div class="stat-label">Issue Types</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate filter and search controls
   */
  private generateFilterControls(issueGroups: IssueGroup[]): string {
    const categories = [...new Set(issueGroups.map(group => group.category))];
    const severities = ['critical', 'high', 'medium', 'low'];
    
    return `
    <div class="filter-controls">
      <div class="controls-row">
        <div class="search-box">
          <input type="text" id="issueSearch" placeholder="Search issues..." class="search-input">
          <div class="search-icon">🔍</div>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Severity</label>
          <select id="severityFilter" class="filter-select">
            <option value="">All Severities</option>
            ${severities.map(severity => 
              `<option value="${severity}">${severity.charAt(0).toUpperCase() + severity.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Category</label>
          <select id="categoryFilter" class="filter-select">
            <option value="">All Categories</option>
            ${categories.map(category => 
              `<option value="${category}">${category.charAt(0).toUpperCase() + category.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Difficulty</label>
          <select id="difficultyFilter" class="filter-select">
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        
        <button class="btn btn-secondary" onclick="clearIssueFilters()">Clear Filters</button>
      </div>
      
      <div class="view-controls">
        <div class="view-toggle">
          <button class="view-btn active" data-view="grouped" onclick="setIssueView('grouped')">Grouped View</button>
          <button class="view-btn" data-view="list" onclick="setIssueView('list')">List View</button>
          <button class="view-btn" data-view="timeline" onclick="setIssueView('timeline')">Priority Timeline</button>
        </div>
        
        <div class="sort-controls">
          <label class="sort-label">Sort by:</label>
          <select id="sortBy" class="sort-select">
            <option value="severity">Severity</option>
            <option value="savings">Potential Savings</option>
            <option value="pages">Affected Pages</option>
            <option value="difficulty">Implementation Difficulty</option>
          </select>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate issue overview dashboard
   */
  private generateIssueOverview(issueGroups: IssueGroup[]): string {
    return `
    <div class="issue-overview">
      <div class="overview-charts">
        <div class="chart-card">
          <h3 class="chart-title">Issues by Severity</h3>
          <div class="chart-container">
            <canvas id="severityChart"></canvas>
          </div>
        </div>
        
        <div class="chart-card">
          <h3 class="chart-title">Issues by Category</h3>
          <div class="chart-container">
            <canvas id="categoryChart"></canvas>
          </div>
        </div>
        
        <div class="chart-card">
          <h3 class="chart-title">Potential Savings Distribution</h3>
          <div class="chart-container">
            <canvas id="savingsChart"></canvas>
          </div>
        </div>
      </div>
      
      <div class="quick-actions">
        <h3>Quick Actions</h3>
        <div class="action-buttons">
          <button class="action-btn critical" onclick="filterBySeverity('critical')">
            <span class="btn-icon">🚨</span>
            Fix Critical Issues First
          </button>
          <button class="action-btn easy" onclick="filterByDifficulty('easy')">
            <span class="btn-icon">⚡</span>
            Show Quick Wins
          </button>
          <button class="action-btn savings" onclick="sortBySavings()">
            <span class="btn-icon">💰</span>
            Highest Impact First
          </button>
        </div>
      </div>
    </div>`;
  }
  /**
   * Generate issue groups with detailed information
   */
  private generateIssueGroups(issueGroups: IssueGroup[]): string {
    return `
    <div class="issue-groups" id="issueGroups">
      ${issueGroups.map(group => this.generateIssueGroup(group)).join('')}
    </div>`;
  }

  /**
   * Generate individual issue group
   */
  private generateIssueGroup(group: IssueGroup): string {
    const difficultyClass = this.getDifficultyClass(group.recommendations[0]?.implementation.difficulty || 'medium');
    
    return `
    <div class="issue-group ${group.severity}" 
         data-severity="${group.severity}" 
         data-category="${group.category}"
         data-difficulty="${group.recommendations[0]?.implementation.difficulty || 'medium'}"
         data-savings="${group.totalSavings}">
      
      <div class="group-header" onclick="toggleIssueGroup('${group.id}')">
        <div class="header-main">
          <h3 class="group-title">${group.title}</h3>
          <div class="group-badges">
            <span class="severity-badge ${group.severity}">${group.severity}</span>
            <span class="category-badge">${group.category}</span>
            <span class="difficulty-badge ${difficultyClass}">
              ${group.recommendations[0]?.implementation.difficulty || 'medium'} fix
            </span>
          </div>
        </div>
        
        <div class="header-stats">
          <div class="stat">
            <span class="stat-value">${group.affectedPages.length}</span>
            <span class="stat-label">pages</span>
          </div>
          <div class="stat">
            <span class="stat-value">${Math.round(group.totalSavings / 1000)}s</span>
            <span class="stat-label">savings</span>
          </div>
          <div class="expand-icon">▼</div>
        </div>
      </div>
      
      <div class="group-content" id="content-${group.id}">
        <div class="issue-description">
          <p>${group.description}</p>
        </div>
        
        <div class="affected-pages">
          <h4>Affected Pages (${group.affectedPages.length})</h4>
          <div class="pages-list">
            ${group.affectedPages.slice(0, 5).map(page => `
              <div class="page-item">
                <div class="page-info">
                  <span class="page-name">${page.pageLabel}</span>
                  <span class="page-path">${page.pagePath}</span>
                </div>
                <div class="page-stats">
                  <span class="page-savings">${Math.round(page.estimatedSavings / 1000)}s</span>
                </div>
              </div>
            `).join('')}
            ${group.affectedPages.length > 5 ? `
              <div class="show-more" onclick="showAllPages('${group.id}')">
                Show ${group.affectedPages.length - 5} more pages...
              </div>
            ` : ''}
          </div>
        </div>
        
        ${this.generateRecommendations(group)}
        ${this.config.enableCodeExamples ? this.generateCodeExamples(group) : ''}
        ${this.config.enableActionWorkflows ? this.generateActionSteps(group) : ''}
      </div>
    </div>`;
  }

  /**
   * Generate recommendations section
   */
  private generateRecommendations(group: IssueGroup): string {
    if (!group.recommendations.length) return '';
    
    const recommendation = group.recommendations[0];
    
    return `
    <div class="recommendations">
      <h4>Recommended Solution</h4>
      <div class="recommendation-card">
        <div class="recommendation-header">
          <span class="recommendation-action">${recommendation.action}</span>
          <div class="recommendation-meta">
            <span class="difficulty ${this.getDifficultyClass(recommendation.implementation.difficulty)}">
              ${recommendation.implementation.difficulty}
            </span>
            <span class="time-estimate">${recommendation.implementation.estimatedTime}</span>
            ${recommendation.framework ? `<span class="framework">${recommendation.framework}</span>` : ''}
          </div>
        </div>
        
        ${recommendation.implementation.documentation.length > 0 ? `
          <div class="documentation-links">
            <h5>Documentation:</h5>
            <ul>
              ${recommendation.implementation.documentation.map(link => 
                `<li><a href="${link}" target="_blank" rel="noopener">${this.extractDomainFromUrl(link)}</a></li>`
              ).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    </div>`;
  }

  /**
   * Generate code examples with syntax highlighting
   */
  private generateCodeExamples(group: IssueGroup): string {
    if (!group.codeExamples.length) return '';
    
    return `
    <div class="code-examples">
      <h4>Code Examples</h4>
      <div class="examples-container">
        ${group.codeExamples.map((example, index) => `
          <div class="code-example" data-language="${example.language}">
            <div class="example-header">
              <h5 class="example-title">${example.title}</h5>
              <div class="example-meta">
                <span class="language-badge">${example.language}</span>
                <span class="difficulty-badge ${this.getDifficultyClass(example.difficulty)}">
                  ${example.difficulty}
                </span>
                ${example.framework ? `<span class="framework-badge">${example.framework}</span>` : ''}
              </div>
            </div>
            
            <p class="example-description">${example.description}</p>
            
            ${example.beforeCode && example.afterCode ? `
              <div class="code-comparison">
                <div class="code-before">
                  <div class="code-label">❌ Before (problematic)</div>
                  <pre class="code-block"><code class="language-${example.language}">${this.escapeHtml(example.beforeCode)}</code></pre>
                </div>
                <div class="code-after">
                  <div class="code-label">✅ After (optimized)</div>
                  <pre class="code-block"><code class="language-${example.language}">${this.escapeHtml(example.afterCode)}</code></pre>
                </div>
              </div>
            ` : example.singleCode ? `
              <div class="code-single">
                <div class="code-label">💡 Implementation</div>
                <pre class="code-block"><code class="language-${example.language}">${this.escapeHtml(example.singleCode)}</code></pre>
              </div>
            ` : ''}
            
            <div class="code-actions">
              <button class="btn btn-sm" onclick="copyCode('example-${group.id}-${index}')">
                📋 Copy Code
              </button>
              <button class="btn btn-sm" onclick="showFullExample('${group.id}', ${index})">
                🔍 View Details
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }
  /**
   * Generate action steps workflow
   */
  private generateActionSteps(group: IssueGroup): string {
    const workflow = this.createWorkflowFromRecommendation(group);
    if (!workflow) return '';
    
    return `
    <div class="action-workflow">
      <h4>Step-by-Step Implementation</h4>
      <div class="workflow-card">
        <div class="workflow-header">
          <div class="workflow-info">
            <span class="workflow-title">${workflow.title}</span>
            <span class="workflow-time">⏱️ ${workflow.estimatedTime}</span>
            <span class="workflow-difficulty ${this.getDifficultyClass(workflow.difficulty)}">
              ${workflow.difficulty}
            </span>
          </div>
        </div>
        
        ${workflow.prerequisites.length > 0 ? `
          <div class="prerequisites">
            <h5>Prerequisites:</h5>
            <ul>
              ${workflow.prerequisites.map(prereq => `<li>${prereq}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div class="workflow-steps">
          ${workflow.steps.map((step, index) => `
            <div class="workflow-step">
              <div class="step-marker">
                <span class="step-number">${step.stepNumber}</span>
              </div>
              <div class="step-content">
                <h6 class="step-title">${step.title}</h6>
                <p class="step-description">${step.description}</p>
                
                ${step.codeExample ? `
                  <div class="step-code">
                    <pre class="code-block"><code>${this.escapeHtml(step.codeExample)}</code></pre>
                  </div>
                ` : ''}
                
                <div class="step-verification">
                  <strong>Verification:</strong> ${step.verificationMethod}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="workflow-actions">
          <button class="btn btn-primary" onclick="startWorkflow('${workflow.id}')">
            🚀 Start Implementation
          </button>
          <button class="btn btn-secondary" onclick="exportWorkflow('${workflow.id}')">
            📄 Export Checklist
          </button>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate action workflows section
   */
  private generateActionWorkflows(issueGroups: IssueGroup[]): string {
    const criticalWorkflows = issueGroups
      .filter(group => group.severity === 'critical')
      .slice(0, 3)
      .map(group => this.createWorkflowFromRecommendation(group))
      .filter(Boolean);
    
    if (!criticalWorkflows.length) return '';
    
    return `
    <div class="action-workflows-section">
      <h2 class="section-title">Priority Action Workflows</h2>
      <p class="section-description">
        Step-by-step implementation guides for your most critical performance issues
      </p>
      
      <div class="workflows-grid">
        ${criticalWorkflows.map(workflow => `
          <div class="workflow-summary-card">
            <div class="workflow-summary-header">
              <h3 class="workflow-summary-title">${workflow!.title}</h3>
              <div class="workflow-summary-meta">
                <span class="time-badge">⏱️ ${workflow!.estimatedTime}</span>
                <span class="difficulty-badge ${this.getDifficultyClass(workflow!.difficulty)}">
                  ${workflow!.difficulty}
                </span>
              </div>
            </div>
            
            <div class="workflow-summary-steps">
              <div class="steps-count">${workflow!.steps.length} steps</div>
              <div class="steps-preview">
                ${workflow!.steps.slice(0, 2).map(step => `
                  <div class="step-preview">${step.stepNumber}. ${step.title}</div>
                `).join('')}
                ${workflow!.steps.length > 2 ? `<div class="step-preview">...</div>` : ''}
              </div>
            </div>
            
            <div class="workflow-summary-actions">
              <button class="btn btn-primary" onclick="scrollToWorkflow('${workflow!.id}')">
                View Full Workflow
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  /**
   * Generate CSS styles for issue visualization
   */
  private generateIssueCSS(): string {
    return `
    .issue-explorer {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: var(--text-primary);
    }

    .explorer-header {
      background: linear-gradient(135deg, #1e293b, #334155);
      color: white;
      padding: 2rem 0;
      margin-bottom: 2rem;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    .explorer-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .explorer-subtitle {
      font-size: 1.125rem;
      opacity: 0.9;
      margin-bottom: 2rem;
    }

    .issue-stats {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 0.75rem;
      padding: 1rem 1.5rem;
    }

    .stat-item.critical {
      background: rgba(239, 68, 68, 0.2);
    }

    .stat-icon {
      font-size: 1.5rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.875rem;
      opacity: 0.9;
    }

    .filter-controls {
      max-width: 1200px;
      margin: 0 auto 2rem;
      padding: 0 1rem;
    }

    .controls-row {
      display: flex;
      gap: 1rem;
      align-items: end;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }

    .search-box {
      position: relative;
      flex: 1;
      min-width: 250px;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 2.5rem 0.75rem 1rem;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      background: var(--surface-color);
      font-size: 1rem;
    }

    .search-icon {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .filter-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .filter-select {
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      background: var(--surface-color);
      min-width: 120px;
    }

    .view-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .view-toggle {
      display: flex;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .view-btn {
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      cursor: pointer;
      transition: all 0.2s;
    }

    .view-btn.active {
      background: var(--primary-color);
      color: white;
    }

    .issue-overview {
      max-width: 1200px;
      margin: 0 auto 3rem;
      padding: 0 1rem;
    }

    .overview-charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .chart-card {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .chart-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .chart-container {
      height: 200px;
    }

    .quick-actions {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .action-buttons {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn.critical {
      background: var(--error-color);
      color: white;
    }

    .action-btn.easy {
      background: var(--success-color);
      color: white;
    }

    .action-btn.savings {
      background: var(--warning-color);
      color: white;
    }

    .issue-groups {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    .issue-group {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      margin-bottom: 1.5rem;
      overflow: hidden;
      transition: all 0.2s;
    }

    .issue-group.critical {
      border-left: 4px solid var(--error-color);
    }

    .issue-group.high {
      border-left: 4px solid #f97316;
    }

    .issue-group.medium {
      border-left: 4px solid var(--warning-color);
    }

    .issue-group.low {
      border-left: 4px solid var(--success-color);
    }

    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .group-header:hover {
      background: var(--background-color);
    }

    .header-main {
      flex: 1;
    }

    .group-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .group-badges {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .severity-badge,
    .category-badge,
    .difficulty-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .severity-badge.critical { background: var(--error-color); color: white; }
    .severity-badge.high { background: #f97316; color: white; }
    .severity-badge.medium { background: var(--warning-color); color: white; }
    .severity-badge.low { background: var(--success-color); color: white; }

    .category-badge {
      background: var(--primary-color);
      color: white;
    }

    .difficulty-badge.easy { background: #22c55e; color: white; }
    .difficulty-badge.medium { background: var(--warning-color); color: white; }
    .difficulty-badge.hard { background: var(--error-color); color: white; }

    .header-stats {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 1.125rem;
      font-weight: 700;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .expand-icon {
      font-size: 0.875rem;
      color: var(--text-secondary);
      transition: transform 0.2s;
    }

    .issue-group.expanded .expand-icon {
      transform: rotate(180deg);
    }

    .group-content {
      display: none;
      padding: 0 1.5rem 1.5rem;
      border-top: 1px solid var(--border-color);
    }

    .issue-group.expanded .group-content {
      display: block;
    }

    .issue-description {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: var(--background-color);
      border-radius: 0.5rem;
    }

    .affected-pages {
      margin-bottom: 1.5rem;
    }

    .pages-list {
      background: var(--background-color);
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .page-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    .page-item:last-child {
      border-bottom: none;
    }

    .page-name {
      font-weight: 600;
    }

    .page-path {
      display: block;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .page-savings {
      font-weight: 600;
      color: var(--success-color);
    }

    .show-more {
      padding: 0.75rem 1rem;
      text-align: center;
      color: var(--primary-color);
      cursor: pointer;
      font-weight: 600;
    }

    .show-more:hover {
      background: var(--surface-color);
    }

    .code-examples {
      margin-bottom: 1.5rem;
    }

    .code-example {
      background: var(--background-color);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      overflow: hidden;
    }

    .example-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--surface-color);
      border-bottom: 1px solid var(--border-color);
    }

    .example-title {
      font-weight: 600;
    }

    .example-meta {
      display: flex;
      gap: 0.5rem;
    }

    .language-badge,
    .framework-badge {
      padding: 0.25rem 0.5rem;
      background: var(--primary-color);
      color: white;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    .example-description {
      padding: 1rem;
      margin: 0;
      color: var(--text-secondary);
    }

    .code-comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      padding: 1rem;
    }

    .code-single {
      padding: 1rem;
    }

    .code-label {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }

    .code-before .code-label {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color);
    }

    .code-after .code-label {
      background: rgba(34, 197, 94, 0.1);
      color: var(--success-color);
    }

    .code-single .code-label {
      background: rgba(59, 130, 246, 0.1);
      color: var(--primary-color);
    }

    .code-block {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 0.25rem;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0;
    }

    .code-actions {
      display: flex;
      gap: 0.5rem;
      padding: 1rem;
      border-top: 1px solid var(--border-color);
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.25rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
    }

    .btn-secondary {
      background: var(--surface-color);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }

    .btn-sm {
      padding: 0.25rem 0.75rem;
      font-size: 0.875rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .explorer-title {
        font-size: 2rem;
      }

      .issue-stats {
        flex-direction: column;
        gap: 1rem;
      }

      .stat-item {
        width: 100%;
      }

      .controls-row {
        flex-direction: column;
        align-items: stretch;
      }

      .search-box {
        min-width: auto;
      }

      .view-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .overview-charts {
        grid-template-columns: 1fr;
      }

      .action-buttons {
        flex-direction: column;
      }

      .group-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .header-stats {
        justify-content: space-around;
      }

      .code-comparison {
        grid-template-columns: 1fr;
      }
    }
    `;
  }
  /**
   * Generate JavaScript for issue visualization interactivity
   */
  private generateIssueScripts(): string {
    return `
    // Issue Explorer JavaScript
    document.addEventListener('DOMContentLoaded', function() {
      initializeIssueExplorer();
      initializeCharts();
      initializeFilters();
      ${this.config.enableSyntaxHighlighting ? 'initializeSyntaxHighlighting();' : ''}
    });

    function initializeIssueExplorer() {
      // Set up event listeners for issue groups
      const groupHeaders = document.querySelectorAll('.group-header');
      groupHeaders.forEach(header => {
        header.addEventListener('click', function() {
          const groupId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
          toggleIssueGroup(groupId);
        });
      });
    }

    function initializeCharts() {
      // Severity distribution chart
      const severityCtx = document.getElementById('severityChart');
      if (severityCtx) {
        const severityData = calculateSeverityDistribution();
        new Chart(severityCtx, {
          type: 'doughnut',
          data: {
            labels: ['Critical', 'High', 'Medium', 'Low'],
            datasets: [{
              data: severityData,
              backgroundColor: ['#dc2626', '#f97316', '#d97706', '#16a34a']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' }
            }
          }
        });
      }

      // Category distribution chart
      const categoryCtx = document.getElementById('categoryChart');
      if (categoryCtx) {
        const categoryData = calculateCategoryDistribution();
        new Chart(categoryCtx, {
          type: 'bar',
          data: {
            labels: Object.keys(categoryData),
            datasets: [{
              label: 'Issues',
              data: Object.values(categoryData),
              backgroundColor: '#2563eb'
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

      // Savings distribution chart
      const savingsCtx = document.getElementById('savingsChart');
      if (savingsCtx) {
        const savingsData = calculateSavingsDistribution();
        new Chart(savingsCtx, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'Potential Savings vs Difficulty',
              data: savingsData,
              backgroundColor: '#2563eb'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { 
                title: { display: true, text: 'Implementation Difficulty' },
                type: 'category',
                labels: ['Easy', 'Medium', 'Hard']
              },
              y: { 
                title: { display: true, text: 'Potential Savings (seconds)' },
                beginAtZero: true
              }
            }
          }
        });
      }
    }

    function initializeFilters() {
      const searchInput = document.getElementById('issueSearch');
      const severityFilter = document.getElementById('severityFilter');
      const categoryFilter = document.getElementById('categoryFilter');
      const difficultyFilter = document.getElementById('difficultyFilter');
      const sortSelect = document.getElementById('sortBy');

      if (searchInput) searchInput.addEventListener('input', applyFilters);
      if (severityFilter) severityFilter.addEventListener('change', applyFilters);
      if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
      if (difficultyFilter) difficultyFilter.addEventListener('change', applyFilters);
      if (sortSelect) sortSelect.addEventListener('change', applySorting);
    }

    ${this.config.enableSyntaxHighlighting ? `
    function initializeSyntaxHighlighting() {
      // Initialize syntax highlighting for code blocks
      const codeBlocks = document.querySelectorAll('code[class*="language-"]');
      codeBlocks.forEach(block => {
        // Apply basic syntax highlighting
        highlightSyntax(block);
      });
    }

    function highlightSyntax(codeBlock) {
      const language = codeBlock.className.match(/language-(\w+)/)?.[1];
      if (!language) return;

      let html = codeBlock.innerHTML;
      
      // Basic syntax highlighting patterns
      const patterns = {
        javascript: [
          { pattern: /\\b(const|let|var|function|return|if|else|for|while|class|import|export)\\b/g, class: 'keyword' },
          { pattern: /"([^"\\\\]|\\\\.)*"/g, class: 'string' },
          { pattern: /'([^'\\\\]|\\\\.)*'/g, class: 'string' },
          { pattern: /\\/\\/.*$/gm, class: 'comment' },
          { pattern: /\\/\\*[\\s\\S]*?\\*\\//g, class: 'comment' }
        ],
        css: [
          { pattern: /\\b(color|background|margin|padding|border|width|height|display|position)\\b/g, class: 'property' },
          { pattern: /#[a-fA-F0-9]{3,6}\\b/g, class: 'color' },
          { pattern: /\\.[a-zA-Z][a-zA-Z0-9_-]*/g, class: 'selector' }
        ]
      };

      if (patterns[language]) {
        patterns[language].forEach(({ pattern, class: className }) => {
          html = html.replace(pattern, \`<span class="syntax-\${className}">$&</span>\`);
        });
        codeBlock.innerHTML = html;
      }
    }
    ` : ''}

    function toggleIssueGroup(groupId) {
      const group = document.querySelector(\`[data-group-id="\${groupId}"]\`) || 
                   document.querySelector(\`.issue-group:has(#content-\${groupId})\`);
      if (group) {
        group.classList.toggle('expanded');
      }
    }

    function applyFilters() {
      const searchTerm = document.getElementById('issueSearch')?.value.toLowerCase() || '';
      const severityFilter = document.getElementById('severityFilter')?.value || '';
      const categoryFilter = document.getElementById('categoryFilter')?.value || '';
      const difficultyFilter = document.getElementById('difficultyFilter')?.value || '';

      const issueGroups = document.querySelectorAll('.issue-group');
      
      issueGroups.forEach(group => {
        let show = true;

        // Search filter
        if (searchTerm) {
          const title = group.querySelector('.group-title')?.textContent.toLowerCase() || '';
          const description = group.querySelector('.issue-description')?.textContent.toLowerCase() || '';
          if (!title.includes(searchTerm) && !description.includes(searchTerm)) {
            show = false;
          }
        }

        // Severity filter
        if (severityFilter && group.dataset.severity !== severityFilter) {
          show = false;
        }

        // Category filter
        if (categoryFilter && group.dataset.category !== categoryFilter) {
          show = false;
        }

        // Difficulty filter
        if (difficultyFilter && group.dataset.difficulty !== difficultyFilter) {
          show = false;
        }

        group.style.display = show ? 'block' : 'none';
      });

      updateFilterStats();
    }

    function applySorting() {
      const sortBy = document.getElementById('sortBy')?.value || 'severity';
      const container = document.getElementById('issueGroups');
      const groups = Array.from(container.querySelectorAll('.issue-group'));

      groups.sort((a, b) => {
        switch (sortBy) {
          case 'severity':
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return severityOrder[b.dataset.severity] - severityOrder[a.dataset.severity];
          
          case 'savings':
            return parseInt(b.dataset.savings) - parseInt(a.dataset.savings);
          
          case 'pages':
            const aPagesCount = a.querySelectorAll('.page-item').length;
            const bPagesCount = b.querySelectorAll('.page-item').length;
            return bPagesCount - aPagesCount;
          
          case 'difficulty':
            const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
            return difficultyOrder[a.dataset.difficulty] - difficultyOrder[b.dataset.difficulty];
          
          default:
            return 0;
        }
      });

      groups.forEach(group => container.appendChild(group));
    }

    function clearIssueFilters() {
      document.getElementById('issueSearch').value = '';
      document.getElementById('severityFilter').value = '';
      document.getElementById('categoryFilter').value = '';
      document.getElementById('difficultyFilter').value = '';
      applyFilters();
    }

    function setIssueView(viewType) {
      const viewButtons = document.querySelectorAll('.view-btn');
      viewButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelector(\`[data-view="\${viewType}"]\`).classList.add('active');

      const container = document.getElementById('issueGroups');
      container.className = \`issue-groups view-\${viewType}\`;
    }

    function filterBySeverity(severity) {
      document.getElementById('severityFilter').value = severity;
      applyFilters();
    }

    function filterByDifficulty(difficulty) {
      document.getElementById('difficultyFilter').value = difficulty;
      applyFilters();
    }

    function sortBySavings() {
      document.getElementById('sortBy').value = 'savings';
      applySorting();
    }

    function copyCode(exampleId) {
      const codeBlock = document.querySelector(\`#\${exampleId} .code-block code\`);
      if (codeBlock) {
        navigator.clipboard.writeText(codeBlock.textContent).then(() => {
          showToast('Code copied to clipboard!');
        });
      }
    }

    function showFullExample(groupId, exampleIndex) {
      // Implementation for showing full code example in modal
      console.log('Showing full example:', groupId, exampleIndex);
    }

    function startWorkflow(workflowId) {
      // Implementation for starting workflow tracking
      console.log('Starting workflow:', workflowId);
      showToast('Workflow started! Track your progress in the implementation guide.');
    }

    function exportWorkflow(workflowId) {
      // Implementation for exporting workflow as checklist
      console.log('Exporting workflow:', workflowId);
    }

    function scrollToWorkflow(workflowId) {
      const element = document.getElementById(\`workflow-\${workflowId}\`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }

    function showAllPages(groupId) {
      const pagesList = document.querySelector(\`#content-\${groupId} .pages-list\`);
      const showMoreBtn = pagesList.querySelector('.show-more');
      if (showMoreBtn) {
        showMoreBtn.style.display = 'none';
        // Show all hidden pages
        const hiddenPages = pagesList.querySelectorAll('.page-item[style*="display: none"]');
        hiddenPages.forEach(page => page.style.display = 'flex');
      }
    }

    function updateFilterStats() {
      const visibleGroups = document.querySelectorAll('.issue-group[style*="block"], .issue-group:not([style*="none"])');
      const totalGroups = document.querySelectorAll('.issue-group');
      
      // Update stats display if exists
      const statsElement = document.querySelector('.filter-stats');
      if (statsElement) {
        statsElement.textContent = \`Showing \${visibleGroups.length} of \${totalGroups.length} issues\`;
      }
    }

    function showToast(message) {
      // Simple toast notification
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      toast.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        z-index: 1000;
        animation: slideIn 0.3s ease;
      \`;
      
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }

    // Helper functions for chart data calculation
    function calculateSeverityDistribution() {
      const groups = document.querySelectorAll('.issue-group');
      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      
      groups.forEach(group => {
        const severity = group.dataset.severity;
        if (counts.hasOwnProperty(severity)) {
          counts[severity]++;
        }
      });
      
      return [counts.critical, counts.high, counts.medium, counts.low];
    }

    function calculateCategoryDistribution() {
      const groups = document.querySelectorAll('.issue-group');
      const counts = {};
      
      groups.forEach(group => {
        const category = group.dataset.category;
        counts[category] = (counts[category] || 0) + 1;
      });
      
      return counts;
    }

    function calculateSavingsDistribution() {
      const groups = document.querySelectorAll('.issue-group');
      const data = [];
      
      groups.forEach(group => {
        const savings = parseInt(group.dataset.savings) / 1000; // Convert to seconds
        const difficulty = group.dataset.difficulty;
        const difficultyIndex = { easy: 0, medium: 1, hard: 2 }[difficulty] || 1;
        
        data.push({ x: difficultyIndex, y: savings });
      });
      
      return data;
    }
    `;
  }

  /**
   * Helper methods
   */
  private groupIssues(data: ProcessedAuditData): IssueGroup[] {
    if (!this.config.groupSimilarIssues) {
      // Return individual issues without grouping
      return data.pages.flatMap(page => 
        page.issues.map(issue => ({
          id: `${page.path}-${issue.id}`,
          title: issue.title,
          description: issue.description,
          severity: issue.severity,
          category: issue.category,
          affectedPages: [{
            pageLabel: page.label,
            pagePath: page.path,
            issueCount: 1,
            estimatedSavings: issue.estimatedSavings.timeMs,
            resources: issue.affectedResources.map(r => r.url)
          }],
          totalSavings: issue.estimatedSavings.timeMs,
          recommendations: issue.fixRecommendations,
          codeExamples: this.generateCodeExamplesForIssue(issue)
        }))
      );
    }

    // Group similar issues across pages
    const issueMap = new Map<string, IssueGroup>();
    
    data.pages.forEach(page => {
      page.issues.forEach(issue => {
        if (!issueMap.has(issue.id)) {
          issueMap.set(issue.id, {
            id: issue.id,
            title: issue.title,
            description: issue.description,
            severity: issue.severity,
            category: issue.category,
            affectedPages: [],
            totalSavings: 0,
            recommendations: issue.fixRecommendations,
            codeExamples: this.generateCodeExamplesForIssue(issue)
          });
        }
        
        const group = issueMap.get(issue.id)!;
        group.affectedPages.push({
          pageLabel: page.label,
          pagePath: page.path,
          issueCount: 1,
          estimatedSavings: issue.estimatedSavings.timeMs,
          resources: issue.affectedResources.map(r => r.url)
        });
        group.totalSavings += issue.estimatedSavings.timeMs;
      });
    });

    return Array.from(issueMap.values())
      .sort((a, b) => {
        // Sort by severity first, then by total savings
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.totalSavings - a.totalSavings;
      });
  }

  private generateCodeExamplesForIssue(issue: Issue): CodeExample[] {
    const examples: CodeExample[] = [];
    
    // Generate code examples based on issue type
    switch (issue.id) {
      case 'unused-javascript':
        examples.push({
          language: 'javascript',
          title: 'Dynamic Import for Code Splitting',
          description: 'Replace static imports with dynamic imports to reduce initial bundle size',
          beforeCode: `import { heavyLibrary } from './heavy-library';

function handleClick() {
  heavyLibrary.doSomething();
}`,
          afterCode: `async function handleClick() {
  const { heavyLibrary } = await import('./heavy-library');
  heavyLibrary.doSomething();
}`,
          framework: 'nextjs',
          difficulty: 'medium'
        });
        break;
        
      case 'unused-css-rules':
        examples.push({
          language: 'css',
          title: 'Remove Unused CSS Rules',
          description: 'Identify and remove CSS rules that are not used in your application',
          singleCode: `/* Remove unused styles like these */
.unused-class {
  color: red;
  font-size: 16px;
}

/* Keep only styles that are actually used */
.active-button {
  background: #2563eb;
  color: white;
}`,
          difficulty: 'easy'
        });
        break;
        
      case 'render-blocking-resources':
        examples.push({
          language: 'html',
          title: 'Optimize Resource Loading',
          description: 'Use async/defer attributes and preload critical resources',
          beforeCode: `<link rel="stylesheet" href="styles.css">
<script src="app.js"></script>`,
          afterCode: `<link rel="preload" href="critical.css" as="style">
<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">
<script src="app.js" defer></script>`,
          difficulty: 'easy'
        });
        break;
    }
    
    return examples;
  }

  private createWorkflowFromRecommendation(group: IssueGroup): ActionWorkflow | null {
    if (!group.recommendations.length) return null;
    
    const recommendation = group.recommendations[0];
    
    return {
      id: `workflow-${group.id}`,
      title: `Fix ${group.title}`,
      estimatedTime: recommendation.implementation.estimatedTime,
      difficulty: recommendation.implementation.difficulty,
      prerequisites: this.getPrerequisites(group),
      steps: this.generateWorkflowSteps(group, recommendation)
    };
  }

  private getPrerequisites(group: IssueGroup): string[] {
    const prerequisites: string[] = [];
    
    if (group.category === 'javascript') {
      prerequisites.push('Access to build configuration');
      prerequisites.push('Understanding of JavaScript modules');
    }
    
    if (group.category === 'css') {
      prerequisites.push('CSS build process knowledge');
    }
    
    if (group.category === 'images') {
      prerequisites.push('Image optimization tools');
    }
    
    return prerequisites;
  }

  private generateWorkflowSteps(group: IssueGroup, recommendation: ActionableRecommendation): ActionStep[] {
    const steps: ActionStep[] = [];
    
    // Generate generic workflow steps based on issue type
    steps.push({
      stepNumber: 1,
      title: 'Identify Affected Files',
      description: `Locate the files causing the ${group.title.toLowerCase()} issue`,
      verificationMethod: 'Check browser DevTools Network tab for the identified resources'
    });
    
    steps.push({
      stepNumber: 2,
      title: 'Implement Fix',
      description: recommendation.action,
      codeExample: recommendation.implementation.codeExample,
      verificationMethod: 'Run build process and verify no errors occur'
    });
    
    steps.push({
      stepNumber: 3,
      title: 'Test Performance Impact',
      description: 'Measure the performance improvement after implementing the fix',
      verificationMethod: 'Run Lighthouse audit and compare scores before and after'
    });
    
    return steps;
  }

  private countUniqueIssueTypes(data: ProcessedAuditData): number {
    const issueTypes = new Set();
    data.pages.forEach(page => {
      page.issues.forEach(issue => {
        issueTypes.add(issue.id);
      });
    });
    return issueTypes.size;
  }

  private getDifficultyClass(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return 'easy';
      case 'medium': return 'medium';
      case 'hard': return 'hard';
      default: return 'medium';
    }
  }

  private extractDomainFromUrl(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}