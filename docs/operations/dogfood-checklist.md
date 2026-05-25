# Dogfood Checklist (Reference Apps)

Status: Active  
Phase: [v4.1 adoptability](../roadmap/phase1-v4.1-adoptability.md)  
Last updated: 2026-05-25

Use this checklist after releases and before tagging `v4.1.x`. Paths are **local** — clone reference repos beside `signaler` or set `SIGNALER_DOGFOOD_*` env vars.

## Reference apps

| App | Layout | Typical use |
|-----|--------|-------------|
| **next-blogkit-pro** | Standalone Next | Single-app managed serve, Turbopack/pnpm edge cases |
| **next-ecommercekit-monorepo** | pnpm monorepo (`apps/web`) | Monorepo serve plan, full scope (40+ routes) |

Public repos (if available): `Dendro-X0/next-blogkit-pro`, `Dendro-X0/next-ecommercekit-monorepo`.

## Preconditions

- Node 20+ and pnpm 10
- Signaler built or installed: `pnpm run build` in `signaler/` or `npx jsr run @signaler/cli@latest`
- No stale `.signaler/` unless testing incremental skip

## Checklist A — Standalone (blogkit-class)

```bash
cd /path/to/next-blogkit-pro
node /path/to/signaler/dist/bin.js audit \
  --cwd . \
  --base-url http://127.0.0.1:3000 \
  --scope quick \
  --summary
```

| Signal | Pass |
|--------|------|
| Managed serve starts (dev or production) without manual server | Yes / No |
| Discover completes; config written | Yes / No |
| Run finishes; `.signaler/run.json` exists | Yes / No |
| Analyze produces `.signaler/analyze.json` | Yes / No |
| `query --view perf` returns JSON | Yes / No |
| Wall clock (quick scope, warm cache) | \_\_ min (target &lt; 5) |
| P(ref) / trust copy visible in summary or report | Yes / No |

## Checklist B — Monorepo (ecommerce-class)

```bash
cd /path/to/next-ecommercekit-monorepo
node /path/to/signaler/dist/bin.js audit \
  --cwd . \
  --base-url http://127.0.0.1:3000 \
  --scope full \
  --managed-serve-mode auto \
  --summary
```

| Signal | Pass |
|--------|------|
| Serve plan resolves monorepo root + `apps/web` | Yes / No |
| Full scope discover (40+ routes) | Yes / No |
| Coverage line shows audited % (scope honesty) | Yes / No |
| Run completes without ECONNREFUSED | Yes / No |
| Incremental skip rerun skips prior greens | Yes / No |

Incremental skip rerun:

```bash
node /path/to/signaler/dist/bin.js audit --cwd . --incremental-skip --skip-discover --summary
```

## Checklist C — CI parity (signaler repo)

Run in `signaler/`:

```bash
CI=true pnpm test:full
CI=true pnpm test:coverage
pnpm run release:preflight
```

All must exit 0 before JSR publish.

## Checklist D — JSR install smoke (post-publish)

```bash
npx jsr run @signaler/cli@<version> -- --version
npx jsr run @signaler/cli@<version> -- help audit
npx jsr run @signaler/cli@<version> -- query --help
```

## Failure triage

| Symptom | Likely cause | Doc |
|---------|--------------|-----|
| ECONNREFUSED | Server not up; managed serve off | [`managed-production-serve.md`](../specs/managed-production-serve.md) |
| Turbopack build fail | Next 16 webpack fallback | [`troubleshooting.md`](../guides/troubleshooting.md) |
| Score vs DevTools confusion | Throughput / P(ref) semantics | [`lab-semantics.md`](./lab-semantics.md) |
| CI ENOENT on paths | Hardcoded local paths in tests | Use `test/fixtures/` only |

## Sign-off

| Release | Date | Blogkit | Ecommerce | CI | JSR smoke | Notes |
|---------|------|---------|-----------|----|-----------|-------|
| 4.0.0 | | | | | | |
| 4.1.0 | | | | | | |
