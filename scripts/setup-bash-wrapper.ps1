#!/usr/bin/env pwsh
# Setup script to create Signaler CLI shims for PowerShell/CMD/Git Bash.
# Works with JSR installs by proxying to: npx jsr run @signaler/cli

$ErrorActionPreference = "Stop"

Write-Host "Setting up Signaler CLI shims..." -ForegroundColor Cyan

$binDir = Join-Path $env:APPDATA "npm"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

$bashShimPath = Join-Path $binDir "signaler"
$bashAliasPath = Join-Path $binDir "signalar"
$cmdShimPath = Join-Path $binDir "signaler.cmd"
$cmdAliasPath = Join-Path $binDir "signalar.cmd"

$bashShim = @'
#!/usr/bin/env bash
exec npx jsr run @signaler/cli "$@"
'@

$cmdShim = @'
@echo off
npx jsr run @signaler/cli %*
'@

Set-Content -Path $bashShimPath -Value $bashShim -NoNewline
Set-Content -Path $bashAliasPath -Value $bashShim -NoNewline
Set-Content -Path $cmdShimPath -Value $cmdShim -NoNewline
Set-Content -Path $cmdAliasPath -Value $cmdShim -NoNewline

Write-Host "Created shims:" -ForegroundColor Green
Write-Host "  $bashShimPath"
Write-Host "  $bashAliasPath"
Write-Host "  $cmdShimPath"
Write-Host "  $cmdAliasPath"
Write-Host ""
Write-Host "Try: signaler --version (or: signalar --version)" -ForegroundColor Cyan
Write-Host "If needed, ensure this directory is in PATH: $binDir" -ForegroundColor Yellow
