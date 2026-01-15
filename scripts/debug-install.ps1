# Signaler Debug Installer
# Shows all output for troubleshooting
# Save this file and run it directly (not via iex)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Signaler Debug Installer ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This installer shows detailed output for troubleshooting." -ForegroundColor Gray
Write-Host ""

# Show environment
Write-Host "Environment Information:" -ForegroundColor Yellow
Write-Host "  PowerShell: $($PSVersionTable.PSVersion)" -ForegroundColor Gray
Write-Host "  OS: $([System.Environment]::OSVersion.VersionString)" -ForegroundColor Gray
Write-Host "  User: $env:USERNAME" -ForegroundColor Gray
Write-Host "  Install Dir: $env:LOCALAPPDATA\signaler" -ForegroundColor Gray
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $NodeVersion = node --version 2>&1
    Write-Host "  Node.js: $NodeVersion" -ForegroundColor Green
    
    $NpmVersion = npm --version 2>&1
    Write-Host "  npm: $NpmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Then restart PowerShell and try again." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

$InstallDir = "$env:LOCALAPPDATA\signaler"
$TempZip = "$env:TEMP\signaler-$(Get-Random).zip"
$ExtractDir = "$env:TEMP\signaler-extract-$(Get-Random)"

try {
    # Create install directory
    Write-Host "Step 1: Creating install directory..." -ForegroundColor Yellow
    if (!(Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    Write-Host "  Created: $InstallDir" -ForegroundColor Green
    Write-Host ""

    # Download
    Write-Host "Step 2: Downloading from GitHub..." -ForegroundColor Yellow
    Write-Host "  URL: https://github.com/Dendro-X0/signaler/archive/refs/heads/main.zip" -ForegroundColor Gray
    Invoke-WebRequest -Uri "https://github.com/Dendro-X0/signaler/archive/refs/heads/main.zip" -OutFile $TempZip -UseBasicParsing
    Write-Host "  Downloaded: $TempZip" -ForegroundColor Green
    Write-Host "  Size: $((Get-Item $TempZip).Length / 1MB) MB" -ForegroundColor Gray
    Write-Host ""

    # Extract
    Write-Host "Step 3: Extracting..." -ForegroundColor Yellow
    Expand-Archive -Path $TempZip -DestinationPath $ExtractDir -Force
    Write-Host "  Extracted to: $ExtractDir" -ForegroundColor Green
    Write-Host ""

    # Copy files
    Write-Host "Step 4: Copying files..." -ForegroundColor Yellow
    $SourceDir = "$ExtractDir\signaler-main"
    Write-Host "  From: $SourceDir" -ForegroundColor Gray
    Write-Host "  To: $InstallDir" -ForegroundColor Gray
    Copy-Item "$SourceDir\*" -Destination $InstallDir -Recurse -Force
    Write-Host "  Files copied" -ForegroundColor Green
    Write-Host ""

    # Build
    Write-Host "Step 5: Building (this takes 1-2 minutes)..." -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location $InstallDir
    
    Write-Host "  Running: npm install" -ForegroundColor Gray
    Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
    $npmInstallOutput = npm install 2>&1
    Write-Host $npmInstallOutput
    Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  npm install FAILED with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        throw "npm install failed"
    }
    Write-Host "  npm install completed successfully" -ForegroundColor Green
    Write-Host ""

    Write-Host "  Running: npm run build" -ForegroundColor Gray
    Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
    $npmBuildOutput = npm run build 2>&1
    Write-Host $npmBuildOutput
    Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  npm build FAILED with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        throw "npm build failed"
    }
    Write-Host "  npm build completed successfully" -ForegroundColor Green
    Write-Host ""
    
    Pop-Location

    # Verify build
    Write-Host "Step 6: Verifying build..." -ForegroundColor Yellow
    if (Test-Path "$InstallDir\dist\bin.js") {
        Write-Host "  ✓ dist/bin.js exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ dist/bin.js NOT FOUND!" -ForegroundColor Red
        throw "Build verification failed"
    }
    Write-Host ""

    # Create launcher
    Write-Host "Step 7: Creating launcher..." -ForegroundColor Yellow
    $LauncherScript = @"
@echo off
node "%~dp0dist\bin.js" %*
"@
    $LauncherScript | Out-File -FilePath "$InstallDir\signaler.cmd" -Encoding ASCII
    Write-Host "  Created: $InstallDir\signaler.cmd" -ForegroundColor Green
    Write-Host ""

    # Add to PATH
    Write-Host "Step 8: Adding to PATH..." -ForegroundColor Yellow
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($UserPath -notlike "*$InstallDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
        Write-Host "  Added to PATH" -ForegroundColor Green
    } else {
        Write-Host "  Already in PATH" -ForegroundColor Green
    }
    Write-Host ""

    # Test CLI
    Write-Host "Step 9: Testing CLI..." -ForegroundColor Yellow
    Write-Host "  Running: signaler --version" -ForegroundColor Gray
    $TestOutput = & "$InstallDir\signaler.cmd" --version 2>&1
    Write-Host "  Output: $TestOutput" -ForegroundColor Gray
    Write-Host "  Exit code: $LASTEXITCODE" -ForegroundColor Gray
    Write-Host ""

    if ($LASTEXITCODE -eq 0) {
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "  INSTALLATION SUCCESSFUL!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Version: $TestOutput" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Restart your terminal" -ForegroundColor White
        Write-Host "  2. Run: signaler wizard" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "============================================" -ForegroundColor Yellow
        Write-Host "  INSTALLATION COMPLETED WITH WARNINGS" -ForegroundColor Yellow
        Write-Host "============================================" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "The CLI was installed but the test failed." -ForegroundColor Yellow
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
        Write-Host "Inner Exception: $($_.Exception.InnerException.Message)" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-Host "Stack Trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check internet connection" -ForegroundColor White
    Write-Host "  2. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "  3. Verify Node.js: node --version" -ForegroundColor White
    Write-Host "  4. Verify npm: npm --version" -ForegroundColor White
    Write-Host "  5. Check disk space in $env:LOCALAPPDATA" -ForegroundColor White
    Write-Host "  6. Check antivirus isn't blocking" -ForegroundColor White
    Write-Host ""
    
} finally {
    # Cleanup
    Write-Host "Cleaning up temporary files..." -ForegroundColor Gray
    if (Test-Path $TempZip) {
        Remove-Item $TempZip -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $ExtractDir) {
        Remove-Item $ExtractDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host ""
}

Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host
