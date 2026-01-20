# Advanced Usage Examples

This document provides advanced usage examples and patterns for power users and complex scenarios.

## Programmatic API Usage

### Advanced API Configuration

```typescript
import { SignalerAPI } from '@signaler/cli/api';

const signaler = new SignalerAPI();

// Create advanced configuration
const config = signaler.createConfig({
  baseUrl: 'http://localhost:3000',
  throttlingMethod: 'simulate',
  cpuSlowdownMultiplier: 4,
  parallel: 2,
  warmUp: true,
  auditTimeoutMs: 60000,
  pages: [
    { 
      path: '/', 
      label: 'Home', 
      devices: ['mobile', 'desktop'],
      waitForSelector: '.main-content',
      customHeaders: {
        'Authorization': 'Bearer token123',
        'X-Custom-Header': 'value'
      }
    },
    { 
      path: '/products', 
      label: 'Products', 
      devices: ['mobile'],
      cookies: [
        { name: 'session', value: 'abc123', domain: 'localhost' }
      ]
    }
  ],
  budgets: {
    categories: {
      performance: 90,
      accessibility: 95,
      bestPractices: 85,
      seo: 90
    },
    metrics: {
      lcpMs: 2000,
      fcpMs: 1500,
      tbtMs: 200,
      cls: 0.05,
      inpMs: 150
    }
  }
});

// Run audit with error handling
async function runAdvancedAudit() {
  try {
    console.log('Starting advanced audit...');
    const result = await signaler.audit(config);
    
    // Process results
    console.log(`Audit completed in ${result.meta.elapsedMs}ms`);
    console.log(`Audited ${result.results.length} page/device combinations`);
    
    // Analyze performance trends
    const performanceScores = result.results.map(r => r.scores.performance);
    const avgPerformance = performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length;
    console.log(`Average performance score: ${avgPerformance.toFixed(1)}`);
    
    // Identify critical issues
    const criticalIssues = result.results.filter(r => 
      r.scores.performance < 50 || r.scores.accessibility < 80
    );
    
    if (criticalIssues.length > 0) {
      console.warn('Critical issues found:');
      criticalIssues.forEach(issue => {
        console.warn(`- ${issue.label} (${issue.device}): Performance ${issue.scores.performance}, A11y ${issue.scores.accessibility}`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('Audit failed:', error);
    throw error;
  }
}
```

### Batch Processing Multiple Sites

```typescript
import { SignalerAPI } from '@signaler/cli/api';

interface SiteConfig {
  name: string;
  baseUrl: string;
  pages: Array<{ path: string; label: string; devices: string[] }>;
}

const sites: SiteConfig[] = [
  {
    name: 'Main Site',
    baseUrl: 'https://mysite.com',
    pages: [
      { path: '/', label: 'Home', devices: ['mobile', 'desktop'] },
      { path: '/products', label: 'Products', devices: ['mobile'] }
    ]
  },
  {
    name: 'Blog Site',
    baseUrl: 'https://blog.mysite.com',
    pages: [
      { path: '/', label: 'Blog Home', devices: ['mobile'] },
      { path: '/latest', label: 'Latest Posts', devices: ['mobile'] }
    ]
  }
];

async function auditMultipleSites() {
  const signaler = new SignalerAPI();
  const results = [];
  
  for (const site of sites) {
    console.log(`Auditing ${site.name}...`);
    
    const config = signaler.createConfig({
      baseUrl: site.baseUrl,
      pages: site.pages,
      parallel: 1, // Single worker for stability
      auditTimeoutMs: 45000
    });
    
    try {
      const result = await signaler.audit(config);
      results.push({
        site: site.name,
        result,
        avgPerformance: result.results.reduce((sum, r) => sum + r.scores.performance, 0) / result.results.length
      });
      
      console.log(`✓ ${site.name} completed`);
    } catch (error) {
      console.error(`✗ ${site.name} failed:`, error);
      results.push({
        site: site.name,
        error: error.message,
        avgPerformance: 0
      });
    }
  }
  
  // Generate summary report
  console.log('\n=== Multi-Site Audit Summary ===');
  results.forEach(({ site, avgPerformance, error }) => {
    if (error) {
      console.log(`${site}: FAILED (${error})`);
    } else {
      console.log(`${site}: ${avgPerformance.toFixed(1)} avg performance`);
    }
  });
  
  return results;
}
```

