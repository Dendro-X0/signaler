# CLI Usage Examples

This document provides comprehensive examples for using Signaler's command-line interface.

## Basic Commands

### audit - Comprehensive Performance Analysis

The primary command for running comprehensive performance audits:

```bash
# Basic audit with default configuration
signaler audit

# Audit with custom configuration file
signaler audit --config ./custom-config.json

# Audit with custom base URL
signaler audit --base-url http://localhost:4000

# Focus on worst performing pages
signaler audit --focus-worst 10

# CI mode with budget enforcement
signaler audit --ci --fail-on-budget --no-color

# Verbose logging for debugging
signaler audit --log-level verbose

# Stable mode (single worker for reliability)
signaler audit --stable

# Custom timeout for slow pages
signaler audit --timeout 60000
```

### measure - Quick Performance Metrics

Quick performance measurements without full audit:

```bash
# Basic performance measurement
signaler measure

# Measure specific pages
signaler measure --pages /,/about,/contact

# Measure with custom timeout
signaler measure --timeout 30000

# Measure with specific device
signaler measure --device mobile

# Measure with custom configuration
signaler measure --config ./measure-config.json
```

### health - HTTP Health Checks

HTTP health checks and connectivity testing:

```bash
# Basic health check
signaler health

# Health check with custom endpoints
signaler health --endpoints /api/status,/api/health,/ping

# Health check with timeout
signaler health --timeout 10000

# Health check with custom headers
signaler health --headers "Authorization: Bearer token123"

# Health check with retry logic
signaler health --retries 3 --retry-delay 1000
```

### bundle - Bundle Size Analysis

Bundle size analysis and optimization recommendations:

```bash
# Basic bundle analysis
signaler bundle

# Bundle analysis with detailed breakdown
signaler bundle --detailed

# Bundle analysis for specific build directory
signaler bundle --build-dir ./dist

# Bundle analysis with size limits
signaler bundle --max-size 1000000

# Bundle analysis with treemap visualization
signaler bundle --treemap
```

### wizard - Interactive Setup

Interactive configuration wizard:

```bash
# Basic interactive setup
signaler wizard

# Wizard with specific framework detection
signaler wizard --framework nextjs

# Wizard with custom base URL
signaler wizard --base-url http://localhost:4000

# Wizard with specific output file
signaler wizard --output ./my-config.json

# Skip framework detection
signaler wizard --no-detect

# Wizard with predefined pages
signaler wizard --pages /,/about,/contact
```

### shell - Interactive Shell Mode

Interactive shell for running multiple commands:

```bash
# Start interactive shell
signaler shell

# Shell with specific configuration
signaler shell --config ./apex.config.json

# Shell with custom base URL
signaler shell --base-url http://localhost:4000
```

## Advanced Command Options

### Global Options

Options that work with most commands:

```bash
# Set log level (error, warn, info, verbose)
signaler audit --log-level verbose

# Disable colored output
signaler audit --no-color

# Set custom configuration file
signaler audit --config ./configs/production.json

# Set custom base URL
signaler audit --base-url https://mysite.com

# Set working directory
signaler audit --cwd ./my-project

# Show help for any command
signaler audit --help
```

### Configuration Override Options

Override configuration file settings via CLI:

```bash
# Override parallel workers
signaler audit --parallel 4

# Override throttling method
signaler audit --throttling simulate

# Override CPU slowdown multiplier
signaler audit --cpu-slowdown 4

# Override audit timeout
signaler audit --timeout 90000

# Override warm-up setting
signaler audit --warm-up

# Override incremental mode
signaler audit --incremental
```

### Output and Reporting Options

Control output format and reporting:

```bash
# Generate HTML report
signaler audit --html

# Generate JSON output only
signaler audit --json-only

# Custom output directory
signaler audit --output-dir ./custom-reports

# Suppress console output
signaler audit --quiet

# Export results to specific format
signaler audit --export csv,json,html

# Include screenshots in report
signaler audit --screenshots
```

## Environment-Specific Usage

### Development Environment

```bash
# Development audit with relaxed settings
signaler audit \
  --config ./configs/dev.json \
  --base-url http://localhost:3000 \
  --parallel 1 \
  --timeout 30000 \
  --log-level info

# Quick development check
signaler measure \
  --pages / \
  --device mobile \
  --timeout 15000
```

### Staging Environment

```bash
# Staging audit with moderate settings
signaler audit \
  --config ./configs/staging.json \
  --base-url https://staging.mysite.com \
  --parallel 2 \
  --timeout 60000 \
  --warm-up

# Staging health check
signaler health \
  --endpoints /,/api/health,/api/status \
  --timeout 10000 \
  --retries 2
```

### Production Environment

```bash
# Production audit with strict settings
signaler audit \
  --config ./configs/production.json \
  --base-url https://mysite.com \
  --parallel 3 \
  --timeout 90000 \
  --warm-up \
  --fail-on-budget \
  --ci

# Production monitoring
signaler measure \
  --pages /,/products,/checkout \
  --device mobile \
  --timeout 45000 \
  --log-level error
```

## CI/CD Integration Examples

### GitHub Actions

```bash
# Install and run in GitHub Actions
npm install -g @signaler/cli
signaler audit --ci --fail-on-budget --no-color --config ./configs/ci.json
```

### GitLab CI

