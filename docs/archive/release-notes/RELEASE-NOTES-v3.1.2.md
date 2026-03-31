# Signaler v3.1.2 Release Notes

Status: In progress  
Target date: TBD

## Summary

`v3.1.2` continues the patch cycle after `v3.1.1` with implementation focus on Workstream K Phase 2 delivery and release hardening.

## Planned Focus

- Rust benchmark normalizer and aggregator implementation (`workstream-k-phase2-kickoff.md`).
- Additional parity and fallback evidence for Rust/Node benchmark paths.
- Patch-level CLI/docs refinements from dogfooding feedback.

## Release Checklist

1. `pnpm run build`
2. `pnpm run bench:workstream-j:overhead`
3. `pnpm run bench:v63:gate`
4. `pnpm run release -- --target-version 3.1.2`