## Custom Reporting and Analysis

### Generate Custom Performance Report

```typescript
import { readFileSync, writeFileSync } from 'fs';
import { SignalerAPI } from '@signaler/cli/api';

interface PerformanceReport {
  timestamp: string;
  summary: {
    totalPages: number;
    avgPerformance: number;
    avgAccessibility: number;
    criticalIssues: number;
  };
  pageDetails: Array<{
    page: string;
    device: string;
    scores: Record<string, number>;
    metrics: Record<string, number>;
    opportunities: Array<{ title: string; impact: string }>;
  }>;
  recommendations: string[];
}

async function generateCustomReport(): Promise<PerformanceReport> {
  // Read audit results
  const summary = JSON.parse(readFileSync('.signaler/summary.json', 'utf8'));
  const issues = JSON.parse(readFileSync('.signaler/issues.json', 'utf8'));
  
  // Calculate summary metrics
  const totalPages = summary.results.length;
  const avgPerformance = summary.results.reduce((sum, r) => sum + (r.scores.performance || 0), 0) / totalPages;
  const avgAccessibility = summary.results.reduce((sum, r) => sum + (r.scores.accessibility || 0), 0) / totalPages;
  const criticalIssues = issues.filter(issue => issue.severity === 'error').length;
  
  // Extract page details
  const pageDetails = summary.results.map(result => ({
    page: result.label,
    device: result.device,
    scores: result.scores,
    metrics: result.metrics,
    opportunities: result.opportunities.slice(0, 3).map(opp => ({
      title: opp.title,
      impact: opp.impact
    }))
  }));
  
  // Generate recommendations
  const recommendations = [
    avgPerformance < 80 ? 'Focus on improving Core Web Vitals (LCP, CLS, INP)' : null,
    avgAccessibility < 90 ? 'Address accessibility issues for better user experience' : null,
    criticalIssues > 0 ? `Fix ${criticalIssues} critical issues immediately` : null,
    'Consider implementing performance budgets in CI/CD pipeline',
    'Regular monitoring recommended for performance regression detection'
  ].filter(Boolean);
  
  const report: PerformanceReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPages,
      avgPerformance: Math.round(avgPerformance * 10) / 10,
      avgAccessibility: Math.round(avgAccessibility * 10) / 10,
      criticalIssues
    },
    pageDetails,
    recommendations
  };
  
  // Save custom report
  writeFileSync('.signaler/custom-report.json', JSON.stringify(report, null, 2));
  console.log('Custom report generated: .signaler/custom-report.json');
  
  return report;
}
```

### Performance Trend Analysis

```typescript
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface TrendData {
  date: string;
  avgPerformance: number;
  avgAccessibility: number;
  pageCount: number;
}

function trackPerformanceTrends() {
  const trendsFile = '.signaler/trends.json';
  const summary = JSON.parse(readFileSync('.signaler/summary.json', 'utf8'));
  
  // Calculate current metrics
  const currentData: TrendData = {
    date: new Date().toISOString().split('T')[0],
    avgPerformance: summary.results.reduce((sum, r) => sum + (r.scores.performance || 0), 0) / summary.results.length,
    avgAccessibility: summary.results.reduce((sum, r) => sum + (r.scores.accessibility || 0), 0) / summary.results.length,
    pageCount: summary.results.length
  };
  
  // Load existing trends
  let trends: TrendData[] = [];
  if (existsSync(trendsFile)) {
    trends = JSON.parse(readFileSync(trendsFile, 'utf8'));
  }
  
  // Add current data (avoid duplicates for same date)
  const existingIndex = trends.findIndex(t => t.date === currentData.date);
  if (existingIndex >= 0) {
    trends[existingIndex] = currentData;
  } else {
    trends.push(currentData);
  }
  
  // Keep only last 30 days
  trends = trends.slice(-30);
  
  // Save trends
  writeFileSync(trendsFile, JSON.stringify(trends, null, 2));
  
  // Analyze trends
  if (trends.length >= 2) {
    const latest = trends[trends.length - 1];
    const previous = trends[trends.length - 2];
    
    const perfChange = latest.avgPerformance - previous.avgPerformance;
    const a11yChange = latest.avgAccessibility - previous.avgAccessibility;
    
    console.log('\n=== Performance Trend Analysis ===');
    console.log(`Performance: ${latest.avgPerformance.toFixed(1)} (${perfChange >= 0 ? '+' : ''}${perfChange.toFixed(1)})`);
    console.log(`Accessibility: ${latest.avgAccessibility.toFixed(1)} (${a11yChange >= 0 ? '+' : ''}${a11yChange.toFixed(1)})`);
    
    if (perfChange < -5) {
      console.warn('⚠️  Significant performance regression detected!');
    } else if (perfChange > 5) {
      console.log('✅ Performance improvement detected!');
    }
  }
  
  return trends;
}
```

