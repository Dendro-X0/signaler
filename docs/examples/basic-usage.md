# Basic Usage Examples

This document provides practical examples for common Signaler use cases.

## Quick Start Example

### 1. Initialize Project

```bash
# Navigate to your project directory
cd my-web-project

# Run the interactive wizard
signaler wizard
```

The wizard will:
- Auto-detect your framework (Next.js, Nuxt, Remix, SvelteKit, etc.)
- Discover routes from your filesystem or sitemap
- Generate `apex.config.json` configuration

### 2. Basic Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "pages": [
    {
      "path": "/",
      "label": "Home",
      "devices": ["mobile", "desktop"]
    },
    {
      "path": "/about",
      "label": "About",
      "devices": ["mobile", "desktop"]
    },
    {
      "path": "/contact",
      "label": "Contact",
      "devices": ["mobile"]
    }
  ]
}
```

### 3. Run Your First Audit

```bash
# Start your development server
npm run dev

# In another terminal, run the audit
signaler audit
```

## Core Commands and Features

### Audit Command - Comprehensive Performance Analysis

The `audit` command is the primary feature for comprehensive performance analysis:

```bash
# Basic audit
signaler audit

# Focus on worst performing pages
signaler audit --focus-worst 10

# CI mode with budget enforcement
signaler audit --ci --fail-on-budget --no-color

# Custom configuration file
signaler audit --config ./custom-config.json

# Verbose logging for debugging
signaler audit --log-level verbose

# Stable mode (single worker)
signaler audit --stable
```

### Measure Command - Quick Performance Metrics

The `measure` command provides quick performance metrics:

```bash
# Quick performance metrics only
signaler measure

# Measure specific pages
signaler measure --pages /,/about,/contact

# Measure with custom timeout
signaler measure --timeout 30000
```

### Health Command - HTTP Health Checks

The `health` command performs HTTP health checks:

```bash
# Basic health check
signaler health

# Health check with custom endpoints
signaler health --endpoints /api/status,/api/health

# Health check with timeout
signaler health --timeout 10000
```

### Bundle Command - Bundle Size Analysis

The `bundle` command analyzes bundle sizes:

```bash
# Bundle size analysis
signaler bundle

# Bundle analysis with detailed breakdown
signaler bundle --detailed

# Bundle analysis for specific build directory
signaler bundle --build-dir ./dist
```

### Wizard Command - Interactive Setup

The `wizard` command provides interactive setup:

```bash
# Interactive setup
signaler wizard

# Wizard with specific framework
signaler wizard --framework nextjs

# Wizard with custom base URL
signaler wizard --base-url http://localhost:4000
```

### Shell Command - Interactive Shell Mode

The `shell` command provides interactive shell mode:

```bash
# Interactive shell mode
signaler shell

# Shell with specific configuration
signaler shell --config ./apex.config.json
```

### API Usage - Programmatic Interface

The `api` provides programmatic access to all features:
npm run dev

# In another terminal, run the audit
signaler audit
```

## Programmatic Usage

### Basic API Usage

```typescript
import { SignalerAPI } from '@signaler/cli/api';

async function runAudit() {
  const signaler = new SignalerAPI();
  
  // Create configuration
  const config = signaler.createConfig({
    baseUrl: 'http://localhost:3000',
    pages: [
      { path: '/', label: 'Home', devices: ['mobile', 'desktop'] },
      { path: '/products', label: 'Products', devices: ['mobile'] }
    ]
  });
  
  // Validate configuration
  const validation = signaler.validateConfig(config);
  if (!validation.valid) {
    console.error('Configuration errors:', validation.errors);
    return;
  }
  
  // Run audit
  console.log('Starting audit...');
  const result = await signaler.audit(config);
  
  // Process results
  console.log(`Audit completed in ${result.meta.elapsedMs}ms`);
  console.log(`Audited ${result.results.length} page/device combinations`);
  
  // Check for performance issues
  const poorPerformance = result.results.filter(
    r => r.scores.performance && r.scores.performance < 80
  );
  
  if (poorPerformance.length > 0) {
    console.warn('Pages with poor performance:');
    poorPerformance.forEach(page => {
      console.warn(`- ${page.label} (${page.device}): ${page.scores.performance}`);
    });
  }
}

runAudit().catch(console.error);
```

