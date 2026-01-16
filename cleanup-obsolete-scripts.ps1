#!/usr/bin/env pwsh
# Cleanup obsolete diagnostic and fix scripts
# These scripts were used to diagnose and fix the Bun executable issue
# Now that the issue is resolved, they are no longer needed

Write-Host "=== Cleanup Obsolete Scripts ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "The Bun runtime error has been resolved." -ForegroundColor Green
Write-Host "The following diagnostic/fix scripts are no longer needed:" -ForegroundColor Yellow
Write-Host ""

$scriptsToRemove = @(
    "diagnose-real-issue.ps1",
    "fix-old-installation.ps1",
    "verify-and-fix.ps1"
)

foreach ($script in $scriptsToRemove) {
    if (Test-Path $script) {
        Write-Host "  - $script" -ForegroundColor Gray
    }
}

Write-Host ""
$confirm = Read-Host "Delete these scripts? (Y/N)"

if ($confirm -eq "Y" -or $confirm -eq "y") {
    $deleted = 0
    foreach ($script in $scriptsToRemove) {
        if (Test-Path $script) {
            try {
                Remove-Item $script -Force
                Write-Host "  ✓ Deleted $script" -ForegroundColor Green
                $deleted++
            } catch {
                Write-Host "  ✗ Failed to delete $script" -ForegroundColor Red
            }
        }
    }
    
    Write-Host ""
    Write-Host "✓ Cleanup complete ($deleted files removed)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Keeping:" -ForegroundColor Yellow
    Write-Host "  - verify-installation.ps1 (for future verification)" -ForegroundColor Gray
    Write-Host "  - run.ps1 / run.sh (for direct execution)" -ForegroundColor Gray
    Write-Host "  - RESOLUTION-SUMMARY.md (documentation)" -ForegroundColor Gray
} else {
    Write-Host "Aborted" -ForegroundColor Yellow
}

Write-Host ""
