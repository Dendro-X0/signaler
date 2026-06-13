# Installation

Signaler is distributed **only** through GitHub Release native packaging — not npm or JSR.

## Quick reference

| Platform | Install |
|----------|---------|
| **Git Bash / WSL / macOS / Linux** | `curl -fsSL …/install.sh \| bash` |
| **Windows PowerShell** | `irm …/install.ps1 \| iex` |
| **Windows (GUI)** | Download `signaler-<version>-windows-setup.exe` from [GitHub Releases](https://github.com/Dendro-X0/signaler/releases) |
| **Upgrade** | `signaler upgrade` |
| **Uninstall** | `signaler uninstall --global` |

### Install time

The portable installer downloads a zip, then runs **`npm ci`/`npm install`** for Lighthouse, Playwright, axe-core, and related audit tooling (~180 packages). **First install usually takes 5–15 minutes** depending on network and disk speed.

The install script prints **four numbered steps**, download timing, and **live npm output** (or an elapsed-time counter when stdout is not a TTY). `signaler upgrade` uses the same dependency step with progress messages.

To pin a release without waiting on `latest` resolution:

```bash
SIGNALER_VERSION=5.1.2 curl -fsSL …/install.sh | bash
```

`irm` and `iex` are **PowerShell only**. In Bash:

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
signaler --version
signalar --version
```

Install a specific release:

```bash
SIGNALER_VERSION=5.1.2 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

## Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
signaler --version
```

Specific version:

```powershell
$env:SIGNALER_VERSION = "5.1.2"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

## Manual download

From [GitHub Releases](https://github.com/Dendro-X0/signaler/releases):

1. **`signaler-<version>-portable.zip`** — unpack; dependencies install automatically via `install.sh` / `install.ps1` (or `npm ci` when `package-lock.json` is bundled).
2. **`signaler-<version>-windows-setup.exe`** — guided Windows install.

## Requirements

- **Node.js 18+** on the target machine (installer verifies this).
- Chrome/Chromium for Lighthouse audits (managed serve can start your app when configured).

## Deprecated: npm and JSR

npm and JSR installs are **unsupported** and may break without notice. Do not use:

- `npm i -g @signaler/cli`
- `pnpm i jsr:@signaler/cli`
- `npx jsr add @signaler/cli`

For CI, use the [GitHub Action](../guides/github-actions.md) (installs from GitHub Release) or run `install.sh` in the workflow.

## Local development (maintainers)

```bash
git clone https://github.com/Dendro-X0/signaler.git
cd signaler && pnpm install && pnpm run build
node dist/cli-entry.js audit --help
```

## See also

- [Distribution policy](../specs/distribution-policy.md)
- [Release playbook](../operations/release-playbook.md)
- [Troubleshooting](./troubleshooting.md)
