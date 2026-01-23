# Signaler v2.5.0 Release Notes

## Overview

Signaler v2.5.0 (The Mobile & UX Optimization Update) focuses on delivering a superior mobile user experience and deep insights into the impact of third-party dependencies.

## Highlights

- **Mobile UX Optimization**: 
  - Comprehensive analysis of touch target sizes to ensure mobile usability.
  - Automated viewport configuration checks.
  - Responsive design detection to identify non-optimized layouts.
- **Third-Party Impact Analysis**:
  - Detailed breakdown of performance costs for external scripts.
  - Automated service categorization for Analytics, Ads, and Social widgets.
  - Detection of render-blocking third-party resources.
- **Core Improvements**: 
  - Updated `AuditPlugin` interface to support evolving audit requirements.
  - Enhanced metric collection for UX scores and third-party payload sizes.

## New Plugins

- `MobileUXPlugin`: Analyzes touch targets, viewport, and responsiveness.
- `ThirdPartyPlugin`: Analyzes transfer size, duration, and blocking nature of external resources.

## Testing Enhancements

- Added 10 new unit tests covering 100% of the logic for Mobile UX and Third-Party audits.
- Verified parallel execution stability with the updated plugin registry.

## Migration Notes

This update is fully backward compatible. v2.5.0 introduces new metrics and metadata that will appear in your reports automatically.

## Installation

```bash
npx jsr add @signaler/cli@2.5.0
```

## Verification Checklist

- [ ] Confirm package version is updated in `package.json` and `jsr.json`.
- [ ] Verify unit tests pass with `pnpm test:full`.
- [ ] Run `signaler --version` to confirm 2.5.0.
- [ ] Verify that `mobile-ux` and `third-party-scripts` plugins are executed during audits.
