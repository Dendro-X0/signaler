#!/usr/bin/env bash
set -euo pipefail

REPO="${SIGNALER_REPO:-Dendro-X0/signaler}"
VERSION="${SIGNALER_VERSION:-latest}"
BASE_DIR=""
INSTALL_DIR=""
BIN_DIR=""
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/signaler-install-XXXXXX")"
ZIP_PATH="${TMP_ROOT}/signaler-portable.zip"

log_step() {
  printf '\n==> %s\n' "$1"
}

log_note() {
  printf '    %s\n' "$1"
}

is_tty() {
  [ -t 1 ] || [ -t 2 ]
}

elapsed_label() {
  local start="$1"
  local now
  now=$(date +%s)
  local elapsed=$((now - start))
  printf '%dm %ds' $((elapsed / 60)) $((elapsed % 60))
}

run_npm_install() {
  local dir="$1"
  local start
  start=$(date +%s)

  log_step "Step 4/4: Installing runtime dependencies"
  log_note "First install usually takes 5–15 minutes (Lighthouse, Playwright, axe-core, and related tooling)."
  log_note "npm may look idle while resolving the dependency tree — elapsed time updates below."
  printf '\n'

  (
    cd "$dir"
    local npm_args=(--omit=dev --ignore-scripts --no-audit --no-fund)
    local npm_cmd="install"
    if [ -f package-lock.json ]; then
      npm_cmd="ci"
      log_note "Using package-lock.json (npm ci) for a faster, reproducible install."
      printf '\n'
    fi

    if is_tty; then
      npm "$npm_cmd" "${npm_args[@]}" --loglevel=info
    else
      npm "$npm_cmd" "${npm_args[@]}" --loglevel=warn &
      local npm_pid=$!
      while kill -0 "$npm_pid" 2>/dev/null; do
        printf '\r[signaler] installing dependencies... %s elapsed' "$(elapsed_label "$start")"
        sleep 3
      done
      wait "$npm_pid"
      printf '\n'
    fi
  )

  printf '    Dependencies ready in %s.\n' "$(elapsed_label "$start")"
}

is_windows_unix_shell() {
  [ "${OS:-}" = "Windows_NT" ] || [[ "$(uname -s 2>/dev/null)" =~ ^MINGW|^MSYS ]]
}

resolve_install_paths() {
  if is_windows_unix_shell && [ -n "${LOCALAPPDATA:-}" ]; then
    local appdata_unix=""
    if command -v cygpath >/dev/null 2>&1; then
      appdata_unix="$(cygpath -u "$LOCALAPPDATA")"
    else
      appdata_unix="${LOCALAPPDATA//\\//}"
    fi
    BASE_DIR="$appdata_unix/signaler"
  else
    BASE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/signaler"
  fi
  INSTALL_DIR="$BASE_DIR/current"
  BIN_DIR="$BASE_DIR/bin"
}

write_cmd_launcher() {
  local name="$1"
  local root_for_cmd="$INSTALL_DIR"
  if command -v cygpath >/dev/null 2>&1; then
    root_for_cmd="$(cygpath -w "$INSTALL_DIR")"
  fi
  cat > "$BIN_DIR/${name}.cmd" <<EOF
@echo off
setlocal
set "ROOT=${root_for_cmd}"
node "%ROOT%\\dist\\bin.js" %*
EOF
}

ensure_path_line() {
  local shell_rc="$1"
  local path_line="export PATH=\"$BIN_DIR:\$PATH\""
  if [ -f "$shell_rc" ]; then
    if grep -F "$path_line" "$shell_rc" >/dev/null 2>&1; then
      return
    fi
  fi
  printf '\n# Signaler CLI\n%s\n' "$path_line" >> "$shell_rc"
}

normalize_release_tag() {
  if [ "$1" = "latest" ]; then
    printf '%s' "latest"
    return
  fi
  case "$1" in
    v*) printf '%s' "$1" ;;
    *) printf 'v%s' "$1" ;;
  esac
}