### Error Handling

```typescript
import { SignalerAPI } from '@signaler/cli/api';

async function robustAudit() {
  const signaler = new SignalerAPI();
  
  try {
    const config = signaler.createConfig({
      baseUrl: 'http://localhost:3000',
      pages: [
        { path: '/', label: 'Home', devices: ['mobile'] }
      ],
      auditTimeoutMs: 60000, // 60 second timeout
      parallel: 1 // Single worker for stability
    });
    
    const result = await signaler.audit(config);
    return result;
    
  } catch (error) {
    if (error.name === 'ConfigurationError') {
      console.error('Configuration issue:', error.message);
    } else if (error.name === 'AuditError') {
      console.error('Audit failed:', error.message);
      console.error('Failed pages:', error.failedPages);
    } else if (error.name === 'TimeoutError') {
      console.error('Audit timed out after', error.timeoutMs, 'ms');
    } else {
      console.error('Unexpected error:', error);
    }
    
    throw error;
  }
}
```

## CLI Usage Examples

### Basic Commands

```bash
# Interactive setup
signaler wizard

# Full audit with all checks
signaler audit

# Quick performance metrics only
signaler measure

# HTTP health checks
signaler health

# Bundle size analysis
signaler bundle

# Interactive shell mode
signaler shell
```

### Advanced CLI Options

```bash
# Focus on worst performing pages
signaler audit --focus-worst 10

# CI mode with budget enforcement
signaler audit --ci --fail-on-budget --no-color

# Custom configuration file
signaler audit --config ./custom-config.json

# Verbose logging for debugging
signaler audit --log-level verbose

# Stable mode (single worker)
signaler audit --stable
```

## Configuration Examples

### Performance-Focused Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "cpuSlowdownMultiplier": 4,
  "parallel": 2,
  "warmUp": true,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/products", "label": "Products", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 90,
      "accessibility": 95
    },
    "metrics": {
      "lcpMs": 2500,
      "fcpMs": 1800,
      "tbtMs": 300,
      "cls": 0.1,
      "inpMs": 200
    }
  }
}
```

### CI/CD Optimized Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "cpuSlowdownMultiplier": 2,
  "parallel": 1,
  "warmUp": false,
  "auditTimeoutMs": 45000,
  "logLevel": "error",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile"] },
    { "path": "/critical-page", "label": "Critical", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 85,
      "accessibility": 90
    }
  }
}
```

### Large Site Configuration

```json
{
  "baseUrl": "https://mysite.com",
  "throttlingMethod": "simulate",
  "parallel": 4,
  "warmUp": true,
  "incremental": true,
  "buildId": "v1.2.3",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/products", "label": "Products", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile"] },
    { "path": "/contact", "label": "Contact", "devices": ["mobile"] },
    { "path": "/blog", "label": "Blog", "devices": ["mobile", "desktop"] }
  ],
  "budgets": {
    "categories": {
      "performance": 80,
      "accessibility": 95,
      "bestPractices": 85,
      "seo": 90
    }
  }
}
```

## Framework-Specific Examples

### Next.js Project

```bash
# In your Next.js project root
npm run build  # Build the project first
signaler wizard  # Auto-detects Next.js routes

# Generated config will include routes like:
# /, /about, /products/[slug] (resolved to actual products)
```

### Nuxt Project

```bash
# In your Nuxt project root
npm run build  # Build the project
signaler wizard  # Auto-detects Nuxt routes

# Handles dynamic routes like:
# pages/products/_id.vue -> /products/[id] (resolved)
```

### SvelteKit Project

```bash
# In your SvelteKit project root
npm run build  # Build the project
signaler wizard  # Auto-detects SvelteKit routes

# Detects routes from src/routes/ structure
```

### Static Site

