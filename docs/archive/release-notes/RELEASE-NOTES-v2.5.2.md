# Signaler v2.5.2 Release Notes

## Overview

Signaler v2.5.2 focuses on improving brand consistency and user experience by standardizing the configuration filename as `signaler.config.json`.

## Highlights

### 🔧 Configuration Standardization
- The default configuration file is now `signaler.config.json` (previously `apex.config.json`).
- All CLI commands now look for `signaler.config.json` by default.
- Added migration guidance in CLI error messages when the old filename is detected.

### 📽️ Documentation & Assets
- Added high-quality GIF demos to the README showcasing:
    - Interactive `wizard` workflow.
    - Comprehensive `audit` execution.
    - Visual report exploration.
    - AI-powered insight generation.

## Migration Notes

This update involves a filename change for your configuration:
1. Rename your existing `apex.config.json` to `signaler.config.json`.
2. Or run `signaler wizard` to generate a new optimized configuration.

The configuration schema remains fully backward compatible.

## Installation

```bash
npx jsr add @signaler/cli@2.5.2
```

## Verification Checklist

- [ ] Confirm package version is updated in `package.json` and `jsr.json`.
- [ ] Verify `signaler --version` reports `2.5.2`.
- [ ] Confirm `signaler audit` correctly picks up `signaler.config.json`.
- [ ] Verify the new demo GIFs are visible in the README.