get_release_api_url() {
  if [ "$VERSION" = "latest" ]; then
    printf 'https://api.github.com/repos/%s/releases/latest\n' "$REPO"
  else
    TAG="$(normalize_release_tag "$VERSION")"
    printf 'https://api.github.com/repos/%s/releases/tags/%s\n' "$REPO" "$TAG"
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

require_cmd curl
require_cmd unzip
require_cmd node
require_cmd npm

CURL_GITHUB_HEADERS=(-H 'User-Agent: signaler-install-script')
if [ -n "${GITHUB_TOKEN:-}" ]; then
  CURL_GITHUB_HEADERS+=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
elif [ -n "${GH_TOKEN:-}" ]; then
  CURL_GITHUB_HEADERS+=(-H "Authorization: Bearer ${GH_TOKEN}")
fi

resolve_install_paths

INSTALL_START=$(date +%s)

log_step "Step 1/4: Resolving Signaler release"
printf 'Repo: %s\n' "$REPO"
printf 'Version: %s\n' "$VERSION"

RELEASE_JSON="$(curl -fsSL "${CURL_GITHUB_HEADERS[@]}" "$(get_release_api_url)")"
ASSET_URL="$(printf '%s' "$RELEASE_JSON" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); const asset=(data.assets||[]).find((entry)=>typeof entry.name==='string' && entry.name.endsWith('-portable.zip')); if(!asset){process.exit(1);} process.stdout.write(asset.browser_download_url);")" || {
  printf 'Could not find a portable release asset for %s (%s).\n' "$REPO" "$VERSION" >&2
  exit 1
}
RELEASE_TAG="$(printf '%s' "$RELEASE_JSON" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(data.tag_name || 'unknown');")"

log_step "Step 2/4: Downloading portable release (${RELEASE_TAG})"
DOWNLOAD_START=$(date +%s)
if is_tty; then
  curl -fSL --progress-bar -H 'User-Agent: signaler-install-script' "$ASSET_URL" -o "$ZIP_PATH"
  printf '\n'
else
  curl -fsSL -H 'User-Agent: signaler-install-script' "$ASSET_URL" -o "$ZIP_PATH"
fi
log_note "Download complete in $(elapsed_label "$DOWNLOAD_START")."

log_step "Step 3/4: Extracting to ${INSTALL_DIR}"
rm -rf "$INSTALL_DIR"
mkdir -p "$(dirname "$INSTALL_DIR")" "$BIN_DIR"
unzip -q "$ZIP_PATH" -d "$TMP_ROOT/extracted"

EXTRACTED_ROOT="$(find "$TMP_ROOT/extracted" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [ -z "$EXTRACTED_ROOT" ]; then
  printf 'Portable zip did not contain an extractable root directory.\n' >&2
  exit 1
fi

mv "$EXTRACTED_ROOT" "$INSTALL_DIR"
run_npm_install "$INSTALL_DIR"

cat > "$BIN_DIR/signaler" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../current" && pwd)"
exec node "$ROOT_DIR/dist/bin.js" "$@"
EOF

cat > "$BIN_DIR/signalar" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../current" && pwd)"
exec node "$ROOT_DIR/dist/bin.js" "$@"
EOF

chmod +x "$BIN_DIR/signaler"
chmod +x "$BIN_DIR/signalar"

if is_windows_unix_shell; then
  write_cmd_launcher signaler
  write_cmd_launcher signalar
fi

rm -rf "$TMP_ROOT"

case "${SHELL:-}" in
  */zsh)
    ensure_path_line "${ZDOTDIR:-$HOME}/.zshrc"
    ;;
  *)
    ensure_path_line "$HOME/.bashrc"
    ;;
esac

export PATH="$BIN_DIR:$PATH"

printf '\nInstalled %s to %s\n' "$RELEASE_TAG" "$INSTALL_DIR"
printf 'Launcher directory: %s\n' "$BIN_DIR"
printf 'Total install time: %s\n' "$(elapsed_label "$INSTALL_START")"
printf '\nNext steps:\n'
printf '  1. PATH was updated for this shell and appended to your shell profile.\n'
printf '  2. Restart your terminal if it was already open in another window.\n'
printf '  3. Run: signaler --version (or: signalar --version)\n'
printf '  4. Update: re-run this install script with SIGNALER_VERSION=<tag>, or signaler upgrade\n'
printf '  5. Remove: signaler uninstall --global (see docs/guides/install-matrix.md for PATH cleanup)\n'
