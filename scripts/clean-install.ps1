#!/usr/bin/env pwsh
# Complete clean installation script for Signaler CLI
# This removes old versions and reinstalls using the portable release installer.

$ErrorActionPreference = "Stop"

Write-Host "=== Signaler CLI - Clean Installation ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Removing old installations..." -ForegroundColor Yellow

try {
    npm uninstall -g @signaler/cli 2>$null
    npm uninstall -g apex-auditor 2>$null
} catch {
}

Remove-Item "$env:LOCALAPPDATA\signaler" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:LOCALAPPDATA\Programs\signaler" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "  - Old installations removed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Installing latest portable release..." -ForegroundColor Yellow
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
Write-Host ""

$binDir = "$env:LOCALAPPDATA\signaler\bin"
$wrapperPath = Join-Path $binDir "signaler"
if (-not (Test-Path $wrapperPath)) {
    throw "Expected launcher not found at $wrapperPath"
}

Write-Host "Step 3: Verifying installation..." -ForegroundColor Yellow
$signalerCmd = Get-Command signaler -ErrorAction SilentlyContinue
if ($signalerCmd) {
    Write-Host "  - Command 'signaler' is available" -ForegroundColor Green
} else {
    Write-Host "  - Warning: 'signaler' command not found in PATH" -ForegroundColor Yellow
    Write-Host "    You may need to restart your terminal." -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Installation Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart your terminal if it was already open." -ForegroundColor White
Write-Host "  2. Test with: signaler --version" -ForegroundColor White
Write-Host "  3. Update later with: signaler upgrade" -ForegroundColor White
Write-Host "  4. Remove later with: signaler uninstall --global" -ForegroundColor White
