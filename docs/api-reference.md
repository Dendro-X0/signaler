# API Reference

This document provides comprehensive API documentation for Signaler's programmatic interface.

## Overview

Signaler provides two main APIs:
- **Programmatic API**: For integrating Signaler into Node.js applications
- **CLI API**: Command-line interface for batch auditing

## Programmatic API

### Installation

```bash
npm install @signaler/cli
```

### Basic Usage

```typescript
import { SignalerAPI } from '@signaler/cli/api';

const signaler = new SignalerAPI();
```

### Interface: SignalerAPI

The main programmatic interface for Signaler functionality.

#### Methods

##### `audit(config: AuditConfig): Promise<AuditResult>`

Runs a comprehensive audit with the provided configuration.

**Parameters:**
- `config: AuditConfig` - Audit configuration object

**Returns:**
- `Promise<AuditResult>` - Complete audit results

**Example:**
```typescript
const config = signaler.createConfig({
  baseUrl: 'http://localhost:3000',
  pages: [
    { path: '/', label: 'Home', devices: ['mobile', 'desktop'] }
  ]
});

const result = await signaler.audit(config);
console.log(`Audited ${result.results.length} combinations`);
```

##### `createConfig(options: Partial<AuditConfig>): AuditConfig`

Creates a valid audit configuration with defaults applied.

**Parameters:**
- `options: Partial<AuditConfig>` - Configuration options

**Returns:**
- `AuditConfig` - Complete configuration object

**Example:**
```typescript
const config = signaler.createConfig({
  baseUrl: 'http://localhost:3000',
  pages: [
    { path: '/', label: 'Home', devices: ['mobile'] }
  ],
  budgets: {
    categories: { performance: 90 }
  }
});
```

##### `validateConfig(config: AuditConfig): ValidationResult`

Validates an audit configuration for correctness.

**Parameters:**
- `config: AuditConfig` - Configuration to validate

**Returns:**
- `ValidationResult` - Validation result with errors if any

**Example:**
```typescript
const validation = signaler.validateConfig(config);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

##### `getVersion(): Promise<string>`

Gets the current Signaler version.

**Returns:**
- `Promise<string>` - Version string

**Example:**
```typescript
const version = await signaler.getVersion();
console.log(`Signaler version: ${version}`);
```

## Type Definitions

### AuditConfig

Configuration object for audit execution.

```typescript
interface AuditConfig {
  readonly baseUrl: string;
  readonly query?: string;
  readonly buildId?: string;
  readonly chromePort?: number;
  readonly runs?: number;
  readonly auditTimeoutMs?: number;
  readonly gitIgnoreSignalerDir?: boolean;
  readonly logLevel?: "silent" | "error" | "info" | "verbose";
  readonly throttlingMethod?: "simulate" | "devtools";
  readonly cpuSlowdownMultiplier?: number;
  readonly parallel?: number;
  readonly warmUp?: boolean;
  readonly incremental?: boolean;
  readonly pages: readonly ApexPageConfig[];
  readonly budgets?: ApexBudgets;
}
```

### AuditResult

Complete audit results containing metadata and page results.

```typescript
interface AuditResult {
  readonly meta: RunMeta;
  readonly results: readonly PageDeviceSummary[];
}
```

### ApexPageConfig

Configuration for a single page to audit.

```typescript
interface ApexPageConfig {
  readonly path: string;
  readonly label: string;
  readonly devices: readonly ApexDevice[];
  readonly scope?: ApexPageScope;
}
```

### ValidationResult

Result of configuration validation.

```typescript
interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}
```

## CLI API

### Commands

#### `signaler wizard`

Interactive setup wizard for project configuration.

**Options:**
- `--config <path>` - Custom config file path
- `--force` - Overwrite existing configuration

**Example:**
```bash
signaler wizard --config ./custom-config.json
```

#### `signaler audit`

Run comprehensive Lighthouse audits.

**Options:**
- `--config <path>` - Configuration file path
- `--focus-worst <n>` - Re-audit worst N pages
- `--ci` - CI mode (non-interactive)
- `--no-color` - Disable colored output
- `--fail-on-budget` - Exit with error if budgets fail

**Example:**
```bash
signaler audit --focus-worst 10 --ci --fail-on-budget
```

#### `signaler measure`

Fast performance metrics using Chrome DevTools Protocol.

**Options:**
- `--config <path>` - Configuration file path
- `--parallel <n>` - Number of parallel workers

**Example:**
```bash
signaler measure --parallel 4
```

#### `signaler bundle`

Analyze build output and bundle sizes.

**Options:**
- `--config <path>` - Configuration file path
- `--build-dir <path>` - Build directory to analyze

**Example:**
```bash
signaler bundle --build-dir ./dist
```

#### `signaler health`

HTTP health checks for all configured pages.

**Options:**
- `--config <path>` - Configuration file path
- `--timeout <ms>` - Request timeout in milliseconds

**Example:**
```bash
signaler health --timeout 5000
```

#### `signaler shell`

Interactive shell mode for running multiple commands.

**Example:**
```bash
signaler shell
> audit
> measure
> open
> exit
```

## Error Handling

### Common Error Types

#### ConfigurationError

Thrown when configuration is invalid or missing.

```typescript
try {
  const result = await signaler.audit(config);
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Configuration error:', error.message);
  }
}
```

#### AuditError

Thrown when audit execution fails.

```typescript
try {
  const result = await signaler.audit(config);
} catch (error) {
  if (error instanceof AuditError) {
    console.error('Audit failed:', error.message);
    console.error('Failed pages:', error.failedPages);
  }
}
```

#### TimeoutError

Thrown when audit operations exceed timeout limits.

```typescript
try {
  const result = await signaler.audit(config);
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error('Audit timed out after', error.timeoutMs, 'ms');
  }
}
```

## Integration Examples

### CI/CD Integration

```yaml
# GitHub Actions
- name: Run Signaler Audit
  run: |
    npm install -g @signaler/cli
    signaler audit --ci --fail-on-budget
