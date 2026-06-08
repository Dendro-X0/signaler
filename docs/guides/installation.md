# Installation

Signaler supports two distribution paths: a **portable global installer** (recommended) and **project-local JSR** installs. They solve different problems.

## Quick reference

| Goal | Command |
|------|---------|
| Global `signaler` on PATH | Portable installer (below) |
| Project dependency | `npx jsr add @signaler/cli --pnpm` |
| Run without global install | `pnpm exec node node_modules/@signaler/cli/src/cli-entry.js --version` |
| Repair shell command after JSR add | `pnpm exec node node_modules/@signaler/cli/src/cli-entry.js install-shim` |

## Global install (recommended)

Creates `signaler` and `signalar` launchers without npm global quirks.

### Git Bash on Windows (and all Bash shells)

`irm` and `iex` are **PowerShell only**. In Git Bash, use the shell installer:

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
signaler --version
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
signaler --version
```

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
signaler --version
```

Lifecycle:

```bash
signaler upgrade
signaler uninstall --global
```

Requires **Node.js 18+** on the machine (the portable bundle ships compiled JS; the installer runs `npm install --omit=dev` inside the bundle).

## Project install (JSR)

Use the JSR CLI — **not** bare `pnpm i jsr:@signaler/cli` unless you are on **pnpm 10.9+** with JSR registry configured.

**Latest on JSR:** check [jsr.io/@signaler/cli](https://jsr.io/@signaler/cli) for the published version. Install fixes ship in **5.0.1+** (publish required before `@5.0.1` resolves).

```bash
# Replace VERSION with the latest on JSR (e.g. 5.0.0 until 5.0.1 is published)
npx jsr add @signaler/cli@VERSION --pnpm
```

Example after 5.0.1 is live:

```bash
npx jsr add @signaler/cli@5.0.1 --pnpm
```

This writes `.npmrc` (`@jsr:registry=https://npm.jsr.io`) and adds `@signaler/cli` as `npm:@jsr/signaler__cli@…`.

### Run from a JSR install

JSR npm tarballs do **not** populate `node_modules/.bin/signaler` (registry limitation). Use one of:

**npm/pnpm script (recommended):**

```json
{
  "scripts": {
    "signaler": "node node_modules/@signaler/cli/src/cli-entry.js",
    "audit": "node node_modules/@signaler/cli/src/cli-entry.js audit"
  }
}
```

Then:

```bash
pnpm run signaler -- --version
pnpm run audit -- --cwd . --base-url http://127.0.0.1:3000
```

**Direct node:**

```bash
node node_modules/@signaler/cli/src/cli-entry.js audit --cwd . --base-url http://127.0.0.1:3000
```

**Shell shim** (walks up to find `node_modules`, or falls back to portable install):

```bash
node node_modules/@signaler/cli/src/cli-entry.js install-shim
signaler --version
```

### Common mistakes

| Command | Result |
|---------|--------|
| `pnpm i jsr:@signaler/cli` on pnpm 9 | `ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER` — use `npx jsr add` instead |
| `signaler` after JSR add only | Not on PATH — use scripts, `node …/cli-entry.js`, or `install-shim` |
| `node node_modules/@signaler/cli/dist/bin.js` from JSR | **Broken** — JSR rewrites `dist/` imports to `npm:` URLs; use `src/cli-entry.js` |

## Requirements

- Node.js **18.0.0** or newer
- For audits: Chrome/Chromium available to Lighthouse (managed serve handles app startup when configured)

## See also

- [Distribution policy](../specs/distribution-policy.md)
- [Troubleshooting](./troubleshooting.md)
- [JSR release checklist](../operations/jsr-release.md)
