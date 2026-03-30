# Signaler v2.1.0 Release Notes

## Overview

Signaler v2.1.0 delivers the Multi-Audit Architecture Foundation, introducing a pluggable audit system that enables new audit types while keeping existing Lighthouse workflows intact.

## Highlights

- **Plugin Interface System**: Standardized `AuditPlugin` interface with dependency-aware lifecycle control.
- **Plugin Registry**: Central registry that resolves dependencies, enables/disabled states, and enforces compatibility.
- **Multi-Audit Engine**: Orchestrates multiple audit types with shared execution context and coordinated error handling.
- **Intelligent Batch Scheduling**: Parallel execution with resource-aware batching and caching.
- **Backward Compatibility**: Existing configuration files, CLI commands, and report formats remain unchanged.

## Architecture Additions

- `plugin-interface.ts`
- `plugin-registry.ts`
- `audit-context.ts`
- `multi-audit-engine.ts`
- `batch-scheduler.ts`

## Testing Enhancements

- Property-based coverage for plugin registration, configuration distribution, and parallel execution.
- Integration tests validating multi-audit workflows end-to-end.

## Migration Notes

No breaking changes. Existing users can upgrade without modifying configurations or scripts.

## Installation

```bash
npx jsr add @signaler/cli@2.1.0
```

## Verification Checklist

- Confirm package availability on https://jsr.io/@signaler/cli
- Run `signaler --version` to verify the CLI version
- Execute a baseline audit to confirm existing workflows
