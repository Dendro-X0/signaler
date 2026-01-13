#!/usr/bin/env bash
set -euo pipefail
CLI_NAME="signaler"
PKG_VER="$(node -p "require('./package.json').version")"
ZIP_BASENAME="${CLI_NAME}-${PKG_VER}-portable"
ZIP_DIR="release/${ZIP_BASENAME}"
mkdir -p "${ZIP_DIR}"
cp -R dist "${ZIP_DIR}/dist"
# Install production dependencies in the zip directory
cd "${ZIP_DIR}"
npm install --production --no-package-lock
cd ../..
mkdir -p "${ZIP_DIR}/release-assets"
cp release-assets/run.sh "${ZIP_DIR}/release-assets/run.sh"
cp release-assets/run.cmd "${ZIP_DIR}/release-assets/run.cmd"
cp release-assets/signaler.sh "${ZIP_DIR}/release-assets/signaler.sh"
cp release-assets/signaler.cmd "${ZIP_DIR}/release-assets/signaler.cmd"
cp release-assets/install.sh "${ZIP_DIR}/release-assets/install.sh"
cp release-assets/install.ps1 "${ZIP_DIR}/release-assets/install.ps1"
cp package.json "${ZIP_DIR}/package.json"
cp README.md "${ZIP_DIR}/README.md"
cp LICENSE "${ZIP_DIR}/LICENSE"
chmod +x "${ZIP_DIR}/release-assets/run.sh"
chmod +x "${ZIP_DIR}/release-assets/signaler.sh"
chmod +x "${ZIP_DIR}/release-assets/install.sh"

# Create zip using different methods depending on what's available
cd release
if command -v zip >/dev/null 2>&1; then
  # Use zip if available (Linux/macOS)
  zip -r "${ZIP_BASENAME}.zip" "${ZIP_BASENAME}"
elif command -v powershell >/dev/null 2>&1; then
  # Use PowerShell Compress-Archive if available (Windows)
  powershell -Command "Compress-Archive -Path '${ZIP_BASENAME}' -DestinationPath '${ZIP_BASENAME}.zip' -Force"
elif command -v pwsh >/dev/null 2>&1; then
  # Use PowerShell Core if available
  pwsh -Command "Compress-Archive -Path '${ZIP_BASENAME}' -DestinationPath '${ZIP_BASENAME}.zip' -Force"
elif command -v tar >/dev/null 2>&1; then
  # Fallback to tar.gz if zip is not available
  tar -czf "${ZIP_BASENAME}.tar.gz" "${ZIP_BASENAME}"
  echo "Created ${ZIP_BASENAME}.tar.gz (zip not available)"
else
  echo "Warning: No compression tool available. Directory created but not compressed."
  echo "Created directory: release/${ZIP_BASENAME}"
fi
