# V6.3 Low-Memory Evidence

Generated: 2026-03-23T08:49:24.435Z
Status: PASS
Workspace: E:\Web Project\experimental-workspace\apex-auditor-workspace\signaler\benchmarks\workspaces\v63-low-memory-evidence
Base URL: http://127.0.0.1:50061

## Baseline

- elapsedMs: 25457
- resolvedParallel: 1
- stabilityStatus: stable
- reasons: low-memory

## Forced Low Memory

- elapsedMs: 20034
- resolvedParallel: 1
- stabilityStatus: stable
- reasons: forced-resource-profile, low-memory

## Assertions

- lowMemoryReasonPresent: true
- forcedProfileReasonPresent: true
- parallelCappedToOne: true
- stableRunner: true
- predictabilityImproved: true

