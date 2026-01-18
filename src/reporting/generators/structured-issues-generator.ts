/**
 * Structured Issues Generator - Comprehensive issue data for AI processing
 * 
 * This generator creates detailed JSON reports with comprehensive issue data,
 * specific file paths, and machine-readable fix instructions for AI analysis.
 */

import type { ProcessedAuditData, Issue, PageAuditResult, ReportTemplate, ActionableRecommendation } from './report-generator-engine.js';

export interface StructuredIssuesReport {
  metadata: {
    generatedAt: string;
    version: string;
    totalPages: number;
    totalIssues: number;
    auditDuration: string;
    disclaimer: string;
  };
  issues: DetailedIssue[];
  filePaths: FilePathAnalysis[];
  optimizationRecommendations: OptimizationRecommendation[];
  machineReadableInstructions: MachineInstruction[];
}

export interface DetailedIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'javascript' | 'css' | 'images' | 'caching' | 'network';
  affectedPages: AffectedPage[];
  totalEstimatedSavings: {
    timeMs: number;
    bytes: number;
  };
  resources: DetailedResource[];
  fixInstructions: FixInstruction[];
  testingStrategy: TestingStrategy;
  priority: number;
}

export interface AffectedPage {
  path: string;
  label: string;
  device: 'mobile' | 'desktop';
  performanceScore: number;
  estimatedSavings: {
    timeMs: number;
    bytes: number;
  };
  specificResources: string[];
}

export interface DetailedResource {
  url: string;
  type: string;
  size: number;
  wastedBytes?: number;
  transferSize?: number;
  resourceType: 'script' | 'stylesheet' | 'image' | 'font' | 'document' | 'other';
  loadingStrategy?: 'eager' | 'lazy' | 'preload' | 'prefetch';
  compressionOpportunity?: boolean;
}

export interface FixInstruction {
  step: number;
  action: string;
  implementation: {
    type: 'code-change' | 'configuration' | 'build-process' | 'infrastructure';
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: string;
    prerequisites: string[];
    codeExamples: CodeExample[];
    configurationChanges: ConfigurationChange[];
  };
  validation: {
    method: string;
    expectedOutcome: string;
    metrics: string[];
  };
}

export interface CodeExample {
  language: string;
  framework?: string;
  filename?: string;
  before?: string;
  after: string;
  description: string;
  context: 'component' | 'configuration' | 'build' | 'server';
}

export interface ConfigurationChange {
  file: string;
  section: string;
  change: 'add' | 'modify' | 'remove';
  content: string;
  description: string;
}

export interface TestingStrategy {
  performanceTests: string[];
  functionalTests: string[];
  regressionTests: string[];
  monitoringMetrics: string[];
}

export interface FilePathAnalysis {
  path: string;
  issues: string[];
  optimizationOpportunities: string[];
  estimatedImpact: {
    performanceGain: number;
    implementationEffort: number;
  };
  recommendedActions: string[];
}

export interface OptimizationRecommendation {
  category: string;
  recommendation: string;
  applicableIssues: string[];
  implementation: {
    framework: string[];
    buildTools: string[];
    steps: DetailedStep[];
  };
  expectedResults: {
    performanceImprovement: string;
    bundleSizeReduction?: string;
    loadTimeImprovement?: string;
  };
}

export interface DetailedStep {
  order: number;
  description: string;
  codeChanges: CodeExample[];
  configurationUpdates: ConfigurationChange[];
  verification: string;
}

export interface MachineInstruction {
  issueId: string;
  automationLevel: 'full' | 'partial' | 'manual';
  commands: Command[];
  dependencies: string[];
  rollbackStrategy: string;
}

export interface Command {
  type: 'npm' | 'yarn' | 'file-edit' | 'configuration' | 'build';
  command: string;
  description: string;
  conditions?: string[];
  errorHandling?: string;
}

/**
 * Structured Issues Template - Generates comprehensive issue analysis
 */
export class StructuredIssuesTemplate implements ReportTemplate {
  name = 'structured-issues';
  format = 'json' as const;