```

### Express.js Integration

```typescript
import express from 'express';
import { SignalerAPI } from '@signaler/cli/api';

const app = express();
const signaler = new SignalerAPI();

app.post('/audit', async (req, res) => {
  try {
    const config = signaler.createConfig({
      baseUrl: req.body.baseUrl,
      pages: req.body.pages
    });
    
    const result = await signaler.audit(config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Automated Monitoring

```typescript
import { SignalerAPI } from '@signaler/cli/api';
import cron from 'node-cron';

const signaler = new SignalerAPI();

// Run audit every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  const config = signaler.createConfig({
    baseUrl: 'https://mysite.com',
    pages: [
      { path: '/', label: 'Home', devices: ['mobile', 'desktop'] },
      { path: '/products', label: 'Products', devices: ['mobile'] }
    ]
  });
  
  try {
    const result = await signaler.audit(config);
    
    // Check for performance regressions
    const poorPerformance = result.results.filter(
      r => r.scores.performance && r.scores.performance < 80
    );
    
    if (poorPerformance.length > 0) {
      console.warn('Performance regression detected:', poorPerformance);
      // Send alert notification
    }
  } catch (error) {
    console.error('Scheduled audit failed:', error);
  }
});
```

## Best Practices

### Configuration Management

1. **Use environment-specific configs:**
```typescript
const config = signaler.createConfig({
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://mysite.com' 
    : 'http://localhost:3000',
  // ... other options
});
```

2. **Validate configurations early:**
```typescript
const validation = signaler.validateConfig(config);
if (!validation.valid) {
  throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
}
```

3. **Use incremental audits for faster feedback:**
```typescript
const config = signaler.createConfig({
  incremental: true,
  buildId: process.env.BUILD_ID || Date.now().toString(),
  // ... other options
});
```

### Performance Optimization

1. **Adjust parallelism based on resources:**
```typescript
const config = signaler.createConfig({
  parallel: process.env.CI ? 1 : 2, // Lower parallelism in CI
  // ... other options
});
```

2. **Use appropriate throttling:**
```typescript
const config = signaler.createConfig({
  throttlingMethod: 'simulate', // Faster for batch audits
  cpuSlowdownMultiplier: 2, // Adjust based on host machine
  // ... other options
});
```

3. **Enable warm-up for consistent results:**
```typescript
const config = signaler.createConfig({
  warmUp: true, // Reduces cold start effects
  // ... other options
});
```

## Support

For additional help:
- [GitHub Issues](https://github.com/Dendro-X0/ApexAuditor/issues)
- [Documentation](https://signaler.dev/docs)
- [Examples Repository](https://github.com/signaler/examples)