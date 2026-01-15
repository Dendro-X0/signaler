# Build standalone executables for distribution
# No npm registry needed - just download and run

$ErrorActionPreference = "Stop"

Write-Host "Building Signaler standalone executables..." -ForegroundColor Cyan
Write-Host ""

# Install pkg if needed
Write-Host "Installing pkg..." -ForegroundColor Yellow
npm install -g pkg

# Build TypeScript
Write-Host "Building TypeScript..." -ForegroundColor Yellow
pnpm run build

# Package for all platforms
Write-Host "Creating executables..." -ForegroundColor Yellow
pkg . --compress GZip

Write-Host ""
Write-Host "Done! Executables created in release-assets/" -ForegroundColor Green
Write-Host ""
Write-Host "Files created:" -ForegroundColor Yellow
Get-ChildItem release-assets -Filter "signaler*" | ForEach-Object {
    Write-Host "  $($_.Name) - $([math]::Round($_.Length / 1MB, 2)) MB" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Users can download and run directly - no Node.js needed!" -ForegroundColor Green
