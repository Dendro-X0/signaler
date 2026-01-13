# Signaler CLI Installer for Windows
# Usage: iwr https://github.com/REPO/releases/latest/download/install.ps1 | iex

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Configuration
$DefaultRepo = "Dendro-X0/signaler"
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
