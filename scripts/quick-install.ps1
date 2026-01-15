# Signaler Quick Installer
# One command installation for Windows

# Don't exit immediately on errors - we want to show them
$ErrorActionPreference = "Continue"

Write-Host "Installing Signaler..." -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
if (!(Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is required but not found" -ForegroundColor Red
    Write-Host "Install from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

$NodeVersion = node --version
$NodeMajor = [int]($NodeVersion -replace 'v(\d+)\..*', '$1')
if ($NodeMajor -lt 16) {
    Write-Host "ERROR: Node.js 16+ required. You have $NodeVersion" -ForegroundColor Red
    Write-Host "Please upgrade from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Node.js version: $NodeVersion ✓" -ForegroundColor Gray

$InstallDir = "$env:LOCALAPPDATA\signaler"

# Create install directory
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Download repository
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
    
    # Build
    Write-Host "Building (this may take a minute)..." -ForegroundColor Yellow
    Set-Location $InstallDir
    
    Write-Host "Running npm install..." -ForegroundColor Gray
    $npmInstallOutput = & npm install 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install output:" -ForegroundColor Red
        Write-Host $npmInstallOutput -ForegroundColor Red
        throw "npm install failed with exit code $LASTEXITCODE"
    }
    
    Write-Host "Running npm build..." -ForegroundColor Gray
    $npmBuildOutput = & npm run build 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm build output:" -ForegroundColor Red
        Write-Host $npmBuildOutput -ForegroundColor Red
        throw "npm build failed with exit code $LASTEXITCODE"
    }
    
    # Verify build output
    if (!(Test-Path "$InstallDir\dist\bin.js")) {
        throw "Build completed but dist/bin.js not found"
    }
    
    # Create launcher
    $LauncherScript = @"
@echo off
node "%~dp0dist\bin.js" %*
"@
    $LauncherScript | Out-File -FilePath "$InstallDir\signaler.cmd" -Encoding ASCII
    
    # Add to PATH
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($UserPath -notlike "*$InstallDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
        $env:Path = "$env:Path;$InstallDir"
    }
    
    # Verify installation
    Write-Host "Verifying installation..." -ForegroundColor Yellow
    $TestOutput = & "$InstallDir\signaler.cmd" --help 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "✓ INSTALLATION SUCCESSFUL!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Run: signaler wizard" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Note: Restart terminal if 'signaler' command not found" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Press any key to exit..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } else {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Red
        Write-Host "✗ INSTALLATION VERIFICATION FAILED" -ForegroundColor Red
        Write-Host "============================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "The CLI was installed but verification failed" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Verification output:" -ForegroundColor Yellow
        Write-Host $TestOutput
        Write-Host ""
        Write-Host "Try running manually: $InstallDir\signaler.cmd wizard" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Press any key to exit..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    
} catch {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "INSTALLATION FAILED" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Full error details:" -ForegroundColor Yellow
    Write-Host $_.Exception | Format-List -Force | Out-String
    Write-Host ""
    Write-Host "Stack trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  • Check your internet connection" -ForegroundColor Yellow
    Write-Host "  • Ensure you have enough disk space" -ForegroundColor Yellow
    Write-Host "  • Try running PowerShell as Administrator" -ForegroundColor Yellow
    Write-Host "  • Check if antivirus is blocking the installation" -ForegroundColor Yellow
    Write-Host "  • Check Node.js is properly installed: node --version" -ForegroundColor Yellow
    Write-Host "  • Check npm is working: npm --version" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
} finally {
    # Cleanup
    Remove-Item $TempZip -ErrorAction SilentlyContinue
    Remove-Item "$env:TEMP\signaler-extract" -Recurse -Force -ErrorAction SilentlyContinue
}
