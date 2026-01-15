# Signaler Quick Installer
# One command installation for Windows
# Compatible with: iwr url | iex

# CRITICAL: When run via iex, we cannot use ReadKey() or interactive prompts
# The script must complete without requiring user input

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Signaler Installer ===" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
try {
    $NodeVersion = node --version 2>&1
    $NodeMajor = [int]($NodeVersion -replace 'v(\d+)\..*', '$1')
    
    if ($NodeMajor -lt 16) {
        Write-Host "ERROR: Node.js 16+ required. You have $NodeVersion" -ForegroundColor Red
        Write-Host "Install from: https://nodejs.org/" -ForegroundColor Yellow
        Write-Host ""
        throw "Incompatible Node.js version"
    }
    
    Write-Host "Node.js: $NodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js not found or not working" -ForegroundColor Red
    Write-Host "Install from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After installing Node.js, restart PowerShell and try again." -ForegroundColor Yellow
    Write-Host ""
    throw "Node.js not available"
}

$InstallDir = "$env:LOCALAPPDATA\signaler"
$TempZip = "$env:TEMP\signaler-$(Get-Random).zip"
$ExtractDir = "$env:TEMP\signaler-extract-$(Get-Random)"

try {
    # Create install directory
    Write-Host "Install location: $InstallDir" -ForegroundColor Gray
    if (!(Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    
    # Download
    Write-Host "Downloading..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/Dendro-X0/signaler/archive/refs/heads/main.zip" -OutFile $TempZip -UseBasicParsing
    Write-Host "Downloaded" -ForegroundColor Green
    
    # Extract
    Write-Host "Extracting..." -ForegroundColor Yellow
    Expand-Archive -Path $TempZip -DestinationPath $ExtractDir -Force
    Write-Host "Extracted" -ForegroundColor Green
    
    # Copy files
    Write-Host "Installing files..." -ForegroundColor Yellow
    $SourceDir = "$ExtractDir\signaler-main"
    Copy-Item "$SourceDir\*" -Destination $InstallDir -Recurse -Force
    Write-Host "Files installed" -ForegroundColor Green
    
    # Build
    Write-Host ""
    Write-Host "Building (this takes 1-2 minutes)..." -ForegroundColor Yellow
    Write-Host "Please wait..." -ForegroundColor Gray
    Write-Host ""
    
    Push-Location $InstallDir
    
    # Run npm install with output
    Write-Host "Running: npm install" -ForegroundColor Gray
    $npmInstallResult = npm install 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "npm install failed!" -ForegroundColor Red
        Write-Host "Output:" -ForegroundColor Yellow
        Write-Host $npmInstallResult
        Write-Host ""
        throw "npm install failed with exit code $LASTEXITCODE"
    }
    Write-Host "npm install completed" -ForegroundColor Green
    
    # Run npm build with output
    Write-Host "Running: npm run build" -ForegroundColor Gray
    $npmBuildResult = npm run build 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "npm build failed!" -ForegroundColor Red
        Write-Host "Output:" -ForegroundColor Yellow
        Write-Host $npmBuildResult
        Write-Host ""
        throw "npm build failed with exit code $LASTEXITCODE"
    }
    Write-Host "npm build completed" -ForegroundColor Green
    
    Pop-Location
    
    # Verify build
    if (!(Test-Path "$InstallDir\dist\bin.js")) {
        throw "Build completed but dist/bin.js not found"
    }
    
    # Create launcher
    Write-Host "Creating launcher..." -ForegroundColor Yellow
    $LauncherScript = @"
@echo off
node "%~dp0dist\bin.js" %*
"@
    $LauncherScript | Out-File -FilePath "$InstallDir\signaler.cmd" -Encoding ASCII
    Write-Host "Launcher created" -ForegroundColor Green
    
    # Add to PATH
    Write-Host "Adding to PATH..." -ForegroundColor Yellow
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($UserPath -notlike "*$InstallDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
        $env:Path = "$env:Path;$InstallDir"
        Write-Host "Added to PATH" -ForegroundColor Green
    } else {
        Write-Host "Already in PATH" -ForegroundColor Green
    }
    
    # Test installation
    Write-Host ""
    Write-Host "Testing installation..." -ForegroundColor Yellow
    $TestResult = & "$InstallDir\signaler.cmd" --version 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "  INSTALLATION SUCCESSFUL!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Version: $TestResult" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Restart your terminal (to refresh PATH)" -ForegroundColor White
        Write-Host "  2. Run: signaler wizard" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Or run directly: $InstallDir\signaler.cmd wizard" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "WARNING: Installation completed but test failed" -ForegroundColor Yellow
        Write-Host "Test output: $TestResult" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Try running: $InstallDir\signaler.cmd wizard" -ForegroundColor Cyan
        Write-Host ""
    }
    
} catch {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  INSTALLATION FAILED" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.InnerException) {
        Write-Host "Details: $($_.Exception.InnerException.Message)" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check internet connection" -ForegroundColor White
    Write-Host "  2. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "  3. Check Node.js: node --version" -ForegroundColor White
    Write-Host "  4. Check npm: npm --version" -ForegroundColor White
    Write-Host "  5. Try debug installer:" -ForegroundColor White
    Write-Host "     iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/debug-install.ps1 -OutFile install-debug.ps1" -ForegroundColor Gray
    Write-Host "     .\install-debug.ps1" -ForegroundColor Gray
    Write-Host ""
    
    throw
} finally {
    # Cleanup
    if (Test-Path $TempZip) {
        Remove-Item $TempZip -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $ExtractDir) {
        Remove-Item $ExtractDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
