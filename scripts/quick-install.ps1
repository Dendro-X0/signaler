# Signaler Quick Installer - One command, no extraction, no PATH setup
# Downloads and runs Signaler immediately

$ErrorActionPreference = "Stop"

$InstallDir = "$env:LOCALAPPDATA\signaler"
$BinPath = "$InstallDir\signaler.exe"

Write-Host "Quick installing Signaler..." -ForegroundColor Cyan
Write-Host "Note: This installs the latest version from main branch" -ForegroundColor Yellow
Write-Host ""

# Create install directory
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Download repository as zip
$TempZip = "$env:TEMP\signaler-$(Get-Random).zip"
Write-Host "Downloading..." -ForegroundColor Yellow

try {
    Invoke-WebRequest -Uri "https://github.com/Dendro-X0/signaler/archive/refs/heads/main.zip" -OutFile $TempZip
    
    # Extract
    Write-Host "Extracting..." -ForegroundColor Yellow
    Expand-Archive -Path $TempZip -DestinationPath "$env:TEMP\signaler-extract" -Force
    
    # Copy files
    $ExtractedDir = "$env:TEMP\signaler-extract\signaler-main"
    Copy-Item "$ExtractedDir\*" -Destination $InstallDir -Recurse -Force
    
    # Install dependencies and build
    Write-Host "Building (this may take a minute)..." -ForegroundColor Yellow
    Set-Location $InstallDir
    
    # Use npm (more reliable on Windows)
    & npm install --silent --no-progress 2>&1 | Out-Null
    & npm run build --silent 2>&1 | Out-Null
    
    # Create launcher script
    $LauncherScript = @"
@echo off
node "%~dp0dist\bin.js" %*
"@
    $LauncherScript | Out-File -FilePath "$InstallDir\signaler.cmd" -Encoding ASCII
    
    # Add to PATH if not already there
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($UserPath -notlike "*$InstallDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
        $env:Path = "$env:Path;$InstallDir"
    }
    
    Write-Host ""
    Write-Host "✓ Signaler installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Location: $InstallDir" -ForegroundColor Gray
    Write-Host "Version: Latest from main branch" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Run: signaler wizard" -ForegroundColor Cyan
    Write-Host "Or:  signaler audit" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Note: Restart terminal if 'signaler' command not found" -ForegroundColor Yellow
    Write-Host "Note: This creates signaler.cmd for PowerShell/CMD" -ForegroundColor Yellow
    Write-Host "      For Bash/Git Bash, use the Unix installer or portable package" -ForegroundColor Yellow
    
} finally {
    # Cleanup
    Remove-Item $TempZip -ErrorAction SilentlyContinue
    Remove-Item "$env:TEMP\signaler-extract" -Recurse -Force -ErrorAction SilentlyContinue
}
