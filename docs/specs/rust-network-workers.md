# Rust Network Workers (Phase 4)

Phase 4 adds an optional Rust sidecar path for non-Lighthouse network commands.

## Commands Covered

- `signaler health`
- `signaler headers`
- `signaler links`
- `signaler console`

## Feature Flags

Global switch:

```bash
SIGNALER_RUST_NETWORK=1
```

Per-command switches:

```bash
SIGNALER_RUST_HEALTH=1
SIGNALER_RUST_HEADERS=1
SIGNALER_RUST_LINKS=1
SIGNALER_RUST_CONSOLE=1
```

Precedence:

1. Per-command flag (`0` or `1`)
2. Global `SIGNALER_RUST_NETWORK`
3. Default off

## Runtime Behavior

- Node remains the default and source-of-truth path.
- When a Rust flag is enabled, Signaler attempts one sidecar invocation per command.
- On sidecar failure (missing binary/cargo, timeout, invalid payload, non-zero exit), Signaler automatically falls back to Node.
- Fallback reason is printed once and recorded in command artifact metadata:
  - `.signaler/health.json`
  - `.signaler/headers.json`
  - `.signaler/links.json`
  - `.signaler/console.json`

Each artifact now includes:

- `meta.accelerator.engine` (`node` or `rust`)
- `meta.accelerator.requested`
- `meta.accelerator.used`
- `meta.accelerator.fallbackReason` (when fallback occurs)
- `meta.accelerator.sidecarElapsedMs` (when available)

## Sidecar Command Surface

Rust sidecar command:

```bash
signaler_hotpath net-worker --mode <health|headers|links|console> --in <path> --out <path>
```

Contract:

- input/output JSON with `schemaVersion: 1`
- bounded worker concurrency and retry/cooldown accounting
- strict mode matching and output validation in Node adapter

## Console Mode Note

`console` mode currently routes through the Rust adapter contract but falls back to Node CDP execution when the Rust sidecar cannot service console collection. This keeps command behavior stable while preserving the same flag/fallback contract.

## Benchmarks and Gate

Commands:

```bash
pnpm run bench:phase4
pnpm run bench:phase4:ci
pnpm run bench:phase4:gate
```

Outputs:

- `benchmarks/out/phase4-baseline.json`
- `benchmarks/out/phase4-baseline.md`

Soft-gate severe failures:

- runtime regression `> max(35%, 60000ms)` for same command/engine baseline
- `status=error`
- required artifact missing/empty
- high error rate (`>0.20`, console uses a higher severe threshold to avoid noisy CDP false positives)
