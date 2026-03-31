# Signaler v3.1.1 Release Notes

Status: In progress  
Target date: TBD

## Summary

`v3.1.1` starts the next patch line after `v3.1.0` and focuses on incremental hardening and follow-up delivery for Workstream K Phase 2 execution.

## Planned Focus

- Rust benchmark normalizer kickoff (`workstream-k-phase2-kickoff.md`).
- Deterministic parity checks between Rust and Node benchmark normalization paths.
- Small UX and docs refinements based on release feedback.

## Release Checklist

1. `pnpm run build`
2. `pnpm run bench:workstream-j:overhead`
3. `pnpm run bench:v63:gate`
4. `pnpm run release -- --target-version 3.1.1`