```bash
# For static sites (built HTML)
signaler wizard  # Scans dist/, build/, out/, public/ directories

# Finds all .html files and creates appropriate routes
```

## Output Processing Examples

### Processing JSON Results

```typescript
import { readFileSync } from 'fs';

// Read audit results
const summary = JSON.parse(readFileSync('.signaler/summary.json', 'utf8'));

// Extract performance scores
const performanceScores = summary.results.map(result => ({
  page: result.label,
  device: result.device,
  performance: result.scores.performance,
  lcp: result.metrics.lcpMs,
  cls: result.metrics.cls
}));

// Find pages below threshold
const poorPerformers = performanceScores.filter(
  page => page.performance < 80
);

console.log('Pages needing attention:', poorPerformers);
```

### Generating Custom Reports

```typescript
import { readFileSync, writeFileSync } from 'fs';

// Read audit data
const summary = JSON.parse(readFileSync('.signaler/summary.json', 'utf8'));
const issues = JSON.parse(readFileSync('.signaler/issues.json', 'utf8'));

// Create custom report
const customReport = {
  timestamp: new Date().toISOString(),
  totalPages: summary.results.length,
  averagePerformance: summary.results.reduce(
    (sum, r) => sum + (r.scores.performance || 0), 0
  ) / summary.results.length,
  criticalIssues: issues.filter(issue => issue.severity === 'error').length,
  recommendations: issues.slice(0, 5).map(issue => ({
    title: issue.title,
    impact: issue.impact,
    pages: issue.offenders.length
  }))
};

// Save custom report
writeFileSync('.signaler/custom-report.json', JSON.stringify(customReport, null, 2));
console.log('Custom report generated!');
```

## Integration Examples

### Express.js Middleware

```typescript
import express from 'express';
import { SignalerAPI } from '@signaler/cli/api';

const app = express();
const signaler = new SignalerAPI();

app.post('/audit', async (req, res) => {
  try {
    const { baseUrl, pages } = req.body;
    
    const config = signaler.createConfig({
      baseUrl,
      pages: pages.map(path => ({
        path,
        label: path.replace('/', '') || 'Home',
        devices: ['mobile']
      }))
    });
    
    const result = await signaler.audit(config);
    
    res.json({
      success: true,
      auditTime: result.meta.elapsedMs,
      results: result.results.map(r => ({
        path: r.path,
        performance: r.scores.performance,
        accessibility: r.scores.accessibility
      }))
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3001, () => {
  console.log('Audit API running on port 3001');
});
```

### GitHub Actions Workflow

```yaml
name: Performance Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build application
      run: npm run build
      
    - name: Start application
      run: npm start &
      
    - name: Wait for server
      run: npx wait-on http://localhost:3000
      
    - name: Install Signaler
      run: npm install -g @signaler/cli
      
    - name: Run audit
      run: signaler audit --ci --fail-on-budget
      
    - name: Upload results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: audit-results
        path: .signaler/
```

## Troubleshooting Examples

### Debug Configuration

```typescript
import { SignalerAPI } from '@signaler/cli/api';

const signaler = new SignalerAPI();

// Create config with debug settings
const config = signaler.createConfig({
  baseUrl: 'http://localhost:3000',
  logLevel: 'verbose',
  auditTimeoutMs: 90000,
  parallel: 1, // Single worker for stability
  pages: [
    { path: '/', label: 'Home', devices: ['mobile'] }
  ]
});

// Validate before running
const validation = signaler.validateConfig(config);
console.log('Config validation:', validation);

if (validation.valid) {
  console.log('Running audit with debug settings...');
  // Run audit
}
```

### Handling Network Issues

```bash
# Test connectivity first
curl http://localhost:3000

# Run with increased timeout and single worker
signaler audit --stable --config debug-config.json

# Where debug-config.json has:
{
  "baseUrl": "http://localhost:3000",
  "auditTimeoutMs": 120000,
  "parallel": 1,
  "logLevel": "verbose",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile"] }
  ]
}
```

These examples should help you get started with Signaler and handle common use cases effectively.