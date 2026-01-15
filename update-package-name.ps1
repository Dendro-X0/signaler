# Update package name from @signaler/signaler to @signaler/cli

Write-Host "Updating package name in all documentation files..." -ForegroundColor Yellow

$files = @(
    "FIX-BUN-ERROR.md",
    "COMPLETE-CLEANUP-GUIDE.md", 
    "INSTALLATION-OPTIONS.md",
    "JSR-PUBLISH-NOW.md",
    "PUBLISH-JSR.md",
    "RUNTIME-REQUIREMENTS.md",
    "JSR-QUICKSTART.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  Updating $file..." -ForegroundColor Gray
        $content = Get-Content $file -Raw
        $content = $content -replace '@signaler/signaler', '@signaler/cli'
        $content = $content -replace 'https://jsr\.io/@signaler/signaler', 'https://jsr.io/@signaler/cli'
        $content = $content -replace 'jsr:@signaler/signaler', 'jsr:@signaler/cli'
        Set-Content $file $content -NoNewline
    }
}

Write-Host "✓ Package name updated in all files" -ForegroundColor Green
Write-Host ""
Write-Host "New package name: @signaler/cli" -ForegroundColor Cyan
Write-Host "Installation: npm install -g jsr:@signaler/cli" -ForegroundColor Cyan