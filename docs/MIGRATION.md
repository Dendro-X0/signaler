# Migration Guide: v1.x to v2.0

This guide provides step-by-step instructions for migrating from Signaler v1.x to v2.0. The new version includes breaking changes that require updates to your configuration and code.

## 🚨 Breaking Changes Overview

### Major API Changes
- `ReportGenerator` class replaced with `ReportGeneratorEngine`
- Configuration schema updated with new performance options
- Method signatures changed for streaming API support
- New error handling system with different error types
- Updated output format specifications

### New Requirements
- Node.js 18+ (previously 16+)
- TypeScript 5.0+ for TypeScript users
- Updated peer dependencies

## 📦 Installation Migration

### Step 1: Uninstall v1.x

```bash
# Remove old version
npm uninstall @kiro/signaler

# Clear npm cache (recommended)
npm cache clean --force
```

### Step 2: Install v2.0

**Option A: JSR (Recommended)**
```bash
npx jsr add @kiro/signaler
```

**Option B: npm**
```bash
npm install @kiro/signaler@^2.0.0
```

### Step 3: Update Dependencies

Update your `package.json` if you have peer dependencies:

```json
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

## 🔧 Configuration Migration

### Old Configuration (v1.x)

```javascript
// signaler.config.js (v1.x)
export default {
  lighthouse: {
    configPath: './lighthouse.config.js',
    outputDirectory: './lighthouse-results'
  },
  reporting: {
    outputFormats: ['json', 'html'],
    outputDirectory: './reports',
    includeScreenshots: true
  },
  performanceBudgets: {
    categories: {
      performance: 90,
      accessibility: 95,
      bestPractices: 90,
      seo: 90
    },
    failureThreshold: 'any'
  }
};
```

### New Configuration (v2.0)

```javascript
// signaler.config.js (v2.0)
export default {
  lighthouse: {
    configPath: './lighthouse.config.js',
    outputDirectory: './lighthouse-results',
    devices: ['mobile', 'desktop'] // New option
  },
  reporting: {
    outputFormats: ['json', 'html', 'markdown', 'csv'],
    outputDirectory: './reports',
    includeScreenshots: true,
    // New performance options
    enableProgressIndicators: true,
    optimizeFileIO: true,
    streamingThreshold: 20,
    compressionEnabled: true,
    maxMemoryMB: 1024
  },
  performanceBudgets: {
    categories: {
      performance: 90,
      accessibility: 95,
      bestPractices: 90,
      seo: 90
    },
    // New metrics budgets
    metrics: {
      lcpMs: 2500,
      fcpMs: 1800,
      tbtMs: 300,
      cls: 0.1
    },
    failureThreshold: 'majority' // Changed from 'any'
  },
  // New AI optimization options
  ai: {
    enableOptimizedReports: true,
    patternRecognition: true,
    actionableGuidance: true
  },
  // New integration options
  integrations: {
    webhooks: {
      url: 'https://your-monitoring-platform.com/webhook',
      retries: 5,
      timeout: 10000,
      enableRetryBackoff: true
    },
    cicd: {
      platform: 'github-actions',
      failOnBudgetViolation: true,
      generateArtifacts: true
    }
  }
};
```

## 🔄 API Migration

### Report Generation

**Old API (v1.x):**
```typescript
import { ReportGenerator } from '@kiro/signaler';

const generator = new ReportGenerator({
  outputFormats: ['json', 'html'],
  outputDirectory: './reports'
});

const report = await generator.generate(auditData);
```

**New API (v2.0):**
```typescript
import { ReportGeneratorEngine } from '@kiro/signaler';

const engine = new ReportGeneratorEngine({
  outputFormats: ['json', 'html'],
  outputDirectory: './reports',
  // New performance options
  enableProgressIndicators: true,
  optimizeFileIO: true,
  streamingThreshold: 20,
  tokenOptimization: true
});

// Note: generate() now requires format parameter
const report = await engine.generate(auditData, 'json');
```

### Batch Report Generation

**Old API (v1.x):**
```typescript
const reports = await generator.generateAll(auditData, ['json', 'html']);
```

**New API (v2.0):**
```typescript
const reports = await engine.generateMultiple(auditData, ['json', 'html']);
```

### Error Handling

**Old API (v1.x):**
```typescript
try {
  const report = await generator.generate(auditData);
} catch (error) {
  console.error('Generation failed:', error.message);
}
```

**New API (v2.0):**
```typescript
import { ErrorRecoveryManager } from '@kiro/signaler/infrastructure';