```bash
# GitLab CI pipeline
signaler audit \
  --ci \
  --fail-on-budget \
  --no-color \
  --base-url $CI_ENVIRONMENT_URL \
  --config ./configs/gitlab-ci.json
```

### Jenkins

```bash
# Jenkins pipeline
signaler audit \
  --ci \
  --fail-on-budget \
  --no-color \
  --output-dir ./reports \
  --config ./configs/jenkins.json
```

### Docker

```bash
# Run in Docker container
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  node:18-alpine \
  sh -c "npm install -g @signaler/cli && signaler audit --ci --no-color"
```

## Debugging and Troubleshooting

### Debug Mode

```bash
# Enable verbose logging
signaler audit --log-level verbose

# Single worker for stability
signaler audit --stable --parallel 1

# Extended timeout for slow pages
signaler audit --timeout 120000

# Skip warm-up for faster debugging
signaler audit --no-warm-up
```

### Network Issues

```bash
# Test connectivity first
signaler health --endpoints / --timeout 5000

# Run with increased timeout
signaler audit --timeout 90000 --retries 3

# Use stable mode for network issues
signaler audit --stable --parallel 1 --timeout 120000
```

### Performance Issues

```bash
# Reduce parallel workers
signaler audit --parallel 1

# Disable warm-up
signaler audit --no-warm-up

# Use lighter throttling
signaler audit --throttling none

# Reduce CPU slowdown
signaler audit --cpu-slowdown 1
```

## Scripting and Automation

### Bash Scripts

```bash
#!/bin/bash
# audit-script.sh

set -e

echo "Starting performance audit..."

# Check if server is running
if ! signaler health --timeout 5000; then
  echo "Server not responding, starting..."
  npm start &
  sleep 10
fi

# Run audit
signaler audit \
  --config ./configs/production.json \
  --ci \
  --fail-on-budget \
  --no-color

echo "Audit completed successfully!"
```

### PowerShell Scripts

```powershell
# audit-script.ps1

Write-Host "Starting performance audit..." -ForegroundColor Green

# Check server health
try {
    signaler health --timeout 5000
    Write-Host "Server is healthy" -ForegroundColor Green
} catch {
    Write-Host "Server not responding, please start your application" -ForegroundColor Red
    exit 1
}

# Run audit
signaler audit `
  --config ./configs/production.json `
  --ci `
  --fail-on-budget `
  --no-color

if ($LASTEXITCODE -eq 0) {
    Write-Host "Audit completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Audit failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
```

### Node.js Scripts

```javascript
// audit-script.js
const { spawn } = require('child_process');
const { existsSync } = require('fs');

async function runAudit() {
  console.log('Starting performance audit...');
  
  // Check if config exists
  if (!existsSync('./apex.config.json')) {
    console.error('Configuration file not found. Run "signaler wizard" first.');
    process.exit(1);
  }
  
  // Run audit
  const audit = spawn('signaler', [
    'audit',
    '--ci',
    '--fail-on-budget',
    '--no-color'
  ], {
    stdio: 'inherit'
  });
  
  audit.on('close', (code) => {
    if (code === 0) {
      console.log('Audit completed successfully!');
    } else {
      console.error(`Audit failed with exit code ${code}`);
      process.exit(code);
    }
  });
}

runAudit().catch(console.error);
```

## Configuration Management

### Multiple Configuration Files

```bash
# Development configuration
signaler audit --config ./configs/dev.json

# Staging configuration
signaler audit --config ./configs/staging.json

# Production configuration
signaler audit --config ./configs/production.json

# Framework-specific configurations
signaler audit --config ./configs/nextjs.json
signaler audit --config ./configs/nuxt.json
signaler audit --config ./configs/remix.json
```

### Environment Variables

```bash
# Set base URL via environment variable
export SIGNALER_BASE_URL=https://mysite.com
signaler audit

# Set log level via environment variable
export SIGNALER_LOG_LEVEL=verbose
signaler audit

# Set configuration file via environment variable
export SIGNALER_CONFIG=./configs/production.json
signaler audit

# Set parallel workers via environment variable
export SIGNALER_PARALLEL=4
signaler audit
```

### Configuration Validation

```bash
# Validate configuration file
signaler validate --config ./apex.config.json

# Validate configuration with specific base URL
signaler validate --config ./apex.config.json --base-url https://mysite.com

# Dry run (validate without executing)
signaler audit --dry-run --config ./apex.config.json
```

## Output Processing

### JSON Output Processing

```bash
# Generate JSON output
signaler audit --json-only > results.json

# Process with jq
signaler audit --json-only | jq '.results[] | select(.scores.performance < 80)'

# Extract performance scores
signaler audit --json-only | jq '.results[].scores.performance'

# Get average performance score
signaler audit --json-only | jq '[.results[].scores.performance] | add / length'
```

### CSV Export

```bash
# Export to CSV
signaler audit --export csv

# Custom CSV processing
signaler audit --json-only | jq -r '.results[] | [.label, .device, .scores.performance, .scores.accessibility] | @csv' > results.csv
```

### HTML Reports

```bash
# Generate HTML report
signaler audit --html

# Custom HTML report location
signaler audit --html --output-dir ./custom-reports

# HTML report with screenshots
signaler audit --html --screenshots
```

These CLI examples should cover most common usage scenarios and provide a solid foundation for integrating Signaler into various workflows and environments.