# Release Notes - v5.1.0

**Date:** 2026-05-28  
**Package:** Signaler CLI (GitHub Release native packaging)

## Summary

Unified benchmark signal plane for quality profiles: side-runner outputs auto-bridge into analyze ranking, benchmark family gates land in `quality-pack.json`, and `query --view delta` reports pack + benchmark regressions. Includes a links-runner fix for HTML entity decoding on Next.js image URLs.

## Added

### Benchmark auto-bridge (6A)

- `signaler analyze --auto-benchmark-bridge` writes fixtures to `.signaler/runners/benchmark-bridge/`.
- Derives families from existing artifacts: security (headers), reliability (health), SEO (links + results), accessibility (axe summary) when present.
- `web-quality` and `pr-quality` profiles run analyze with auto-bridge enabled.

### Benchmark family gates (6B)

- `qualityPack.benchmarkSignals` in `signaler.config.json` — per-family `maxRecords`, missing-header caps, latency/indexability limits, etc.
- Pack evaluation runs auto-bridge and attaches `benchmarkSignals.families` to `gates/quality-pack.json`.
- Guidance in pack output when benchmark gates fail.

### Signal-plane delta (6C)

- `signaler query --view delta --baseline-dir <dir>` adds `qualityPack`, `benchmarkSignals`, and `headlines` alongside performance triage deltas.
- `baselineCompare.benchmarkFamilies` and `baselineCompare.qualityPack` in config for verify/CI regression policy.

## Fixed

- **Broken links false positives** — HTML `src`/`srcset` attributes with `&amp;` are decoded before URL checks (fixes Next.js `/_next/image?...` 400s).

## Upgrade from 5.0.2

```bash
signaler upgrade
```

Or re-run the install script for your platform.

Optional config (defaults keep benchmark gates off until enabled):

```json
"qualityPack": {
  "benchmarkSignals": {
    "enabled": true,
    "securityBaseline": { "maxMissingHeaders": 0 }
  }
}
```

## Local verification

- Unit tests: auto-bridge, pack benchmark gates, query-delta benchmark plane, links HTML decode.
- Dogfood: `web-quality` audit on next-blogkit-pro — auto-bridge 3 families, links 0 broken after fix, bundle scans after production build.