const recovery = new ErrorRecoveryManager({
  fallbackDirectory: '/tmp/signaler-fallback',
  enableGracefulDegradation: true
});

try {
  const report = await engine.generate(auditData, 'json');
} catch (error) {
  const result = await recovery.attemptRecovery(error, {
    operation: 'report_generation',
    context: { format: 'json' }
  });
  
  if (result.success) {
    console.log('Recovered with fallback:', result.fallbackPath);
  } else {
    console.error('Recovery failed:', result.error);
  }
}
```

## 📊 Performance Budget Migration

### Old Budget Configuration

```javascript
performanceBudgets: {
  categories: {
    performance: 90,
    accessibility: 95
  },
  failureThreshold: 'any'
}
```

### New Budget Configuration

```javascript
performanceBudgets: {
  categories: {
    performance: 90,
    accessibility: 95,
    bestPractices: 90,
    seo: 90
  },
  // New: Core Web Vitals budgets
  metrics: {
    lcpMs: 2500,      // Largest Contentful Paint
    fcpMs: 1800,      // First Contentful Paint
    tbtMs: 300,       // Total Blocking Time
    cls: 0.1,         // Cumulative Layout Shift
    inpMs: 200        // Interaction to Next Paint
  },
  // New: More flexible failure thresholds
  failureThreshold: 'majority', // 'any', 'majority', 'all'
  
  // New: Contextual budgets
  contextual: {
    'homepage': {
      categories: { performance: 95 },
      metrics: { lcpMs: 2000 }
    },
    'checkout': {
      categories: { performance: 98 },
      metrics: { lcpMs: 1500 }
    }
  }
}
```

## 🚀 CLI Migration

### Command Changes

**Old Commands (v1.x):**
```bash
signaler audit --config ./config.js
signaler report --input ./results
signaler budget --check
```

**New Commands (v2.0):**
```bash
# Enhanced audit with new options
signaler audit --config ./config.js --ai-optimized --streaming

# New report generation options
signaler report --input ./results --format html,json,csv --ai-optimized

# Enhanced budget checking
signaler budget --config ./config.js --verbose --trend-analysis

# New monitoring command
signaler monitor --config ./config.js --interval 300

# New dashboard generation
signaler dashboard --input ./reports --output ./dashboard.html
```

### New CLI Options

```bash
# AI and optimization options
--ai-optimized              # Enable AI-powered analysis
--streaming                 # Use streaming processing for large datasets
--memory-limit <mb>         # Set memory usage limit
--compression               # Enable output compression

# Progress and feedback
--progress                  # Show detailed progress indicators
--verbose                   # Detailed logging output
--quiet                     # Minimal output

# Performance options
--parallel <n>              # Number of parallel workers
--timeout <ms>              # Operation timeout
--retry-attempts <n>        # Number of retry attempts

# Output options
--format <formats>          # Comma-separated output formats
--output-dir <path>         # Custom output directory
--no-cleanup               # Keep temporary files
```

## 🔧 Integration Migration

### GitHub Actions

**Old Workflow (v1.x):**
```yaml
- name: Run Performance Audit
  run: |
    npm install @kiro/signaler
    signaler audit --config .github/config.js
```

**New Workflow (v2.0):**
```yaml
- name: Install Signaler
  run: npx jsr add @kiro/signaler

- name: Run Performance Audit
  run: |
    signaler audit \
      --config .github/signaler.config.js \
      --ai-optimized \
      --streaming \
      --format json,html,csv

- name: Check Performance Budgets
  run: signaler budget --config .github/budget.config.js --fail-on-violation

- name: Generate Dashboard
  run: signaler dashboard --input reports/ --output dashboard.html
```

### GitLab CI

**Old Configuration (v1.x):**
```yaml
performance:
  script:
    - npm install @kiro/signaler
    - signaler audit --config .gitlab/config.js
```

**New Configuration (v2.0):**
```yaml
performance:
  script:
    - npx jsr add @kiro/signaler
    - signaler audit --config .gitlab/signaler.config.js --streaming
    - signaler budget --config .gitlab/budget.config.js
  artifacts:
    reports:
      performance: reports/performance.json
    paths:
      - reports/
```

## 📝 Configuration File Migration

### Automated Migration Tool

Signaler v2.0 includes a migration tool to help convert your configuration:

```bash
# Migrate existing configuration
signaler migrate --from ./old-config.js --to ./signaler.config.js