## CI/CD Integration Patterns

### GitHub Actions with Matrix Strategy

```yaml
name: Multi-Environment Performance Audit

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM

jobs:
  audit:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        environment: [development, staging, production]
        framework: [nextjs, nuxt, remix, sveltekit]
        include:
          - environment: development
            base_url: http://localhost:3000
            config: configs/dev.json
          - environment: staging
            base_url: https://staging.mysite.com
            config: configs/staging.json
          - environment: production
            base_url: https://mysite.com
            config: configs/production.json
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build application (${{ matrix.framework }})
      run: npm run build:${{ matrix.framework }}
      
    - name: Start application
      run: |
        npm start &
        npx wait-on ${{ matrix.base_url }} --timeout 60000
      
    - name: Install Signaler
      run: npm install -g @signaler/cli
      
    - name: Run performance audit
      run: |
        signaler audit \
          --config ${{ matrix.config }} \
          --base-url ${{ matrix.base_url }} \
          --ci \
          --fail-on-budget \
          --no-color
      
    - name: Upload audit results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: audit-results-${{ matrix.environment }}-${{ matrix.framework }}
        path: .signaler/
        
    - name: Performance regression check
      if: github.event_name == 'pull_request'
      run: |
        # Compare with main branch results
        node scripts/compare-performance.js \
          --current .signaler/summary.json \
          --baseline baseline-results/summary.json \
          --threshold 5
```

### Docker-based Audit Pipeline

```dockerfile
# Dockerfile.audit
FROM node:18-alpine

# Install Chrome dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Chrome path
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV CHROME_FLAGS="--no-sandbox --headless --disable-gpu --disable-dev-shm-usage"

WORKDIR /app

# Install Signaler
RUN npm install -g @signaler/cli

# Copy configuration files
COPY configs/ ./configs/
COPY scripts/ ./scripts/

# Default command
CMD ["signaler", "audit", "--ci", "--no-color"]
```

```bash
# Build and run audit container
docker build -f Dockerfile.audit -t signaler-audit .

# Run audit for different environments
docker run --rm \
  -v $(pwd)/.signaler:/app/.signaler \
  -e SIGNALER_BASE_URL=https://mysite.com \
  signaler-audit \
  signaler audit --config configs/production.json

# Run with custom configuration
docker run --rm \
  -v $(pwd)/.signaler:/app/.signaler \
  -v $(pwd)/custom-config.json:/app/config.json \
  signaler-audit \
  signaler audit --config config.json
```

## Performance Monitoring and Alerting

### Slack Integration for Performance Alerts

