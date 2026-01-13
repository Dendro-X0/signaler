#!/usr/bin/env bash
set -euo pipefail

# Signaler CLI Installer
# Usage: curl -fsSL https://github.com/REPO/releases/latest/download/install.sh | bash
# Or: curl -fsSL https://github.com/REPO/releases/download/vX.Y.Z/install.sh | bash

REPO="${SIGNALER_REPO:-Dendro-X0/signaler}"
VERSION="latest"
INSTALL_DIR=""
ADD_TO_PATH="0"

# Parse command line arguments
while [ $# -gt 0 ]; do
  case "$1" in
    --repo)
      REPO="${2:-}"; shift 2 ;;
    --version)
      VERSION="${2:-latest}"; shift 2 ;;
    --dir)
      INSTALL_DIR="${2:-}"; shift 2 ;;
    --add-to-path)
      ADD_TO_PATH="1"; shift 1 ;;
    --help)
      echo "Signaler CLI Installer"
      echo ""
      echo "Usage:"
      echo "  curl -fsSL https://github.com/$REPO/releases/latest/download/install.sh | bash"
      echo "  curl -fsSL https://github.com/$REPO/releases/latest/download/install.sh | bash -s -- --add-to-path"
      echo ""
      echo "Options:"
      echo "  --repo <owner/name>    GitHub repository (default: $REPO)"
      echo "  --version <version>    Version to install (default: latest)"
      echo "  --dir <path>           Installation directory"
      echo "  --add-to-path          Add to PATH automatically"
      echo "  --help                 Show this help"
      exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

export SIGNALER_REPO="$REPO"

# Check if signaler is already installed and try to upgrade
if command -v signaler >/dev/null 2>&1; then
  echo "Signaler is already installed. Attempting to upgrade..."
  if [ "$VERSION" = "latest" ]; then
    signaler upgrade --repo "$REPO" || echo "Upgrade failed, continuing with fresh install..."
  else
    signaler upgrade --repo "$REPO" --version "$VERSION" || echo "Upgrade failed, continuing with fresh install..."
  fi
  if command -v signaler >/dev/null 2>&1; then
    echo "Upgrade completed successfully!"
    signaler --help
    exit 0
  fi
fi

# Determine installation directory
BASE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/signaler"
INSTALL_DIR="${INSTALL_DIR:-$BASE_DIR/current}"
BIN_DIR="$BASE_DIR/bin"

echo "Installing Signaler CLI..."
echo "Repository: $REPO"
echo "Version: $VERSION"
echo "Install directory: $INSTALL_DIR"

# Create directories
mkdir -p "$BIN_DIR"

# Update shell profiles with SIGNALER_REPO
PROFILE_UPDATED="0"
PROFILE_FILES=("$HOME/.profile" "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.config/fish/config.fish")

for profile in "${PROFILE_FILES[@]}"; do
  if [ -f "$profile" ]; then
    if [ "${profile##*.}" = "fish" ]; then
      if grep -q "SIGNALER_REPO" "$profile" 2>/dev/null; then
        sed -i.bak "s/^set -Ux SIGNALER_REPO .*/set -Ux SIGNALER_REPO \"$REPO\"/" "$profile" || true
      else
        printf '\nset -Ux SIGNALER_REPO "%s"\n' "$REPO" >> "$profile"
      fi
      PROFILE_UPDATED="1"
    else
      if grep -q "SIGNALER_REPO" "$profile" 2>/dev/null; then
        sed -i.bak "s/^export SIGNALER_REPO=.*/export SIGNALER_REPO=\"$REPO\"/" "$profile" || true
      else
        printf '\nexport SIGNALER_REPO="%s"\n' "$REPO" >> "$profile"
      fi
      PROFILE_UPDATED="1"
    fi
  fi
done

# Get release information
if [ "$VERSION" = "latest" ]; then
  API_URL="https://api.github.com/repos/$REPO/releases/latest"
else
  API_URL="https://api.github.com/repos/$REPO/releases/tags/$VERSION"
