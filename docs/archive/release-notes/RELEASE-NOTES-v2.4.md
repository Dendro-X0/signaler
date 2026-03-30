# Signaler v2.4.0 Release Notes

## Overview

Signaler v2.4.0 (The Quality Completion Update) marks the delivery of the initial high-level roadmap roadmap, completing the Security, Performance Deep-Dive, and SEO/PWA auditing capabilities.

## Highlights

- **Security & Vulnerability Auditing**: Automated detection of missing security headers and common web vulnerabilities.
- **Performance Deep-Dive**: 
  - Image optimization analysis (Format, Sizing, CLS, Lazy Loading).
  - JavaScript Bundle Coverage analysis using Playwright's native coverage API.
  - Font loading optimization checks.
- **SEO & PWA Standards**:
  - Deep meta-tag, canonical, and structured data validation.
  - Comprehensive PWA compliance auditing (Manifest, Service Worker, Installability).
- **Core Stability**: Refined plugin system with improved error isolation and faster batch execution.

## New Plugins

- `SecurityHeadersPlugin`
- `EnhancedAccessibilityPlugin`
- `ImageOptimizationPlugin`
- `BundleAnalysisPlugin`
- `FontPerformancePlugin`
- `SEODeepPlugin`
- `PWAEnhancedPlugin`

## Testing Enhancements

- Comprehensive unit tests for all new audit plugins with 100% logic coverage.
- Expanded property-based tests for multi-audit stability.
- Automated CI validation for JSR publication standards.

## Migration Notes

This update is fully backward compatible. Users will automatically receive the new audit findings in their reports when running the default audit suite.

## Installation

```bash
npx jsr add @signaler/cli@2.4.0
```

## Verification Checklist

- Confirm package availability on https://jsr.io/@signaler/cli
- Run `signaler --version` to verify the CLI version (2.4.0)
- Execute a baseline audit to confirm new findings are present
