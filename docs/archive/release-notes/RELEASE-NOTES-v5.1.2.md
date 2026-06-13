# Release Notes - v5.1.2

**Date:** 2026-06-13  
**Package:** Signaler CLI (GitHub Release native packaging)

## Summary

Throughput parallelism defaults and guidance: **6 parallel workers** on most machines, with clearer messaging that fewer workers improve stability—not measurement accuracy.

## Changed

- **Default parallel** — throughput `run` and mode defaults use **6** workers on capable hosts (auto-capped on low memory).
- **PR preset** — `job run --preset pr` passes `--parallel 6`.
- **Docs** — `lab-semantics.md`, README, AGENTS.md, troubleshooting, and configuration updated for parallelism guidance.
- **CLI / wizard tips** — recommend `--parallel 6`; backoff logs note stability vs accuracy.

## Upgrade from 5.1.1

```bash
signaler upgrade
```

Or re-run the install script for your platform.
