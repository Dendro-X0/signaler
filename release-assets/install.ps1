# Signaler CLI Installer for Windows
# Usage: Run from extracted portable zip: .\release-assets\install.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Configuration
$DefaultRepo = "Dendro-X0/signaler"
$Version = "latest"

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

# For portable zip installation, we're already in the extracted directory
$PortableRoot = $PSScriptRoot | Split-Path -Parent
if (!(Test-Path (Join-Path $PortableRoot "dist\bin.js"))) {
    Write-Error "This script must be run from the extracted portable zip directory."
    Write-Host "Expected to find: dist\bin.js in $PortableRoot"
    exit 1
}

try {
    # Install (remove existing and copy new)
    Write-Host "Installing from: $PortableRoot"
    if (Test-Path $InstallDir) { 
        Remove-Item -Recurse -Force $InstallDir 
    }
    
    # Copy all files from portable root to install directory
    Copy-Item -Path $PortableRoot -Destination $InstallDir -Recurse -Force
    
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
}

Write-Host ""
Write-Host "Installation completed! Restart your terminal to use 'signaler' command." -ForegroundColor Green 
