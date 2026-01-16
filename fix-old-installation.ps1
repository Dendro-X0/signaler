#!/usr/bin/env pwsh
#Requires -RunAsAdministrator

Write-Host "=== Fix Old Signaler Installation ===" -ForegroundColor Cyan
Write-Host ""

$bunExe = "C:\Users\Administrator\AppData\Local\Programs\signaler"

# Check if it exists
if (Test-Path $bunExe) {
    Write-Host "Found old Bun-compiled installation:" -ForegroundColor Yellow
    Write-Host "  $bunExe" -ForegroundColor Red
    Write-Host ""
    
    # Confirm deletion
    $confirm = Read-Host "Delete this directory? (Y/N)"
    if ($confirm -eq "Y" -or $confirm -eq "y") {
        try {
            Remove-Item $bunExe -Recurse -Force -ErrorAction Stop
            Write-Host "✓ Deleted successfully" -ForegroundColor Green
        } catch {
            Write-Host "✗ Failed to delete: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host ""
            Write-Host "Try manually:" -ForegroundColor Yellow
            Write-Host "  1. Open File Explorer" -ForegroundColor White
            Write-Host "  2. Navigate to: C:\Users\Administrator\AppData\Local\Programs\" -ForegroundColor White
            Write-Host "  3. Delete the 'signaler' folder" -ForegroundColor White
            exit 1
        }
    } else {
        Write-Host "Aborted" -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host "✓ Old installation not found (already clean)" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Restart your terminal" -ForegroundColor White
Write-Host ""
Write-Host "2. Verify the fix:" -ForegroundColor White
Write-Host "   where.exe signaler" -ForegroundColor Gray
Write-Host "   (Should only show: C:\Users\Administrator\AppData\Local\signaler\bin\signaler.cmd)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test it:" -ForegroundColor White
Write-Host "   signaler --version" -ForegroundColor Gray
Write-Host "   (Should work without Bun errors)" -ForegroundColor Gray
Write-Host ""
