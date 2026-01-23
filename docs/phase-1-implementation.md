# Phase 1 Implementation Guide

**Version**: v2.2.0  
**Status**: In Progress  
**Target Release**: February 2026

This document provides detailed implementation guidance for Phase 1 features: Enhanced Accessibility and Security Headers audits.

---

## Overview

Phase 1 introduces two critical audit plugins:
1. **Enhanced Accessibility Plugin** - Deep WCAG 2.1/2.2 compliance validation
2. **Security Headers Plugin** - OWASP Top 10 security header checks

Both plugins integrate seamlessly with the existing multi-audit architecture introduced in v2.1.0.

---

## Enhanced Accessibility Plugin

### Features

- **axe-core Integration**: Leverages industry-standard accessibility testing library
- **WCAG Compliance Levels**: Validates against A, AA, and AAA standards
- **Comprehensive Coverage**: 
  - Color contrast analysis (including gradients)
  - Keyboard navigation validation
  - Screen reader compatibility
  - ARIA label validation
  - Semantic HTML structure
  - Form accessibility

### Implementation Details

**File**: `src/plugins/accessibility/enhanced-accessibility-plugin.ts`

**Key Methods**:
- `injectAxeCore()`: Injects axe-core library into the page
- `runAxeAnalysis()`: Executes axe-core audit
- `convertAxeViolationsToIssues()`: Transforms axe results to Signaler issue format
- `calculateAccessibilityMetrics()`: Computes WCAG compliance scores

**Output Metrics**:
```typescript
{
  totalViolations: number;
  criticalViolations: number;
  seriousViolations: number;
  moderateViolations: number;
  minorViolations: number;
  wcagACompliance: number;      // 0-100%
  wcagAACompliance: number;     // 0-100%
  wcagAAACompliance: number;    // 0-100%
  passedRules: number;
  incompleteRules: number;
}
```

### Usage Example

```typescript
import { EnhancedAccessibilityPlugin } from '@signaler/cli/plugins';
import { PluginRegistry } from '@signaler/cli/core';

const registry = new PluginRegistry();
const plugin = new EnhancedAccessibilityPlugin();

await plugin.configure({
  enabled: true,
  settings: {
    wcagLevel: 'AA', // A, AA, or AAA
  },
});

registry.register(plugin);
```

### Testing

**Test File**: `test/plugins/enhanced-accessibility-plugin.test.ts`

**Coverage**:
- Plugin metadata validation
- Configuration handling
- Audit execution
- Issue conversion and severity mapping
- WCAG compliance calculation
- Fix guidance generation
- Error handling

**Run Tests**:
```bash
pnpm test:full --filter "EnhancedAccessibilityPlugin"
```

---

## Security Headers Plugin

### Features

- **OWASP Top 10 Validation**: Checks for common security misconfigurations
- **Security Headers**:
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options
  - X-Content-Type-Options
  - Content-Security-Policy (CSP)
  - Referrer-Policy
  - Permissions-Policy
- **Cookie Security**: HttpOnly, Secure, SameSite validation
- **CORS Analysis**: Detects overly permissive policies

### Implementation Details

**File**: `src/plugins/security/security-headers-plugin.ts`

**Key Methods**:
- `checkSecurityHeaders()`: Validates HTTP response headers
- `checkCookieSecurity()`: Analyzes cookie attributes
- `checkCORSConfiguration()`: Validates CORS policy
- `generateHeaderFixGuidance()`: Provides copy-paste header configurations

**Output Metrics**:
```typescript
{
  securityScore: number;         // 0-100
  totalHeaderChecks: number;
  passedHeaderChecks: number;
  failedHeaderChecks: number;
  cookieIssues: number;
  corsIssues: number;
}
```

### Usage Example

```typescript
import { SecurityHeadersPlugin } from '@signaler/cli/plugins';
import { PluginRegistry } from '@signaler/cli/core';

const registry = new PluginRegistry();
const plugin = new SecurityHeadersPlugin();

await plugin.configure({
  enabled: true,
  settings: {},
});

registry.register(plugin);
```

### Testing

**Test File**: `test/plugins/security-headers-plugin.test.ts`

**Coverage**:
- Security header detection
- Cookie security validation
- CORS configuration analysis
- Metrics calculation
- Error handling
- Shared data storage

**Run Tests**:
```bash
pnpm test:full --filter "SecurityHeadersPlugin"
```

---

## Integration with Existing System

### Plugin Registry