```typescript
import { WebClient } from '@slack/web-api';
import { readFileSync } from 'fs';

const slack = new WebClient(process.env.SLACK_TOKEN);

interface AlertConfig {
  performanceThreshold: number;
  accessibilityThreshold: number;
  channel: string;
}

async function sendPerformanceAlert(config: AlertConfig) {
  const summary = JSON.parse(readFileSync('.signaler/summary.json', 'utf8'));
  
  // Calculate metrics
  const avgPerformance = summary.results.reduce((sum, r) => sum + (r.scores.performance || 0), 0) / summary.results.length;
  const avgAccessibility = summary.results.reduce((sum, r) => sum + (r.scores.accessibility || 0), 0) / summary.results.length;
  
  // Check thresholds
  const performanceAlert = avgPerformance < config.performanceThreshold;
  const accessibilityAlert = avgAccessibility < config.accessibilityThreshold;
  
  if (performanceAlert || accessibilityAlert) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Performance Alert'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Performance Score:* ${avgPerformance.toFixed(1)}/100`
          },
          {
            type: 'mrkdwn',
            text: `*Accessibility Score:* ${avgAccessibility.toFixed(1)}/100`
          },
          {
            type: 'mrkdwn',
            text: `*Pages Audited:* ${summary.results.length}`
          },
          {
            type: 'mrkdwn',
            text: `*Audit Time:* ${summary.meta.elapsedMs}ms`
          }
        ]
      }
    ];
    
    // Add failing pages
    const failingPages = summary.results.filter(r => 
      r.scores.performance < config.performanceThreshold || 
      r.scores.accessibility < config.accessibilityThreshold
    );
    
    if (failingPages.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Failing Pages:*\n${failingPages.map(p => 
            `• ${p.label} (${p.device}): Perf ${p.scores.performance}, A11y ${p.scores.accessibility}`
          ).join('\n')}`
        }
      });
    }
    
    await slack.chat.postMessage({
      channel: config.channel,
      blocks
    });
    
    console.log('Performance alert sent to Slack');
  } else {
    console.log('All metrics within acceptable thresholds');
  }
}

// Usage
sendPerformanceAlert({
  performanceThreshold: 80,
  accessibilityThreshold: 90,
  channel: '#performance-alerts'
});
```

### Automated Performance Budgets

```typescript
import { readFileSync } from 'fs';

interface BudgetRule {
  metric: string;
  threshold: number;
  severity: 'error' | 'warning';
}

const budgetRules: BudgetRule[] = [
  { metric: 'performance', threshold: 85, severity: 'error' },
  { metric: 'accessibility', threshold: 90, severity: 'error' },
  { metric: 'lcpMs', threshold: 2500, severity: 'error' },
  { metric: 'cls', threshold: 0.1, severity: 'error' },
  { metric: 'inpMs', threshold: 200, severity: 'warning' }
];

function validatePerformanceBudgets(): boolean {
  const summary = JSON.parse(readFileSync('.signaler/summary.json', 'utf8'));
  let hasErrors = false;
  let hasWarnings = false;
  
  console.log('\n=== Performance Budget Validation ===');
  
  for (const rule of budgetRules) {
    const values = summary.results.map(r => {
      if (rule.metric in r.scores) {
        return r.scores[rule.metric];
      } else if (rule.metric in r.metrics) {
        return r.metrics[rule.metric];
      }
      return null;
    }).filter(v => v !== null);
    
    if (values.length === 0) continue;
    
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
    const isViolation = rule.metric.endsWith('Ms') || rule.metric === 'cls' 
      ? avgValue > rule.threshold 
      : avgValue < rule.threshold;
    
    if (isViolation) {
      const icon = rule.severity === 'error' ? '❌' : '⚠️';
      console.log(`${icon} ${rule.metric}: ${avgValue.toFixed(1)} (threshold: ${rule.threshold})`);
      
      if (rule.severity === 'error') {
        hasErrors = true;
      } else {
        hasWarnings = true;
      }
    } else {
      console.log(`✅ ${rule.metric}: ${avgValue.toFixed(1)} (threshold: ${rule.threshold})`);
    }
  }
  
  if (hasErrors) {
    console.log('\n❌ Performance budget validation FAILED');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('\n⚠️  Performance budget validation passed with warnings');
  } else {
    console.log('\n✅ Performance budget validation PASSED');
  }
  
  return !hasErrors;
}

// Usage in CI/CD
validatePerformanceBudgets();
```

These advanced examples demonstrate sophisticated usage patterns for enterprise-scale performance monitoring and optimization workflows.