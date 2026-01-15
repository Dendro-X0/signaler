# Signaler Bootstrap Installer
# Downloads the full installer and runs it locally so errors are visible

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Signaler Bootstrap Installer ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will download and run the installer locally" -ForegroundColor Gray
Write-Host "so you can see all output and errors." -ForegroundColor Gray
Write-Host ""

try {
    # Download the full installer
    $InstallerPath = "$env:TEMP\signaler-installer-$(Get-Date -Format 'yyyyMMdd-HHmmss').ps1"
    
    Write-Host "Downloading installer..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/quick-install.ps1" -OutFile $InstallerPath -UseBasicParsing
    Write-Host "Downloaded to: $InstallerPath" -ForegroundColor Green
    Write-Host ""
    
    # Run the installer
    Write-Host "Running installer..." -ForegroundColor Yellow
    Write-Host ""
    
    & $InstallerPath
    
    $ExitCode = $LASTEXITCODE
    
    Write-Host ""
    if ($ExitCode -eq 0) {
        Write-Host "Installer completed successfully" -ForegroundColor Green
    } else {
        Write-Host "Installer exited with code: $ExitCode" -ForegroundColor Yellow
    }
    
    # Keep installer file for review
    Write-Host ""
    Write-Host "Installer script saved to: $InstallerPath" -ForegroundColor Gray
    Write-Host "You can review it if needed" -ForegroundColor Gray
    
} catch {
    Write-Host ""
    Write-Host "Bootstrap failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try downloading manually:" -ForegroundColor Yellow
    Write-Host "  iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/quick-install.ps1 -OutFile install.ps1" -ForegroundColor Gray
    Write-Host "  .\install.ps1" -ForegroundColor Gray
    Write-Host ""
    throw
}
