# JSR release checklist

Use this checklist when publishing `@signaler/cli` to [JSR](https://jsr.io/@signaler/cli).

## 1. Version sync

`package.json` and `jsr.json` **must match** (enforced by `scripts/jsr-publish.js` and `pnpm run release:preflight`).

Current line: **4.1.0**

```bash
node -e "const p=require('./package.json');const j=require('./jsr.json');console.log(p.version,j.version,p.version===j.version?'ok':'MISMATCH')"
```

## 2. Preflight

```bash
pnpm run build
pnpm run test:smoke
pnpm run release:preflight
```

Optional strict gate:

```bash
pnpm run release:preflight:strict
```

## 3. JSR preparation

```bash
pnpm run prepare:jsr
```

Validates exports, essential files, and version alignment.

## 4. Publish

**Dry run (no upload):**

```bash
pnpm run jsr:publish -- --dry-run
```

**Publish (interactive browser auth):**

```bash
pnpm run jsr:publish
```

**CI / non-interactive:** create a token at https://jsr.io/account/tokens then:

```bash
export JSR_TOKEN="<token>"
pnpm run jsr:publish
```

**Skip rebuild** (only if `dist/` is already fresh):

```bash
pnpm run jsr:publish:skip-build
```

## 5. Post-publish smoke

```bash
npx jsr run @signaler/cli@4.1.0 -- --version
npx jsr run @signaler/cli@4.1.0 -- help audit
```

## 6. Consumer upgrade

```bash
npx jsr add @signaler/cli@4.1.0
```

Agents and CI should read `docs/guides/migration-v4.md` before upgrading from 3.2.x.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Version mismatch | Set the same semver in `package.json` and `jsr.json` |
| Dirty worktree | Commit/tag release, or `pnpm run jsr:publish -- --allow-dirty` (avoid for real releases) |
| Missing `dist/engine` | Run `pnpm run build` before publish |
| Slow types warning | Default `--allow-slow-types` is passed by the publish helper |
| GitHub CI test failed, empty log UI | Download workflow artifact `vitest-log-<node-version>` from the failed run; re-run locally with `CI=true pnpm test:full` |

## CI vs JSR publish

GitHub **CI** on `main` does not block **JSR** publish. After local verification:

```bash
CI=true pnpm test:full
pnpm run release:preflight
pnpm run jsr:publish
```

GitHub **Release** assets (portable zip / Windows installer) use tag push `v*` and only require `pnpm test:smoke` in `publish.yml`.
