# Installation

Signaler is distributed **only** through GitHub Release native packaging — not npm or JSR.

**Start here:** [Install matrix (OS × shell)](/docs/signaler/install-matrix) — pick the right command for your terminal.

## Quick reference

| Environment | Install |
|-------------|---------|
| **Windows + Git Bash** (Cursor, VS Code) | `curl -fsSL …/install.sh \| bash` |
| **Windows PowerShell / CMD** | `irm …/install.ps1 \| iex` |
| **macOS / Linux / WSL** | `curl -fsSL …/install.sh \| bash` |
| **Windows (GUI)** | `signaler-<version>-windows-setup.exe` from [GitHub Releases](https://github.com/Dendro-X0/signaler/releases) |

Pin a release (recommended for first install and CI):

```bash
SIGNALER_VERSION=5.1.5 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

```powershell
$env:SIGNALER_VERSION = "5.1.5"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

Verify:

```bash
signaler --version
signalar --version
```

## Windows + Git Bash (Cursor default)

Many Windows developers use **Git Bash** as the default terminal in Cursor or VS Code. Use **`install.sh`**, not PowerShell `irm | iex`:

```bash
SIGNALER_VERSION=5.1.5 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
source ~/.bashrc
signaler --version
```

Install location: `%LOCALAPPDATA%\signaler\` (same as the PowerShell installer). Launchers: `signaler`, `signalar`, and `.cmd` wrappers for CMD.

## Windows PowerShell

```powershell
$env:SIGNALER_VERSION = "5.1.5"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
signaler --version
```

`irm` and `iex` are **PowerShell only**. Do not run them in Bash.

## macOS / Linux / WSL

```bash
SIGNALER_VERSION=5.1.5 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
source ~/.bashrc   # or ~/.zshrc
signaler --version
```

Install location: `~/.local/share/signaler/`. PATH is appended to your shell profile.

## Install time

The portable installer downloads a zip, then runs **`npm ci`/`npm install`** for Lighthouse, Playwright, axe-core, and related audit tooling (~180 packages). **First install usually takes 5–15 minutes** depending on network and disk speed.

The install script prints **four numbered steps**, download timing, and **live npm output** (or an elapsed-time counter when stdout is not a TTY).

## Update and uninstall

**Update (preferred):** re-run the same install script with a new `SIGNALER_VERSION`.

**Update (alternative):** `signaler upgrade` — on Windows, use Signaler **5.1.4+** (earlier builds had broken upgrade extraction).

**Uninstall:** `signaler uninstall --global` — see [install matrix](/docs/signaler/install-matrix) for manual PATH cleanup (uninstall does not remove PATH entries).

## Manual download

From [GitHub Releases](https://github.com/Dendro-X0/signaler/releases):

1. **`signaler-<version>-portable.zip`** — unpack; run `install.sh` or `install.ps1` from the release assets, or `npm ci` when `package-lock.json` is bundled.
2. **`signaler-<version>-windows-setup.exe`** — guided Windows install.

## Requirements

- **Node.js 18+** on the target machine (installer verifies this).
- Chrome/Chromium for Lighthouse audits (managed serve can start your app when configured).

## Deprecated: npm and JSR

npm and JSR installs are **unsupported** and may break without notice. Do not use:

- `npm i -g @signaler/cli`
- `pnpm i jsr:@signaler/cli`
- `npx jsr add @signaler/cli`

For CI, use the [GitHub Action](/docs/signaler/github-actions) (installs from GitHub Release) or run `install.sh` in the workflow.

## Local development (maintainers)

```bash
git clone https://github.com/Dendro-X0/signaler.git
cd signaler && pnpm install && pnpm run build
node dist/cli-entry.js audit --help
```

## See also

- [Install matrix](/docs/signaler/install-matrix)
- [Distribution policy](/docs/signaler/distribution-policy)
- [Release playbook](/docs/signaler/release-playbook)
- [Troubleshooting](/docs/signaler/troubleshooting)
- [Known limits](/docs/signaler/known-limits)