  async generate(data: ProcessedAuditData): Promise<string> {
    const report = this.createStructuredIssuesReport(data);
    return JSON.stringify(report, null, 2);
  }

  /**
   * Create the main structured issues report
   */
  private createStructuredIssuesReport(data: ProcessedAuditData): StructuredIssuesReport {
    const allIssues = this.extractAllIssues(data);
    const detailedIssues = this.createDetailedIssues(allIssues, data);
    const filePaths = this.analyzeFilePaths(data);
    const optimizationRecommendations = this.generateOptimizationRecommendations(detailedIssues);
    const machineInstructions = this.generateMachineInstructions(detailedIssues);

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        totalPages: data.performanceMetrics.totalPages,
        totalIssues: detailedIssues.length,
        auditDuration: this.formatDuration(data.auditMetadata.elapsedMs),
        disclaimer: "Detailed analysis for AI processing. Scores may vary from DevTools due to automated testing environment."
      },
      issues: detailedIssues,
      filePaths,
      optimizationRecommendations,
      machineReadableInstructions: machineInstructions
    };
  }

  /**
   * Extract all issues from audit data with page context
   */
  private extractAllIssues(data: ProcessedAuditData): Array<{ issue: Issue; page: PageAuditResult }> {
    const allIssues: Array<{ issue: Issue; page: PageAuditResult }> = [];
    
    for (const page of data.pages) {
      for (const issue of page.issues) {
        allIssues.push({ issue, page });
      }
    }

    return allIssues;
  }

  /**
   * Create detailed issues with comprehensive analysis
   */
  private createDetailedIssues(allIssues: Array<{ issue: Issue; page: PageAuditResult }>, data: ProcessedAuditData): DetailedIssue[] {
    const issueMap = new Map<string, {
      issue: Issue;
      pages: Array<{ page: PageAuditResult; issue: Issue }>;
      totalSavings: { timeMs: number; bytes: number };
    }>();

    // Group issues by ID
    for (const { issue, page } of allIssues) {
      if (!issueMap.has(issue.id)) {
        issueMap.set(issue.id, {
          issue,
          pages: [],
          totalSavings: { timeMs: 0, bytes: 0 }
        });
      }

      const entry = issueMap.get(issue.id)!;
      entry.pages.push({ page, issue });
      entry.totalSavings.timeMs += issue.estimatedSavings.timeMs;
      entry.totalSavings.bytes += issue.estimatedSavings.bytes;
    }

    // Convert to detailed issues
    const detailedIssues: DetailedIssue[] = [];
    
    for (const [issueId, entry] of issueMap) {
      const detailedIssue = this.createDetailedIssue(issueId, entry);
      detailedIssues.push(detailedIssue);
    }

    // Sort by priority (highest first)
    return detailedIssues.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Create a detailed issue from grouped data
   */
  private createDetailedIssue(
    issueId: string,
    entry: {
      issue: Issue;
      pages: Array<{ page: PageAuditResult; issue: Issue }>;
      totalSavings: { timeMs: number; bytes: number };
    }
  ): DetailedIssue {
    const affectedPages = entry.pages.map(({ page, issue }) => ({
      path: page.path,
      label: page.label,
      device: page.device,
      performanceScore: page.scores.performance,
      estimatedSavings: issue.estimatedSavings,
      specificResources: issue.affectedResources.map(r => r.url)
    }));

    const resources = this.consolidateResources(entry.pages.map(p => p.issue.affectedResources).flat());
    const fixInstructions = this.generateFixInstructions(issueId, entry.pages.length);
    const testingStrategy = this.generateTestingStrategy(issueId);
    const priority = this.calculatePriority(entry.totalSavings, entry.pages.length, entry.issue.severity);

    return {
      id: issueId,
      title: entry.issue.title,
      description: entry.issue.description,
      severity: entry.issue.severity,
      category: entry.issue.category,
      affectedPages,
      totalEstimatedSavings: entry.totalSavings,
      resources,
      fixInstructions,
      testingStrategy,
      priority
    };
  }

  /**
   * Consolidate resources from multiple pages
   */
  private consolidateResources(resources: any[]): DetailedResource[] {
    const resourceMap = new Map<string, DetailedResource>();

    for (const resource of resources) {
      if (!resourceMap.has(resource.url)) {
        resourceMap.set(resource.url, {
          url: resource.url,
          type: resource.type,
          size: resource.size,
          resourceType: this.determineResourceType(resource.url, resource.type),
          loadingStrategy: this.suggestLoadingStrategy(resource.url, resource.type),
          compressionOpportunity: this.hasCompressionOpportunity(resource.type, resource.size)
        });
      }
    }

    return Array.from(resourceMap.values());
  }

  /**
   * Generate detailed fix instructions for an issue
   */
  private generateFixInstructions(issueId: string, pageCount: number): FixInstruction[] {
    const instructionTemplates: Record<string, FixInstruction[]> = {
      'unused-javascript': [
        {
          step: 1,
          action: 'Analyze bundle composition and identify unused code',
          implementation: {
            type: 'build-process',
            difficulty: 'easy',
            estimatedTime: '30 minutes',
            prerequisites: ['Bundle analyzer tool', 'Source maps enabled'],
            codeExamples: [
              {
                language: 'bash',
                after: 'npx webpack-bundle-analyzer build/static/js/*.js',
                description: 'Analyze webpack bundles',
                context: 'build'
              }
            ],
            configurationChanges: []
          },
          validation: {
            method: 'Bundle size comparison',
            expectedOutcome: 'Identify specific unused modules',
            metrics: ['Bundle size', 'Module count', 'Unused code percentage']
          }
        },
        {
          step: 2,
          action: 'Implement code splitting and dynamic imports',
          implementation: {
            type: 'code-change',
            difficulty: 'medium',
            estimatedTime: '2-4 hours',
            prerequisites: ['Modern bundler (Webpack 4+, Vite, etc.)', 'ES2020+ support'],
            codeExamples: [
              {
                language: 'javascript',
                framework: 'react',
                filename: 'LazyComponent.jsx',
                before: 'import HeavyComponent from "./HeavyComponent";',
                after: 'const HeavyComponent = lazy(() => import("./HeavyComponent"));',
                description: 'Convert to lazy loading',
                context: 'component'
              },
              {
                language: 'javascript',
                framework: 'nextjs',
                filename: 'pages/dashboard.js',
                after: 'const DashboardChart = dynamic(() => import("../components/Chart"), { ssr: false });',
                description: 'Next.js dynamic import',
                context: 'component'
              }
            ],
            configurationChanges: [
              {
                file: 'webpack.config.js',
                section: 'optimization',
                change: 'add',
                content: 'splitChunks: { chunks: "all", cacheGroups: { vendor: { test: /[\\/]node_modules[\\/]/, name: "vendors", chunks: "all" } } }',
                description: 'Enable automatic code splitting'
              }
            ]
          },
          validation: {
            method: 'Performance measurement',
            expectedOutcome: 'Reduced initial bundle size, faster page load',
            metrics: ['First Contentful Paint', 'Largest Contentful Paint', 'Bundle size']
          }
        }
      ],
      'unused-css-rules': [
        {
          step: 1,
          action: 'Audit CSS usage and remove unused rules',
          implementation: {
            type: 'build-process',
            difficulty: 'easy',
            estimatedTime: '1-2 hours',
            prerequisites: ['PurgeCSS or similar tool', 'Build process access'],
            codeExamples: [
              {
                language: 'javascript',
                filename: 'postcss.config.js',
                after: 'module.exports = { plugins: [require("@fullhuman/postcss-purgecss")({ content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"], defaultExtractor: content => content.match(/[A-Za-z0-9-_:/]+/g) || [] })] }',
                description: 'PurgeCSS configuration',
                context: 'build'
              }
            ],
            configurationChanges: []
          },
          validation: {
            method: 'CSS size comparison and visual testing',
            expectedOutcome: 'Smaller CSS bundles without visual regressions',
            metrics: ['CSS bundle size', 'Visual regression tests', 'Render time']
          }
        }
      ]
    };

    return instructionTemplates[issueId] || [
      {
        step: 1,
        action: `Address ${issueId} issue across ${pageCount} pages`,
        implementation: {
          type: 'manual',
          difficulty: 'medium',
          estimatedTime: '2-4 hours',
          prerequisites: ['Performance analysis tools'],
          codeExamples: [],
          configurationChanges: []
        },
        validation: {
          method: 'Performance testing',
          expectedOutcome: 'Improved performance metrics',
          metrics: ['Performance score', 'Core Web Vitals']
        }
      }
    ];
  }

  /**
   * Generate testing strategy for an issue type
   */
  private generateTestingStrategy(issueId: string): TestingStrategy {
    const strategies: Record<string, TestingStrategy> = {
      'unused-javascript': {
        performanceTests: [
          'Bundle size analysis before/after',
          'Lighthouse performance audit',
          'Core Web Vitals measurement',
          'JavaScript execution time profiling'
        ],
        functionalTests: [
          'Component lazy loading verification',
          'Dynamic import functionality',
          'Error boundary testing for failed imports',
          'User interaction flows'
        ],
        regressionTests: [
          'Visual regression testing',
          'Cross-browser compatibility',
          'Mobile device testing',
          'Accessibility testing'
        ],
        monitoringMetrics: [
          'First Contentful Paint (FCP)',
          'Largest Contentful Paint (LCP)',
          'Total Blocking Time (TBT)',
          'Bundle size trends'
        ]
      },
      'unused-css-rules': {
        performanceTests: [
          'CSS bundle size measurement',
          'Render performance profiling',
          'Critical CSS extraction validation'
        ],
        functionalTests: [
          'Style application verification',
          'Responsive design testing',
          'Theme switching functionality'
        ],
        regressionTests: [
          'Visual regression across breakpoints',
          'Print stylesheet testing',
          'High contrast mode testing'
        ],
        monitoringMetrics: [
          'CSS bundle size',
          'First Contentful Paint',
          'Cumulative Layout Shift'
        ]
      }
    };

    return strategies[issueId] || {
      performanceTests: ['Performance audit', 'Metric comparison'],
      functionalTests: ['Feature verification', 'User flow testing'],
      regressionTests: ['Visual testing', 'Cross-browser testing'],
      monitoringMetrics: ['Performance score', 'Core Web Vitals']
    };
  }

  /**
   * Analyze file paths for optimization opportunities
   */
  private analyzeFilePaths(data: ProcessedAuditData): FilePathAnalysis[] {
    const pathMap = new Map<string, {
      issues: Set<string>;
      opportunities: Set<string>;
      totalImpact: number;
    }>();

    // Analyze each page for file-specific issues
    for (const page of data.pages) {
      for (const issue of page.issues) {
        for (const resource of issue.affectedResources) {
          const path = this.extractFilePath(resource.url);
          
          if (!pathMap.has(path)) {
            pathMap.set(path, {
              issues: new Set(),
              opportunities: new Set(),
              totalImpact: 0
            });
          }

          const entry = pathMap.get(path)!;
          entry.issues.add(issue.id);
          entry.totalImpact += issue.estimatedSavings.timeMs;
          
          // Add optimization opportunities
          if (issue.category === 'javascript') {
            entry.opportunities.add('Code splitting');
            entry.opportunities.add('Tree shaking');
          }
          if (issue.category === 'css') {
            entry.opportunities.add('CSS purging');
            entry.opportunities.add('Critical CSS extraction');
          }
          if (issue.category === 'images') {
            entry.opportunities.add('Image optimization');
            entry.opportunities.add('Lazy loading');
          }
        }
      }
    }

    // Convert to analysis results
    const analyses: FilePathAnalysis[] = [];
    
    for (const [path, entry] of pathMap) {
      analyses.push({
        path,
        issues: Array.from(entry.issues),
        optimizationOpportunities: Array.from(entry.opportunities),
        estimatedImpact: {
          performanceGain: Math.round(entry.totalImpact / 100),
          implementationEffort: this.estimateImplementationEffort(entry.issues.size, entry.opportunities.size)
        },
        recommendedActions: this.generateRecommendedActions(Array.from(entry.opportunities))
      });
    }

    return analyses.sort((a, b) => b.estimatedImpact.performanceGain - a.estimatedImpact.performanceGain);
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(issues: DetailedIssue[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // JavaScript optimization
    const jsIssues = issues.filter(issue => issue.category === 'javascript');
    if (jsIssues.length > 0) {
      recommendations.push({
        category: 'JavaScript Optimization',
        recommendation: 'Implement comprehensive JavaScript optimization strategy',
        applicableIssues: jsIssues.map(issue => issue.id),
        implementation: {
          framework: ['nextjs', 'react', 'vue', 'angular'],
          buildTools: ['webpack', 'vite', 'rollup', 'esbuild'],
          steps: [
            {
              order: 1,
              description: 'Set up bundle analysis and monitoring',
              codeChanges: [
                {
                  language: 'json',
                  filename: 'package.json',
                  after: '"analyze": "npx webpack-bundle-analyzer build/static/js/*.js"',
                  description: 'Add bundle analysis script',
                  context: 'configuration'
                }
              ],
              configurationUpdates: [],
              verification: 'Run bundle analyzer and review output'
            },
            {
              order: 2,
              description: 'Implement code splitting at route level',
              codeChanges: [
                {
                  language: 'javascript',
                  framework: 'react',
                  after: 'const LazyRoute = lazy(() => import("./routes/LazyRoute"));',
                  description: 'Route-level code splitting',
                  context: 'component'
                }
              ],
              configurationUpdates: [],
              verification: 'Verify separate chunks are created for routes'
            }
          ]
        },
        expectedResults: {
          performanceImprovement: '20-40% reduction in initial bundle size',
          bundleSizeReduction: '30-60% for non-critical code',
          loadTimeImprovement: '15-30% faster initial page load'
        }
      });
    }

    // CSS optimization
    const cssIssues = issues.filter(issue => issue.category === 'css');
    if (cssIssues.length > 0) {
      recommendations.push({
        category: 'CSS Optimization',
        recommendation: 'Optimize CSS delivery and remove unused styles',
        applicableIssues: cssIssues.map(issue => issue.id),
        implementation: {
          framework: ['nextjs', 'react', 'vue', 'angular'],
          buildTools: ['postcss', 'purgecss', 'webpack', 'vite'],
          steps: [
            {
              order: 1,
              description: 'Configure CSS purging',
              codeChanges: [],
              configurationUpdates: [
                {
                  file: 'tailwind.config.js',
                  section: 'purge',
                  change: 'modify',
                  content: 'purge: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"]',
                  description: 'Configure Tailwind CSS purging'
                }
              ],
              verification: 'Compare CSS bundle sizes before and after'
            }
          ]
        },
        expectedResults: {
          performanceImprovement: '10-25% reduction in CSS bundle size',
          loadTimeImprovement: '5-15% faster render time'
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate machine-readable instructions
   */
  private generateMachineInstructions(issues: DetailedIssue[]): MachineInstruction[] {
    const instructions: MachineInstruction[] = [];

    for (const issue of issues.slice(0, 10)) { // Top 10 issues
      const automationLevel = this.determineAutomationLevel(issue.id);
      const commands = this.generateCommands(issue.id);
      
      instructions.push({
        issueId: issue.id,
        automationLevel,
        commands,
        dependencies: this.getDependencies(issue.id),
        rollbackStrategy: this.getRollbackStrategy(issue.id)
      });
    }

    return instructions;
  }

  /**
   * Helper methods
   */
  private determineResourceType(url: string, type: string): 'script' | 'stylesheet' | 'image' | 'font' | 'document' | 'other' {
    if (url.includes('.js') || type === 'script') return 'script';
    if (url.includes('.css') || type === 'stylesheet') return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/i)) return 'font';
    if (url.includes('.html') || type === 'document') return 'document';
    return 'other';
  }

  private suggestLoadingStrategy(url: string, type: string): 'eager' | 'lazy' | 'preload' | 'prefetch' {
    if (url.includes('critical') || url.includes('above-fold')) return 'preload';
    if (url.includes('analytics') || url.includes('tracking')) return 'prefetch';
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'lazy';
    return 'eager';
  }

  private hasCompressionOpportunity(type: string, size: number): boolean {
    const compressibleTypes = ['script', 'stylesheet', 'document'];
    return compressibleTypes.includes(type) && size > 10000; // 10KB threshold
  }

  private calculatePriority(savings: { timeMs: number; bytes: number }, pageCount: number, severity: string): number {
    const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 1;
    const timeScore = Math.min(savings.timeMs / 100, 50);
    const bytesScore = Math.min(savings.bytes / 10000, 30);
    const pageWeight = Math.min(pageCount / 5, 4);
    
    return Math.round((timeScore + bytesScore) * severityWeight * pageWeight);
  }

  private extractFilePath(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  private estimateImplementationEffort(issueCount: number, opportunityCount: number): number {
    return Math.min((issueCount * 2) + opportunityCount, 10);
  }

  private generateRecommendedActions(opportunities: string[]): string[] {
    const actionMap: Record<string, string> = {
      'Code splitting': 'Implement dynamic imports and route-level splitting',
      'Tree shaking': 'Configure build tools to eliminate dead code',
      'CSS purging': 'Remove unused CSS rules with PurgeCSS',
      'Critical CSS extraction': 'Inline critical CSS and defer non-critical styles',
      'Image optimization': 'Compress images and use next-gen formats',
      'Lazy loading': 'Implement lazy loading for below-fold content'
    };

    return opportunities.map(opp => actionMap[opp] || `Optimize ${opp.toLowerCase()}`);
  }

  private determineAutomationLevel(issueId: string): 'full' | 'partial' | 'manual' {
    const fullyAutomatable = ['unminified-css', 'unminified-javascript'];
    const partiallyAutomatable = ['unused-css-rules', 'unused-javascript'];
    
    if (fullyAutomatable.includes(issueId)) return 'full';
    if (partiallyAutomatable.includes(issueId)) return 'partial';
    return 'manual';
  }

  private generateCommands(issueId: string): Command[] {
    const commandTemplates: Record<string, Command[]> = {
      'unused-css-rules': [
        {
          type: 'npm',
          command: 'npm install --save-dev @fullhuman/postcss-purgecss',
          description: 'Install PurgeCSS'
        },
        {
          type: 'configuration',
          command: 'Configure PurgeCSS in postcss.config.js',
          description: 'Set up CSS purging configuration'
        }
      ],
      'unminified-javascript': [
        {
          type: 'configuration',
          command: 'Enable minification in webpack.config.js',
          description: 'Configure JavaScript minification'
        }
      ]
    };

    return commandTemplates[issueId] || [];
  }

  private getDependencies(issueId: string): string[] {
    const dependencyMap: Record<string, string[]> = {
      'unused-css-rules': ['@fullhuman/postcss-purgecss', 'postcss'],
      'unused-javascript': ['webpack', 'terser-webpack-plugin'],
      'render-blocking-resources': ['webpack', 'html-webpack-plugin']
    };

    return dependencyMap[issueId] || [];
  }

  private getRollbackStrategy(issueId: string): string {
    const strategies: Record<string, string> = {
      'unused-css-rules': 'Restore original CSS files from version control and disable PurgeCSS configuration',
      'unused-javascript': 'Revert build configuration changes and restore original bundle splitting',
      'render-blocking-resources': 'Remove resource hints and restore synchronous loading'
    };

    return strategies[issueId] || 'Revert configuration changes and restore previous build output';
  }

  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}