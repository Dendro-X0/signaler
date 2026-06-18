# Install matrix (OS × shell)

Signaler ships through **GitHub Release portable installers** only — not npm or JSR. Pick **one install command** for your shell and stick with it on that machine.

**Default:** installers resolve **`latest`** from GitHub Releases. You do not need to set `SIGNALER_VERSION` for a normal install.

## Pick your command

| Environment | Install command | Install location |
|-------------|-----------------|------------------|
| **Windows + Git Bash** (Cursor, VS Code, MSYS) | `curl -fsSL …/install.sh \| bash` | `%LOCALAPPDATA%\signaler\` |
| **Windows PowerShell / CMD** | `irm …/install.ps1 \| iex` | `%LOCALAPPDATA%\signaler\` |
| **macOS / Linux / WSL** | `curl -fsSL …/install.sh \| bash` | `~/.local/share/signaler/` |
| **Windows (GUI)** | `signaler-<version>-windows-setup.exe` from [Releases](https://github.com/Dendro-X0/signaler/releases) | `%LOCALAPPDATA%\signaler\` |

### Bash / Git Bash / macOS / Linux / WSL

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
source ~/.bashrc   # or open a new terminal
signaler --version
```

### Windows PowerShell (not Git Bash)

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
signaler --version
```

### Pin a version (optional)

Use a fixed tag for CI reproducibility or when you must match a release note:

```bash
SIGNALER_VERSION=5.1.9 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

```powershell
$env:SIGNALER_VERSION = "5.1.9"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

Omit `SIGNALER_VERSION` (or set `latest`) for the current GitHub Release.

## Common mistakes

### Using PowerShell install in Git Bash

`irm … | iex` is **PowerShell only**. In Git Bash (including Cursor’s default terminal on Windows), use `install.sh`:

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

### GitHub API rate limit during install

If PowerShell shows `API rate limit exceeded`, the installer is calling the GitHub REST API without authentication. Options:

1. **Retry after a few minutes** (unauthenticated limit is low per IP).
2. **Use a token** (recommended on shared networks):
   ```powershell
   $env:GITHUB_TOKEN = "<read-only PAT>"
   irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
   ```
   Bash/Git Bash: `export GITHUB_TOKEN=...` before running `install.sh`.
3. **Download the portable zip** from [Releases](https://github.com/Dendro-X0/signaler/releases) and run `install.ps1` / `install.sh` from the extracted folder.

### Mixing install scripts on Windows

Both `install.sh` (Git Bash) and `install.ps1` (PowerShell) install to **`%LOCALAPPDATA%\signaler\`**. If you previously installed with an older `install.sh` that wrote to `~/.local/share/signaler/`, remove that copy and reinstall once with the current script.

### Expecting npm / JSR

These are **deprecated** and unsupported:

- `npm i -g @signaler/cli`
- `pnpm i jsr:@signaler/cli`
- `npx jsr add @signaler/cli`

Use the GitHub Release installers or the [GitHub Action](./github-actions.md) in CI.

## Install time

First install runs **`npm ci` / `npm install`** inside the portable bundle (~180 packages: Lighthouse, Playwright, axe-core, etc.). Expect **5–15 minutes** depending on network and disk. The script prints numbered steps and timing.

## Update

**Default:** re-run the **same** install command (still resolves `latest`), or:

```bash
signaler upgrade
```

**Pin:** set `SIGNALER_VERSION=<tag>` when re-running the install script. On Windows, use Signaler **5.1.4+** for reliable in-place upgrade.

## Uninstall

```bash
signaler uninstall --global
```

**Known gap:** uninstall removes install files but **not** PATH entries. See manual cleanup below.

- **Git Bash / macOS / Linux:** remove the `# Signaler CLI` block from `~/.bashrc` or `~/.zshrc`
- **Windows (PowerShell installer):** remove `%LOCALAPPDATA%\signaler\bin` from user PATH
- **Legacy Git Bash install:** also check `~/.local/share/signaler/`

## CI without a global install

1. **[GitHub Action](../.github/actions/signaler/action.yml)** — installs from Release inside the job
2. **`install.sh` in the workflow** — same as local Bash install
3. **Download portable zip** — unpack and invoke `node dist/bin.js` directly

See [GitHub Actions guide](./github-actions.md).

## Requirements

- **Node.js 18+** on the target machine
- Chrome/Chromium for Lighthouse (Playwright may download browsers on first run)

## See also

- [Installation](./installation.md)
- [Troubleshooting](./troubleshooting.md)
- [Known limits](./known-limits.md)
- [Distribution policy](../specs/distribution-policy.md)
