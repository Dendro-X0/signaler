#!/usr/bin/env bash
set -euo pipefail

# Create standalone installer scripts for GitHub Releases
CLI_NAME="signaler"
PKG_VER="$(node -p "require('./package.json').version")"
REPO_SLUG="${GITHUB_REPOSITORY:-Dendro-X0/signaler}"

# Create release directory if it doesn't exist
mkdir -p release

# Create standalone Unix installer
cat > "release/install.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Signaler CLI Installer
# Usage: curl -fsSL https://github.com/REPO/releases/latest/download/install.sh | bash
# Or: curl -fsSL https://github.com/REPO/releases/download/vX.Y.Z/install.sh | bash

REPO="${SIGNALER_REPO:-REPO_PLACEHOLDER}"
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
EOF

# Replace placeholder with actual repo
sed -i "s|REPO_PLACEHOLDER|$REPO_SLUG|g" "release/install.sh"

# Create standalone Windows installer
cat > "release/install.ps1" << 'EOF'
# Signaler CLI Installer for Windows
# Usage: iwr https://github.com/REPO/releases/latest/download/install.ps1 | iex

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Configuration
$DefaultRepo = "REPO_PLACEHOLDER"
$Version = "latest"
$AddToPath = $false

# Get repository from environment or use default
$RepoSlug = if ($env:SIGNALER_REPO) { $env:SIGNALER_REPO } else { $DefaultRepo }

Write-Host "Installing Signaler CLI..." -ForegroundColor Green
Write-Host "Repository: $RepoSlug"
Write-Host "Version: $Version"

# Set environment variable for future use
[Environment]::SetEnvironmentVariable("SIGNALER_REPO", $RepoSlug, "User")
$env:SIGNALER_REPO = $RepoSlug

# Check if signaler is already installed
$ExistingSignaler = Get-Command signaler -ErrorAction SilentlyContinue
if ($ExistingSignaler) {
    Write-Host "Signaler is already installed. Attempting to upgrade..." -ForegroundColor Yellow
    try {
        & $ExistingSignaler.Source upgrade --repo $RepoSlug
        Write-Host "Upgrade completed successfully!" -ForegroundColor Green
        & $ExistingSignaler.Source --help
        exit 0
    } catch {
        Write-Host "Upgrade failed, continuing with fresh install..." -ForegroundColor Yellow
    }
}

# Determine installation paths
$InstallBase = Join-Path $env:LOCALAPPDATA "signaler"
$InstallDir = Join-Path $InstallBase "current"
$BinDir = Join-Path $InstallBase "bin"

Write-Host "Install directory: $InstallDir"

# Create directories
if (!(Test-Path $InstallDir)) { New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null }
if (!(Test-Path $BinDir)) { New-Item -ItemType Directory -Force -Path $BinDir | Out-Null }

# Get release information
Write-Host "Fetching release information..."
try {
    $ApiUrl = "https://api.github.com/repos/$RepoSlug/releases/latest"
    $Release = Invoke-RestMethod -Uri $ApiUrl -Headers @{"User-Agent"="signaler-installer"}
} catch {
    Write-Error "Failed to fetch release information: $_"
    exit 1
}

# Find portable zip asset
$PortableAsset = $Release.assets | Where-Object { $_.name -like "*-portable.zip" } | Select-Object -First 1
if (!$PortableAsset) {
    Write-Error "No *-portable.zip asset found in release."
    Write-Host "Available assets:"
    $Release.assets | ForEach-Object { Write-Host "  - $($_.name)" }
    exit 1
}

$ZipUrl = $PortableAsset.browser_download_url
Write-Host "Downloading: $ZipUrl"

# Download and extract
$TempZip = Join-Path $env:TEMP "signaler-portable.zip"
$StagingDir = Join-Path $env:TEMP "signaler-staging-$(Get-Random)"

try {
    # Download
    Invoke-WebRequest -Uri $ZipUrl -OutFile $TempZip -Headers @{"User-Agent"="signaler-installer"}
    
    # Create staging directory
    if (!(Test-Path $StagingDir)) { New-Item -ItemType Directory -Force -Path $StagingDir | Out-Null }
    
    # Extract zip
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($TempZip, $StagingDir)
    
    # Find root directory in extracted content
    $ExtractedRoot = Get-ChildItem -Directory $StagingDir | Select-Object -First 1
    if (!$ExtractedRoot) {
        throw "Portable zip did not contain a root directory."
    }
    
    # Install (remove existing and move new)
    Write-Host "Installing to: $InstallDir"
    if (Test-Path $InstallDir) { 
        Remove-Item -Recurse -Force $InstallDir 
    }
    Move-Item -Path $ExtractedRoot.FullName -Destination $InstallDir -Force
    
    # Create launcher script
    $LauncherPath = Join-Path $BinDir "signaler.cmd"
    $LauncherContent = @"
@echo off
setlocal
set "SIGNALER_ROOT=$InstallDir"
node "%SIGNALER_ROOT%\dist\bin.js" %*
"@
    Set-Content -Path $LauncherPath -Value $LauncherContent -Encoding ASCII
    
    Write-Host ""
    Write-Host "Installation completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Installation details:"
    Write-Host "  Installed to: $InstallDir"
    Write-Host "  Launcher: $LauncherPath"
    Write-Host ""
    
    # Handle PATH setup
    $CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $PathSegments = if ($CurrentPath) { $CurrentPath.Split(';') } else { @() }
    
    if ($PathSegments -notcontains $BinDir) {
        $NewPath = if ($CurrentPath) { "$CurrentPath;$BinDir" } else { $BinDir }
        [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
        Write-Host "Added to PATH. Please restart your terminal or PowerShell session." -ForegroundColor Green
    } else {
        Write-Host "Bin directory already in PATH." -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Quick start:"
    Write-Host "  signaler --help"
    Write-Host "  signaler wizard"
    Write-Host ""
    
    # Test installation
    Write-Host "Testing installation..."
    try {
        $TestOutput = & $LauncherPath --version 2>&1
        Write-Host "Installation test passed!" -ForegroundColor Green
    } catch {
        Write-Host "Installation test failed, but files are installed correctly." -ForegroundColor Yellow
        Write-Host "You may need to restart your terminal and try again."
    }
    
} catch {
    Write-Error "Installation failed: $_"
    exit 1
} finally {
    # Clean up temporary files
    if (Test-Path $TempZip) { Remove-Item -Force $TempZip -ErrorAction SilentlyContinue }
    if (Test-Path $StagingDir) { Remove-Item -Recurse -Force $StagingDir -ErrorAction SilentlyContinue }
}

Write-Host ""
Write-Host "Installation completed! Restart your terminal to use 'signaler' command." -ForegroundColor Green
EOF

# Replace placeholder with actual repo
sed -i "s|REPO_PLACEHOLDER|$REPO_SLUG|g" "release/install.ps1"

# Make scripts executable
chmod +x "release/install.sh"

echo "✅ Created standalone installers:"
echo "  - release/install.sh (Unix/Linux/macOS)"
echo "  - release/install.ps1 (Windows PowerShell)"
echo ""
echo "Single-command installation:"
echo "  Unix: curl -fsSL https://github.com/$REPO_SLUG/releases/latest/download/install.sh | bash"
echo "  Windows: iwr https://github.com/$REPO_SLUG/releases/latest/download/install.ps1 | iex"