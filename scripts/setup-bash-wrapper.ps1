#!/usr/bin/env pwsh
# Setup script to create Signaler CLI shims for PowerShell/CMD/Git Bash.
# Works with JSR installs by proxying to: npx jsr run @signaler/cli

$ErrorActionPreference = "Stop"

Write-Host "Setting up Signaler CLI shims..." -ForegroundColor Cyan

$binDir = Join-Path $env:APPDATA "npm"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

$bashShimPath = Join-Path $binDir "signaler"
$cmdShimPath = Join-Path $binDir "signaler.cmd"

$bashShim = @'
#!/usr/bin/env bash
exec npx jsr run @signaler/cli "$@"
'@

$cmdShim = @'
@echo off
npx jsr run @signaler/cli %*
'@

Set-Content -Path $bashShimPath -Value $bashShim -NoNewline
Set-Content -Path $cmdShimPath -Value $cmdShim -NoNewline

Write-Host "Created shims:" -ForegroundColor Green
Write-Host "  $bashShimPath"
Write-Host "  $cmdShimPath"
Write-Host ""
Write-Host "Try: signaler --version" -ForegroundColor Cyan
Write-Host "If needed, ensure this directory is in PATH: $binDir" -ForegroundColor Yellow
