#!/usr/bin/env bash
set -euo pipefail

REPO="${SIGNALER_REPO:-Dendro-X0/signaler}"
VERSION="${SIGNALER_VERSION:-latest}"
BASE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/signaler"
INSTALL_DIR="$BASE_DIR/current"
BIN_DIR="$BASE_DIR/bin"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/signaler-install-XXXXXX")"
ZIP_PATH="${TMP_ROOT}/signaler-portable.zip"

get_release_api_url() {
  if [ "$VERSION" = "latest" ]; then
    printf 'https://api.github.com/repos/%s/releases/latest\n' "$REPO"
  else
    printf 'https://api.github.com/repos/%s/releases/tags/%s\n' "$REPO" "$VERSION"
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

printf 'Installing Signaler...\n'
printf 'Repo: %s\n' "$REPO"
printf 'Version: %s\n' "$VERSION"

RELEASE_JSON="$(curl -fsSL -H 'User-Agent: signaler-install-script' "$(get_release_api_url)")"
ASSET_URL="$(printf '%s' "$RELEASE_JSON" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); const asset=(data.assets||[]).find((entry)=>typeof entry.name==='string' && entry.name.endsWith('-portable.zip')); if(!asset){process.exit(1);} process.stdout.write(asset.browser_download_url);")" || {
  printf 'Could not find a portable release asset for %s (%s).\n' "$REPO" "$VERSION" >&2
  exit 1
}
RELEASE_TAG="$(printf '%s' "$RELEASE_JSON" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(data.tag_name || 'unknown');")"

curl -fsSL -H 'User-Agent: signaler-install-script' "$ASSET_URL" -o "$ZIP_PATH"
unzip -q "$ZIP_PATH" -d "$TMP_ROOT/extracted"

EXTRACTED_ROOT="$(find "$TMP_ROOT/extracted" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [ -z "$EXTRACTED_ROOT" ]; then
  printf 'Portable zip did not contain an extractable root directory.\n' >&2
  exit 1
fi

rm -rf "$INSTALL_DIR"
mkdir -p "$(dirname "$INSTALL_DIR")" "$BIN_DIR"
mv "$EXTRACTED_ROOT" "$INSTALL_DIR"

cat > "$BIN_DIR/signaler" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../current" && pwd)"
exec node "$ROOT_DIR/dist/bin.js" "$@"
EOF

chmod +x "$BIN_DIR/signaler"
rm -rf "$TMP_ROOT"

printf '\nInstalled %s to %s\n' "$RELEASE_TAG" "$INSTALL_DIR"
printf 'Launcher directory: %s\n' "$BIN_DIR"
printf '\nNext steps:\n'
printf '  1. Add "%s" to PATH if needed.\n' "$BIN_DIR"
printf '  2. Restart your terminal if it was already open.\n'
printf '  3. Run: signaler --version\n'
printf '  4. Update later with: signaler upgrade\n'
printf '  5. Remove later with: signaler uninstall --global\n'
