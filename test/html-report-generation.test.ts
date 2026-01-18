/**
 * HTML Report Generation Tests
 * 
 * Tests for the interactive HTML report generation functionality
 */

import { describe, it, expect } from 'vitest';
import { HTMLReportGenerator } from '../src/reporting/generators/html-report-generator.js';
import { VisualPerformanceDashboard } from '../src/reporting/generators/visual-performance-dashboard.js';
import { IssueVisualization } from '../src/reporting/generators/issue-visualization.js';
import type { ProcessedAuditData } from '../src/reporting/generators/report-generator-engine.js';

describe('HTML Report Generation', () => {
  const mockAuditData: ProcessedAuditData = {
    pages: [
      {
        label: 'Home Page',
        path: '/',
        device: 'desktop',
        scores: {
          performance: 85,
          accessibility: 92,
          bestPractices: 88,
          seo: 95
        },
        metrics: {
          lcpMs: 2100,
          fcpMs: 1200,
          tbtMs: 150,
          cls: 0.05
        },
        issues: [
          {
            id: 'unused-javascript',
            title: 'Remove unused JavaScript',
            description: 'Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity.',
            severity: 'medium',
            category: 'javascript',
            affectedResources: [
              {
                url: '/static/js/main.js',
                type: 'script',
                size: 125000
              }
            ],
            estimatedSavings: {
              timeMs: 850,
              bytes: 45000
            },
            fixRecommendations: [
              {
                action: 'Use dynamic imports for code splitting',
                implementation: {
                  difficulty: 'medium',
                  estimatedTime: '2-4 hours',
                  codeExample: 'const module = await import("./heavy-module");',
                  documentation: ['https://web.dev/reduce-unused-code/']
                },
                framework: 'nextjs'
              }
            ]
          }
        ],
        opportunities: [
          {
            id: 'modern-image-formats',
            title: 'Serve images in next-gen formats',
            description: 'Image formats like WebP and AVIF often provide better compression than PNG or JPEG.',
            estimatedSavings: {
              timeMs: 450,
              bytes: 125000
            }
          }
        ]
      }
    ],
    globalIssues: [],
    performanceMetrics: {
      averagePerformanceScore: 85,
      totalPages: 1,
      criticalIssuesCount: 0,
      estimatedTotalSavings: 850
    },
    auditMetadata: {
      configPath: '/test/config.json',
      startedAt: '2024-01-17T10:00:00.000Z',
      completedAt: '2024-01-17T10:05:00.000Z',
      elapsedMs: 300000,
      totalPages: 1,
      totalRunners: 1
    }
  };

  it('should generate valid HTML report structure', async () => {
    const generator = new HTMLReportGenerator();
    const html = await generator.generateReport(mockAuditData);

    // Verify basic HTML structure
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<head>');
    expect(html).toContain('<body');
    expect(html).toContain('</html>');

    // Verify title and meta tags
    expect(html).toContain('<title>Signaler Performance Report</title>');
    expect(html).toContain('name="viewport"');
    expect(html).toContain('name="description"');

    // Verify Chart.js inclusion
    expect(html).toContain('chart.js');

    // Verify performance data is included
    expect(html).toContain('85'); // Performance score
    expect(html).toContain('Home Page');
    expect(html).toContain('Remove unused JavaScript');
  });

  it('should include responsive CSS styles', async () => {
    const generator = new HTMLReportGenerator();
    const html = await generator.generateReport(mockAuditData);

    // Verify responsive design elements
    expect(html).toContain('@media (max-width: 768px)');
    expect(html).toContain('grid-template-columns');
    expect(html).toContain('flex-wrap: wrap');

    // Verify CSS custom properties
    expect(html).toContain('--primary-color');
    expect(html).toContain('--success-color');
    expect(html).toContain('--error-color');
  });

  it('should include interactive JavaScript functionality', async () => {
    const generator = new HTMLReportGenerator();
    const html = await generator.generateReport(mockAuditData);

    // Verify JavaScript functions are included
    expect(html).toContain('function initializeCharts');
    expect(html).toContain('function initializeFilters');
    expect(html).toContain('function filterPages');
    expect(html).toContain('addEventListener');

    // Verify Chart.js initialization
    expect(html).toContain('new Chart');
  });

  it('should generate visual performance dashboard', async () => {
    const dashboard = new VisualPerformanceDashboard();
    const html = await dashboard.generateDashboard(mockAuditData);

    // Verify dashboard structure
    expect(html).toContain('visual-dashboard');
    expect(html).toContain('dashboard-header');
    expect(html).toContain('Performance Dashboard');

    // Verify gauge charts
    expect(html).toContain('gauge-chart');
    expect(html).toContain('performanceGauge');

    // Verify metrics display
    expect(html).toContain('85'); // Performance score
    expect(html).toContain('1'); // Total pages
  });

  it('should generate issue visualization explorer', async () => {
    const visualizer = new IssueVisualization();
    const html = await visualizer.generateIssueExplorer(mockAuditData);

    // Verify explorer structure
    expect(html).toContain('issue-explorer');
    expect(html).toContain('Issue Explorer');
    expect(html).toContain('filter-controls');

    // Verify issue display
    expect(html).toContain('Remove unused JavaScript');
    expect(html).toContain('medium'); // Severity
    expect(html).toContain('javascript'); // Category

    // Verify code examples
    expect(html).toContain('code-examples');
    expect(html).toContain('Dynamic Import');
  });

  it('should handle empty data gracefully', async () => {
    const emptyData: ProcessedAuditData = {
      pages: [],
      globalIssues: [],
      performanceMetrics: {
        averagePerformanceScore: 0,
        totalPages: 0,
        criticalIssuesCount: 0,
        estimatedTotalSavings: 0
      },
      auditMetadata: {
        configPath: '',
        startedAt: '2024-01-17T10:00:00.000Z',
        completedAt: '2024-01-17T10:00:01.000Z',
        elapsedMs: 1000,
        totalPages: 0,
        totalRunners: 0
      }
    };

    const generator = new HTMLReportGenerator();
    const html = await generator.generateReport(emptyData);

    // Should still generate valid HTML
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Signaler Performance Report');
    
    // Should handle zero values
    expect(html).toContain('0 Pages Audited');
    expect(html).toContain('0'); // Performance score
  });

  it('should include accessibility features', async () => {
    const generator = new HTMLReportGenerator();
    const html = await generator.generateReport(mockAuditData);

    // Verify accessibility attributes
    expect(html).toContain('lang="en"');
    
    // Verify semantic HTML
    expect(html).toContain('<nav');
    expect(html).toContain('<main');
    expect(html).toContain('<section');
    expect(html).toContain('<header');

    // Verify focus management
    expect(html).toContain(':focus');
    expect(html).toContain('outline:');
    
    // Verify reduced motion support
    expect(html).toContain('prefers-reduced-motion');
  });

  it('should support different themes', async () => {
    const generator = new HTMLReportGenerator({
      includeCharts: true,
      enableFiltering: true,
      enableSorting: true,
      mobileOptimized: true,
      theme: 'dark'
    });
    
    const html = await generator.generateReport(mockAuditData);

    // Verify theme support
    expect(html).toContain('theme-dark');
    expect(html).toContain('--background-color');
    expect(html).toContain('--surface-color');
  });
});