fi

echo "Fetching release information..."
JSON="$(curl -fsSL -H 'User-Agent: signaler-installer' "$API_URL")"

# Find portable zip asset
ZIP_URL="$(printf '%s' "$JSON" | tr '\n' ' ' | sed -n 's/.*"browser_download_url"[ ]*:[ ]*"\([^"]*-portable\.zip\)".*/\1/p' | head -n 1)"

if [ -z "$ZIP_URL" ]; then
  echo "Error: No *-portable.zip asset found in release." >&2
  echo "Available assets:"
  printf '%s' "$JSON" | tr '\n' ' ' | sed -n 's/.*"browser_download_url"[ ]*:[ ]*"\([^"]*\)".*/\1/p'
  exit 1
fi

echo "Downloading: $ZIP_URL"

# Download and extract
tmp_zip="$(mktemp -t signaler-portable.XXXXXX.zip)"
tmp_dir="$(mktemp -d -t signaler-staging.XXXXXX)"
trap 'rm -f "$tmp_zip"; rm -rf "$tmp_dir"' EXIT

curl -fL -H 'User-Agent: signaler-installer' "$ZIP_URL" -o "$tmp_zip"
unzip -q "$tmp_zip" -d "$tmp_dir"

# Find the root directory in the zip
root_dir="$(find "$tmp_dir" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [ -z "$root_dir" ]; then
  echo "Error: Portable zip did not contain a root directory." >&2
  exit 1
fi

# Install
echo "Installing to: $INSTALL_DIR"
rm -rf "$INSTALL_DIR"
mkdir -p "$(dirname "$INSTALL_DIR")"
mv "$root_dir" "$INSTALL_DIR"

# Create launcher script
launcher="$BIN_DIR/signaler"
cat > "$launcher" <<'LAUNCHER_EOF'
#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../current" && pwd)"
exec node "$ROOT_DIR/dist/bin.js" "$@"
LAUNCHER_EOF
chmod +x "$launcher"

echo ""
echo "✅ Signaler CLI installed successfully!"
echo ""
echo "Installation details:"
echo "  Installed to: $INSTALL_DIR"
echo "  Launcher: $launcher"
echo ""

# Handle PATH setup
if [ "$ADD_TO_PATH" = "1" ]; then
  # Add to PATH in shell profiles
  for profile in "${PROFILE_FILES[@]}"; do
    if [ -f "$profile" ]; then
      if [ "${profile##*.}" = "fish" ]; then
        if ! grep -q "$BIN_DIR" "$profile" 2>/dev/null; then
          printf '\nset -Ux PATH "%s" $PATH\n' "$BIN_DIR" >> "$profile"
        fi
      else
        if ! grep -q "$BIN_DIR" "$profile" 2>/dev/null; then
          printf '\nexport PATH="%s:$PATH"\n' "$BIN_DIR" >> "$profile"
        fi
      fi
    fi
  done
  echo "✅ Added to PATH. Restart your terminal or run:"
  echo "   export PATH=\"$BIN_DIR:\$PATH\""
else
  echo "To use signaler from anywhere, add this to your PATH:"
  echo "   export PATH=\"$BIN_DIR:\$PATH\""
  echo ""
  echo "Or run the installer with --add-to-path to do this automatically."
fi

if [ "$PROFILE_UPDATED" = "1" ]; then
  echo ""
  echo "Updated shell profile with SIGNALER_REPO. Restart your terminal to apply changes."
fi

echo ""
echo "Quick start:"
echo "  $launcher --help"
echo "  $launcher wizard"
echo ""

# Test the installation
if [ "$ADD_TO_PATH" = "1" ] || echo "$PATH" | grep -q "$BIN_DIR"; then
  echo "Testing installation..."
  if "$launcher" --help >/dev/null 2>&1; then
    echo "✅ Installation test passed!"
  else
    echo "⚠️  Installation test failed, but files are installed correctly."
  fi
fi
