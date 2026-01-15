# Simple installer - downloads pre-built executable
# No npm, no Node.js, no compilation needed

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Signaler Standalone Installer ===" -ForegroundColor Cyan
Write-Host ""

$InstallDir = "$env:LOCALAPPDATA\signaler"
$ExePath = "$InstallDir\signaler.exe"

# Get latest release
Write-Host "Finding latest release..." -ForegroundColor Yellow
$LatestRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/Dendro-X0/signaler/releases/latest"
$Version = $LatestRelease.tag_name
Write-Host "Latest version: $Version" -ForegroundColor Green

# Find Windows executable
$Asset = $LatestRelease.assets | Where-Object { $_.name -like "*win*.exe" } | Select-Object -First 1

if (!$Asset) {
    Write-Host "ERROR: No Windows executable found in release" -ForegroundColor Red
    exit 1
}

Write-Host "Downloading: $($Asset.name)" -ForegroundColor Yellow
Write-Host "Size: $([math]::Round($Asset.size / 1MB, 2)) MB" -ForegroundColor Gray

# Create directory
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Download
Invoke-WebRequest -Uri $Asset.browser_download_url -OutFile $ExePath -UseBasicParsing

Write-Host "Downloaded to: $ExePath" -ForegroundColor Green

# Add to PATH
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    $env:Path = "$env:Path;$InstallDir"
    Write-Host "Added to PATH" -ForegroundColor Green
}

# Test
Write-Host ""
Write-Host "Testing installation..." -ForegroundColor Yellow
& $ExePath --version

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  INSTALLATION SUCCESSFUL!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Restart your terminal, then run:" -ForegroundColor Yellow
Write-Host "  signaler wizard" -ForegroundColor Cyan
Write-Host ""
