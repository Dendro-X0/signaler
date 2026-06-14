# Installation

Signaler is distributed **only** through GitHub Release native packaging — not npm or JSR.

**Start here:** [Install matrix (OS × shell)](./install-matrix.md) — pick the right command for your terminal.

Install scripts default to **`latest`** (the current GitHub Release). Set `SIGNALER_VERSION` only when you need a pinned tag (CI, reproducibility, or matching release notes).

## Quick reference

| Environment | Install (latest) |
|-------------|------------------|
| **Windows + Git Bash** (Cursor, VS Code) | `curl -fsSL …/install.sh \| bash` |
| **Windows PowerShell / CMD** | `irm …/install.ps1 \| iex` |
| **macOS / Linux / WSL** | `curl -fsSL …/install.sh \| bash` |
| **Windows (GUI)** | `signaler-<version>-windows-setup.exe` from [GitHub Releases](https://github.com/Dendro-X0/signaler/releases) |

### Bash / Git Bash / macOS / Linux / WSL

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
source ~/.bashrc
signaler --version
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
signaler --version
```

`irm` and `iex` are **PowerShell only**. Do not run them in Git Bash.

### Pin a version (optional)

```bash
SIGNALER_VERSION=5.1.6 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

```powershell
$env:SIGNALER_VERSION = "5.1.6"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

## Windows + Git Bash (Cursor default)

Use **`install.sh`**, not PowerShell `irm | iex`:

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
source ~/.bashrc
signaler --version
```

Install location: `%LOCALAPPDATA%\signaler\` (same as the PowerShell installer).

## GitHub API rate limits

Installers call the GitHub API to resolve `latest` or a tag. On busy networks you may see `API rate limit exceeded` in PowerShell.

Fix: set a read-only token, then re-run the install command:

```powershell
$env:GITHUB_TOKEN = "<read-only PAT>"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

```bash
export GITHUB_TOKEN="<read-only PAT>"
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

Or download `signaler-*-portable.zip` from [Releases](https://github.com/Dendro-X0/signaler/releases) and install locally.

## Install time

First install runs **`npm ci`/`npm install`** for Lighthouse, Playwright, axe-core, and related tooling (~180 packages). **Expect 5–15 minutes.** The script prints four numbered steps and timing.

## Update and uninstall

**Update:** re-run the same install command (resolves `latest` again), or `signaler upgrade`.

**Uninstall:** `signaler uninstall --global` — see [install matrix](./install-matrix.md) for PATH cleanup.

## Manual download

From [GitHub Releases](https://github.com/Dendro-X0/signaler/releases):

1. **`signaler-<version>-portable.zip`** — unpack; run bundled `install.sh` / `install.ps1`, or `npm ci` when `package-lock.json` is present.
2. **`signaler-<version>-windows-setup.exe`** — guided Windows install.

## Requirements

- **Node.js 18+** on the target machine.
- Chrome/Chromium for Lighthouse audits.

## Deprecated: npm and JSR

Do not use `npm i -g @signaler/cli`, JSR packages, or `npx jsr run`. For CI, use the [GitHub Action](./github-actions.md) or `install.sh` in the workflow.

## Local development (maintainers)

```bash
git clone https://github.com/Dendro-X0/signaler.git
cd signaler && pnpm install && pnpm run build
node dist/cli-entry.js audit --help
```

## See also

- [Install matrix](./install-matrix.md)
- [Troubleshooting](./troubleshooting.md)
- [Known limits](./known-limits.md)
- [Distribution policy](../specs/distribution-policy.md)