Both plugins are automatically registered via `src/plugins/index.ts`:

```typescript
import { getPhase1Plugins } from '@signaler/cli/plugins';

const plugins = getPhase1Plugins();
// Returns: [EnhancedAccessibilityPlugin, SecurityHeadersPlugin]
```

### Multi-Audit Engine Integration

The plugins integrate with the existing `MultiAuditEngine`:

```typescript
import { MultiAuditEngine } from '@signaler/cli/core';
import { getPhase1Plugins } from '@signaler/cli/plugins';

const engine = new MultiAuditEngine();
const plugins = getPhase1Plugins();

for (const plugin of plugins) {
  await plugin.configure({ enabled: true, settings: {} });
  engine.registerPlugin(plugin);
}

const results = await engine.auditPage({
  url: 'https://example.com',
  device: 'desktop',
  pageConfig: { path: '/', label: 'Home' },
});
```

### Report Generation

Results are automatically included in existing reports:

**AI-ANALYSIS.json**:
```json
{
  "criticalIssues": [
    {
      "id": "color-contrast",
      "type": "accessibility",
      "severity": "critical",
      "wcagGuidelines": ["WCAG 2.1 Level AA"]
    },
    {
      "id": "security-header-content-security-policy",
      "type": "security",
      "severity": "critical",
      "owaspCategory": "A03:2021 - Injection"
    }
  ]
}
```

**QUICK-FIXES.md**:
```markdown
### 1. Content Security Policy missing → Critical
- **Impact**: XSS vulnerability
- **Fix**: Add CSP header
- **Implementation**: `Content-Security-Policy: default-src 'self'`
```

---

## CLI Integration

### New Commands

Phase 1 plugins are accessible via existing commands:

```bash
# Run all audits (including Phase 1)
signaler audit

# Run only accessibility audit
signaler audit --only-categories accessibility

# Run only security audit
signaler audit --only-categories security
```

### Configuration

Add to `apex.config.json`:

```json
{
  "baseUrl": "http://localhost:3000",
  "pages": [...],
  "plugins": {
    "enhanced-accessibility": {
      "enabled": true,
      "settings": {
        "wcagLevel": "AA"
      }
    },
    "security-headers": {
      "enabled": true,
      "settings": {}
    }
  }
}
```

---

## Performance Considerations

### Execution Time

- **Enhanced Accessibility**: +500-1000ms per page (axe-core execution)
- **Security Headers**: +50-100ms per page (header analysis)

### Parallel Execution

Both plugins can run in parallel with Lighthouse:

```
Lighthouse (3000ms)
    ↓
Enhanced Accessibility (800ms) ← Parallel with Security Headers
Security Headers (80ms)         ←
    ↓
Total: ~3800ms (vs 3880ms sequential)
```

### Caching

Results are cached when `incremental: true` is enabled:

```json
{
  "incremental": true,
  "buildId": "v1.2.3"
}
```

---

## Troubleshooting

### axe-core Injection Fails

**Symptom**: `window.axe is not defined` error

**Solution**: Ensure Playwright page is fully loaded before injection:

```typescript
await page.goto(url, { waitUntil: 'domcontentloaded' });
```

### Security Headers Not Detected

**Symptom**: All headers reported as missing

**Solution**: Check case-insensitive header lookup:

```typescript
const headerValue = this.getHeaderValue(headers, 'Strict-Transport-Security');
```

### High Memory Usage

**Symptom**: Memory errors during large batch audits

**Solution**: Reduce parallel workers or enable incremental mode:

```bash
signaler audit --parallel 2 --incremental
```

---

## Next Steps

After Phase 1 completion:

1. **Phase 2**: Image Optimization, Bundle Analysis, Font Performance
2. **Phase 3**: SEO Deep Dive, PWA Enhancement
3. **Phase 4**: Mobile UX, Third-Party Scripts
4. **Phase 5**: Regression Detection, CI/CD Integration
5. **Phase 6**: Cross-Browser Testing

---

## Contributing

To add new plugins:

1. Create plugin file in `src/plugins/<category>/<plugin-name>.ts`
2. Implement `AuditPlugin` interface
3. Add tests in `test/plugins/<plugin-name>.test.ts`
4. Register in `src/plugins/index.ts`
5. Update documentation

---

## Resources

- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/)
- [Signaler Plugin Architecture](../docs/plugin-architecture.md)

---

**Last Updated**: January 22, 2026  
**Maintained By**: Signaler Team
