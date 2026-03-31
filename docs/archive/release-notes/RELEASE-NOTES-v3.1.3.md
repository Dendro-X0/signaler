# Signaler v3.1.3 Release Notes

Status: In progress  
Target date: TBD

## Summary

`v3.1.3` continues the patch cycle after `v3.1.2` with focus on Workstream K follow-through, release hardening, and incremental UX/docs polish.

## Planned Focus

- Continue Workstream K implementation and parity/performance validation.
- Improve Rust benchmark accelerator metadata and fallback transparency.
- Apply patch-level CLI and docs improvements from dogfood feedback.

## Release Checklist

1. `pnpm run build`
2. `pnpm run bench:workstream-j:overhead`
3. `pnpm run bench:v63:gate`
4. `pnpm run release -- --target-version 3.1.3`
