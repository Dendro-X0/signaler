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

## Git Bash / macOS / Linux

`irm` and `iex` are **PowerShell only**. In Bash:

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
signaler --version
signalar --version
```

Install a specific release:

```bash
SIGNALER_VERSION=5.0.1 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

## Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
signaler --version
```

Specific version:

```powershell
$env:SIGNALER_VERSION = "5.0.1"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

## Manual download

From [GitHub Releases](https://github.com/Dendro-X0/signaler/releases):

1. **`signaler-<version>-portable.zip`** — unpack; run `npm install --omit=dev` inside; use bundled launchers or `node dist/cli-entry.js`.
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