# Validate migrated configuration
signaler validate --config ./signaler.config.js

# Preview migration changes
signaler migrate --from ./old-config.js --preview
```

### Manual Migration Checklist

- [ ] Update `performanceBudgets.failureThreshold` from `'any'` to `'majority'`
- [ ] Add new `metrics` section to performance budgets
- [ ] Add `ai` configuration section for AI features
- [ ] Add `integrations` section for webhooks and CI/CD
- [ ] Update `reporting` section with new performance options
- [ ] Add `devices` array to lighthouse configuration
- [ ] Update error handling to use new error recovery system
- [ ] Update CLI commands to use new options and flags

## 🧪 Testing Migration

### Update Test Configuration

**Old Test Setup (v1.x):**
```typescript
import { ReportGenerator } from '@kiro/signaler';

const generator = new ReportGenerator(testConfig);
const result = await generator.generate(mockData);
```

**New Test Setup (v2.0):**
```typescript
import { ReportGeneratorEngine } from '@kiro/signaler';

const engine = new ReportGeneratorEngine({
  ...testConfig,
  enableProgressIndicators: false, // Disable for tests
  optimizeFileIO: false,           // Use simple I/O for tests
  streamingThreshold: Infinity     // Disable streaming for tests
});

const result = await engine.generate(mockData, 'json');
```

### Property-Based Testing

v2.0 includes enhanced property-based testing. Update your test suite:

```typescript
import fc from 'fast-check';

// Old approach
test('report generation works', () => {
  const result = generator.generate(sampleData);
  expect(result).toBeDefined();
});

// New approach with property-based testing
test('report generation is consistent', () => {
  fc.assert(fc.property(
    fc.array(fc.record({
      url: fc.webUrl(),
      scores: fc.record({
        performance: fc.integer(0, 100),
        accessibility: fc.integer(0, 100)
      })
    })),
    async (auditData) => {
      const result = await engine.generate(auditData, 'json');
      expect(result.metadata.generatedAt).toBeDefined();
      expect(result.pages).toHaveLength(auditData.length);
    }
  ));
});
```

## 🚨 Common Migration Issues

### Memory Usage

**Issue**: Out of memory errors with large datasets
**Solution**: Configure memory limits and streaming

```javascript
// Add to your configuration
reporting: {
  maxMemoryMB: 1024,
  streamingThreshold: 50,
  compressionEnabled: true
}
```

### Performance Regression

**Issue**: Slower report generation
**Solution**: Enable performance optimizations

```javascript
// Add to your configuration
reporting: {
  optimizeFileIO: true,
  enableProgressIndicators: true,
  parallel: true
}
```

### Configuration Validation Errors

**Issue**: Invalid configuration format
**Solution**: Use the migration tool or validation

```bash
# Validate your configuration
signaler validate --config ./signaler.config.js

# Get detailed validation errors
signaler validate --config ./signaler.config.js --verbose
```

### CLI Command Not Found

**Issue**: `signaler` command not found after upgrade
**Solution**: Reinstall and verify PATH

```bash
# Reinstall
npx jsr add @kiro/signaler

# Verify installation
signaler --version

# Check PATH (if needed)
echo $PATH
```

## 📚 Additional Resources

- [Features Documentation](./FEATURES.md) - Complete feature overview
- [Configuration Reference](./configuration-and-routes.md) - Detailed configuration options
- [API Documentation](https://signaler.kiro.dev/api) - Complete API reference
- [Troubleshooting Guide](./getting-started.md#troubleshooting) - Common issues and solutions

## 🆘 Getting Help

If you encounter issues during migration:

1. **Check the troubleshooting section** in this guide
2. **Use the migration tool** for automated configuration updates
3. **Validate your configuration** with `signaler validate`
4. **Review the changelog** for detailed changes
5. **Open an issue** on GitHub with your specific migration problem

## 📋 Migration Checklist

- [ ] Backup existing configuration and reports
- [ ] Uninstall v1.x and install v2.0
- [ ] Update Node.js to 18+ if needed
- [ ] Migrate configuration file
- [ ] Update API calls in code
- [ ] Update CLI commands and scripts
- [ ] Update CI/CD configurations
- [ ] Test report generation
- [ ] Validate performance budgets
- [ ] Update documentation and team guides
- [ ] Train team on new features

---

**Need help?** Join our [Discord community](https://discord.gg/signaler) or [open an issue](https://github.com/kiro-org/signaler/issues) on GitHub.