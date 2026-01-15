# Signaler Quick Installer - Radical Redesign
# Logs everything to a file so errors are ALWAYS visible

$ErrorActionPreference = "Stop"
$LogFile = "$env:TEMP\signaler-install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Write-Log {
    param($Message, $Color = "White")
    $Timestamp = Get-Date -Format "HH:mm:ss"
    $LogMessage = "[$Timestamp] $Message"
    Add-Content -Path $LogFile -Value $LogMessage
    Write-Host $Message -ForegroundColor $Color
}

function Write-LogError {
    param($Message)
    Write-Log "ERROR: $Message" "Red"
}

# Start logging
Write-Log "=== Signaler Installer Started ===" "Cyan"
Write-Log "Log file: $LogFile" "Gray"
Write-Log ""

try {
    # Check Node.js
    Write-Log "Checking Node.js..." "Yellow"
    try {
        $NodeVersion = node --version 2>&1
        $NodeMajor = [int]($NodeVersion -replace 'v(\d+)\..*', '$1')
        
        if ($NodeMajor -lt 16) {
            Write-LogError "Node.js 16+ required. You have $NodeVersion"
            Write-Log "Install from: https://nodejs.org/" "Yellow"
            throw "Incompatible Node.js version"
        }
        
        Write-Log "Node.js: $NodeVersion" "Green"
    } catch {
        Write-LogError "Node.js not found or not working"
        Write-Log "Install from: https://nodejs.org/" "Yellow"
        Write-Log "After installing, restart PowerShell and try again." "Yellow"
        throw "Node.js not available"
    }

    $InstallDir = "$env:LOCALAPPDATA\signaler"
    $TempZip = "$env:TEMP\signaler-$(Get-Random).zip"
    $ExtractDir = "$env:TEMP\signaler-extract-$(Get-Random)"

    Write-Log "Install directory: $InstallDir" "Gray"
    Write-Log ""

    # Create install directory
    if (!(Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
        Write-Log "Created install directory" "Green"
    }

    # Download
    Write-Log "Downloading from GitHub..." "Yellow"
    Invoke-WebRequest -Uri "https://github.com/Dendro-X0/signaler/archive/refs/heads/main.zip" -OutFile $TempZip -UseBasicParsing
    Write-Log "Downloaded: $((Get-Item $TempZip).Length / 1MB) MB" "Green"

    # Extract
    Write-Log "Extracting..." "Yellow"
    Expand-Archive -Path $TempZip -DestinationPath $ExtractDir -Force
    Write-Log "Extracted" "Green"

    # Copy files
    Write-Log "Installing files..." "Yellow"
    $SourceDir = "$ExtractDir\signaler-main"
    Copy-Item "$SourceDir\*" -Destination $InstallDir -Recurse -Force
    Write-Log "Files installed" "Green"

    # Build
    Write-Log "" 
    Write-Log "Building (1-2 minutes)..." "Yellow"
    Write-Log "Please wait..." "Gray"
    Write-Log ""
    
    Push-Location $InstallDir
    
    # npm install
    Write-Log "Running: npm install" "Gray"
    $npmInstallStart = Get-Date
    $npmInstallResult = npm install 2>&1 | Tee-Object -Variable npmInstallOutput
    $npmInstallDuration = ((Get-Date) - $npmInstallStart).TotalSeconds
    
    Add-Content -Path $LogFile -Value "`n--- npm install output ---"
    Add-Content -Path $LogFile -Value $npmInstallOutput
    Add-Content -Path $LogFile -Value "--- end npm install output ---`n"
    
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "npm install failed (exit code: $LASTEXITCODE, duration: $npmInstallDuration seconds)"
        Write-Log "Output logged to: $LogFile" "Yellow"
        throw "npm install failed"
    }
    Write-Log "npm install completed ($npmInstallDuration seconds)" "Green"
    
    # npm build
    Write-Log "Running: npm run build" "Gray"
    $npmBuildStart = Get-Date
    $npmBuildResult = npm run build 2>&1 | Tee-Object -Variable npmBuildOutput
    $npmBuildDuration = ((Get-Date) - $npmBuildStart).TotalSeconds
    
    Add-Content -Path $LogFile -Value "`n--- npm build output ---"
    Add-Content -Path $LogFile -Value $npmBuildOutput
    Add-Content -Path $LogFile -Value "--- end npm build output ---`n"
    
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "npm build failed (exit code: $LASTEXITCODE, duration: $npmBuildDuration seconds)"
        Write-Log "Output logged to: $LogFile" "Yellow"
        throw "npm build failed"
    }
    Write-Log "npm build completed ($npmBuildDuration seconds)" "Green"
    
    Pop-Location

    # Verify build
    if (!(Test-Path "$InstallDir\dist\bin.js")) {
        Write-LogError "Build completed but dist/bin.js not found"
        throw "Build verification failed"
    }
    Write-Log "Build verified" "Green"

    # Create launcher
    Write-Log "Creating launcher..." "Yellow"
    $LauncherScript = @"
