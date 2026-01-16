#!/usr/bin/env pwsh
# Complete clean installation script for Signaler CLI
# This removes all old versions and installs fresh

Write-Host "=== Signaler CLI - Clean Installation ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Remove old installations
Write-Host "Step 1: Removing old installations..." -ForegroundColor Yellow

# Remove from npm global
try {
    Write-Host "  - Uninstalling from npm..." -ForegroundColor Gray
    npm uninstall -g @signaler/cli 2>$null
    npm uninstall -g apex-auditor 2>$null
} catch {
    # Ignore errors
}

# Remove installation directories
$signalerDir = "$env:LOCALAPPDATA\signaler"
if (Test-Path $signalerDir) {
    Write-Host "  - Removing $signalerDir" -ForegroundColor Gray
    Remove-Item $signalerDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Remove old Bun executable if it exists
$bunDir = "$env:LOCALAPPDATA\Programs\signaler"
if (Test-Path $bunDir) {
    Write-Host "  - Removing old Bun executable" -ForegroundColor Gray
    Remove-Item $bunDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "  ✓ Old installations removed" -ForegroundColor Green
Write-Host ""

# Step 2: Clear npm cache
Write-Host "Step 2: Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "  ✓ Cache cleared" -ForegroundColor Green
Write-Host ""

# Step 3: Install latest version
Write-Host "Step 3: Installing latest version from JSR..." -ForegroundColor Yellow
npx jsr add @signaler/cli
Write-Host "  ✓ Installation complete" -ForegroundColor Green
Write-Host ""

# Step 4: Create Git Bash wrapper
Write-Host "Step 4: Creating Git Bash wrapper..." -ForegroundColor Yellow

$BinDir = "$env:LOCALAPPDATA\signaler\bin"
$SignalerRoot = "$env:LOCALAPPDATA\signaler\current"

if (-not (Test-Path $BinDir)) {
    Write-Host "  ✗ Error: Could not find installation directory" -ForegroundColor Red
    Write-Host "    Expected: $BinDir" -ForegroundColor Gray
    exit 1
}

if (-not (Test-Path $SignalerRoot)) {
    Write-Host "  ✗ Error: Could not find Signaler root directory" -ForegroundColor Red
    Write-Host "    Expected: $SignalerRoot" -ForegroundColor Gray
    exit 1
}

# Create the bash wrapper
$WrapperPath = Join-Path $BinDir "signaler"

$WrapperContent = @'
#!/usr/bin/env bash
# Signaler CLI wrapper for Git Bash/Unix

# Detect the Signaler root directory
if [ -d "$HOME/AppData/Local/signaler/current" ]; then
    SIGNALER_ROOT="$HOME/AppData/Local/signaler/current"
elif [ -d "/c/Users/$USER/AppData/Local/signaler/current" ]; then
    SIGNALER_ROOT="/c/Users/$USER/AppData/Local/signaler/current"
elif [ -d "C:/Users/$USER/AppData/Local/signaler/current" ]; then
    SIGNALER_ROOT="C:/Users/$USER/AppData/Local/signaler/current"
else
    echo "Error: Could not find Signaler installation"
    exit 1
fi

# Execute the CLI with Node.js
exec node "$SIGNALER_ROOT/dist/bin.js" "$@"
'@

Set-Content -Path $WrapperPath -Value $WrapperContent -NoNewline

Write-Host "  ✓ Git Bash wrapper created" -ForegroundColor Green
Write-Host ""

# Step 5: Verify installation
Write-Host "Step 5: Verifying installation..." -ForegroundColor Yellow

# Check if signaler command exists
$signalerCmd = Get-Command signaler -ErrorAction SilentlyContinue
if ($signalerCmd) {
    Write-Host "  ✓ Command 'signaler' is available" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Warning: 'signaler' command not found in PATH" -ForegroundColor Yellow
    Write-Host "    You may need to restart your terminal" -ForegroundColor Gray
}

# Check version
$packageJsonPath = Join-Path $SignalerRoot "package.json"
if (Test-Path $packageJsonPath) {
    $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
    $version = $packageJson.version
    Write-Host "  ✓ Installed version: $version" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Warning: Could not determine version" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Installation Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Old versions removed" -ForegroundColor Green
Write-Host "✓ Latest version installed" -ForegroundColor Green
Write-Host "✓ Git Bash wrapper created" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart your terminal (Git Bash, PowerShell, etc.)" -ForegroundColor White
Write-Host "  2. Test with: signaler --version" -ForegroundColor White
Write-Host "  3. Use it: signaler wizard" -ForegroundColor White
Write-Host ""
Write-Host "If 'signaler' is not found after restarting:" -ForegroundColor Yellow
Write-Host "  - In PowerShell: signaler.cmd wizard" -ForegroundColor White
Write-Host "  - In Git Bash: bash $WrapperPath wizard" -ForegroundColor White
Write-Host ""
