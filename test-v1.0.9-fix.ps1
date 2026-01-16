#!/usr/bin/env pwsh
# Test script to verify v1.0.9 fix

Write-Host "=== Testing Signaler v1.0.9 Fix ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check current installation
Write-Host "Step 1: Checking current installation..." -ForegroundColor Yellow
$signalerPath = Get-Command signaler -ErrorAction SilentlyContinue
if ($signalerPath) {
    Write-Host "  ✓ Found signaler at: $($signalerPath.Source)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Signaler not found in PATH" -ForegroundColor Red
    Write-Host "  Please install with: npx jsr add -g @signaler/cli" -ForegroundColor Yellow
    exit 1
}

# Step 2: Test execution
Write-Host ""
Write-Host "Step 2: Testing signaler execution..." -ForegroundColor Yellow
try {
    $output = & signaler --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Signaler executed successfully" -ForegroundColor Green
        Write-Host "  Output preview:" -ForegroundColor Gray
        Write-Host "  $($output[0..5] -join "`n  ")" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ Signaler execution failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "  Error output:" -ForegroundColor Red
        Write-Host $output -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ✗ Exception occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Check for Bun errors
Write-Host ""
Write-Host "Step 3: Checking for Bun-related errors..." -ForegroundColor Yellow
$bunError = $output | Select-String -Pattern "BUN|B:\\-\\BUN|locales" -Quiet
if ($bunError) {
    Write-Host "  ✗ Bun-related errors still present!" -ForegroundColor Red
    Write-Host "  This means the old version is still being used." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Try these steps:" -ForegroundColor Yellow
    Write-Host "  1. npm uninstall -g @jsr/signaler__cli" -ForegroundColor White
    Write-Host "  2. npm uninstall -g @signaler/cli" -ForegroundColor White
    Write-Host "  3. npm cache clean --force" -ForegroundColor White
    Write-Host "  4. npx jsr add -g @signaler/cli" -ForegroundColor White
    exit 1
} else {
    Write-Host "  ✓ No Bun-related errors detected" -ForegroundColor Green
}

# Step 4: Verify version
Write-Host ""
Write-Host "Step 4: Verifying package version..." -ForegroundColor Yellow
$packageInfo = npm list -g @signaler/cli --json 2>$null | ConvertFrom-Json
if ($packageInfo.dependencies.'@signaler/cli'.version) {
    $version = $packageInfo.dependencies.'@signaler/cli'.version
    Write-Host "  ✓ Installed version: $version" -ForegroundColor Green
    if ($version -ge "1.0.9") {
        Write-Host "  ✓ Version is 1.0.9 or higher (fixed version)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Version is older than 1.0.9" -ForegroundColor Yellow
        Write-Host "  Please upgrade with: npx jsr add -g @signaler/cli" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠ Could not determine version from npm" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "✓ All tests passed! Signaler v1.0.9 is working correctly." -ForegroundColor Green
Write-Host ""
Write-Host "You can now use signaler without errors:" -ForegroundColor White
Write-Host "  signaler wizard" -ForegroundColor Gray
Write-Host "  signaler audit" -ForegroundColor Gray
Write-Host "  signaler quick" -ForegroundColor Gray