@echo off
node "%~dp0dist\bin.js" %*
"@
    $LauncherScript | Out-File -FilePath "$InstallDir\signaler.cmd" -Encoding ASCII
    Write-Log "Launcher created" "Green"

    # Add to PATH
    Write-Log "Adding to PATH..." "Yellow"
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($UserPath -notlike "*$InstallDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
        $env:Path = "$env:Path;$InstallDir"
        Write-Log "Added to PATH" "Green"
    } else {
        Write-Log "Already in PATH" "Green"
    }

    # Test installation
    Write-Log ""
    Write-Log "Testing installation..." "Yellow"
    $TestResult = & "$InstallDir\signaler.cmd" --version 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log ""
        Write-Log "============================================" "Green"
        Write-Log "  INSTALLATION SUCCESSFUL!" "Green"
        Write-Log "============================================" "Green"
        Write-Log ""
        Write-Log "Version: $TestResult" "Cyan"
        Write-Log ""
        Write-Log "Next steps:" "Yellow"
        Write-Log "  1. Restart your terminal" "White"
        Write-Log "  2. Run: signaler wizard" "Cyan"
        Write-Log ""
        Write-Log "Log saved to: $LogFile" "Gray"
    } else {
        Write-Log ""
        Write-Log "WARNING: Installation completed but test failed" "Yellow"
        Write-Log "Test output: $TestResult" "Gray"
        Write-Log ""
        Write-Log "Try: $InstallDir\signaler.cmd wizard" "Cyan"
        Write-Log "Log saved to: $LogFile" "Gray"
    }

} catch {
    Write-Log ""
    Write-Log "============================================" "Red"
    Write-Log "  INSTALLATION FAILED" "Red"
    Write-Log "============================================" "Red"
    Write-Log ""
    Write-LogError $_.Exception.Message
    
    if ($_.Exception.InnerException) {
        Write-Log "Details: $($_.Exception.InnerException.Message)" "Yellow"
    }
    
    Write-Log ""
    Write-Log "IMPORTANT: Full error log saved to:" "Yellow"
    Write-Log "  $LogFile" "Cyan"
    Write-Log ""
    Write-Log "To view the log:" "Yellow"
    Write-Log "  notepad `"$LogFile`"" "Gray"
    Write-Log ""
    Write-Log "Troubleshooting:" "Yellow"
    Write-Log "  1. Check the log file above" "White"
    Write-Log "  2. Verify Node.js: node --version" "White"
    Write-Log "  3. Verify npm: npm --version" "White"
    Write-Log "  4. Run as Administrator" "White"
    Write-Log "  5. Check internet connection" "White"
    Write-Log ""
    
    # Add full error details to log
    Add-Content -Path $LogFile -Value "`n=== FULL ERROR DETAILS ==="
    Add-Content -Path $LogFile -Value "Message: $($_.Exception.Message)"
    Add-Content -Path $LogFile -Value "Type: $($_.Exception.GetType().FullName)"
    if ($_.Exception.InnerException) {
        Add-Content -Path $LogFile -Value "Inner Exception: $($_.Exception.InnerException.Message)"
    }
    Add-Content -Path $LogFile -Value "Stack Trace:"
    Add-Content -Path $LogFile -Value $_.ScriptStackTrace
    Add-Content -Path $LogFile -Value "=== END ERROR DETAILS ===`n"
    
    throw
} finally {
    # Cleanup
    if (Test-Path $TempZip) {
        Remove-Item $TempZip -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $ExtractDir) {
        Remove-Item $ExtractDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Write-Log "Cleanup completed" "Gray"
    Write-Log "Log file: $LogFile" "Gray"
}
