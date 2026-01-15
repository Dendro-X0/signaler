# Signaler Debug Installer
# Shows all output for troubleshooting

Write-Host "=== Signaler Debug Installer ===" -ForegroundColor Cyan
Write-Host ""

# Show environment
Write-Host "Environment Information:" -ForegroundColor Yellow
Write-Host "PowerShell Version: $($PSVersionTable.PSVersion)" -ForegroundColor Gray
Write-Host "OS: $([System.Environment]::OSVersion.VersionString)" -ForegroundColor Gray
Write-Host "User: $env:USERNAME" -ForegroundColor Gray
Write-Host "Install Dir: $env:LOCALAPPDATA\signaler" -ForegroundColor Gray
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $NodeVersion = node --version 2>&1
    Write-Host "Node.js version: $NodeVersion" -ForegroundColor Green
    
    $NpmVersion = npm --version 2>&1
    Write-Host "npm version: $NpmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host "Install from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host ""

$InstallDir = "$env:LOCALAPPDATA\signaler"

# Create install directory
Write-Host "Creating install directory..." -ForegroundColor Yellow
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
Write-Host "Install directory: $InstallDir" -ForegroundColor Gray
Write-Host ""

# Download
$TempZip = "$env:TEMP\signaler-$(Get-Random).zip"
Write-Host "Downloading from GitHub..." -ForegroundColor Yellow
Write-Host "URL: https://github.com/Dendro-X0/signaler/archive/refs/heads/main.zip" -ForegroundColor Gray

try {
    Invoke-WebRequest -Uri "https://github.com/Dendro-X0/signaler/archive/refs/heads/main.zip" -OutFile $TempZip -Verbose
    Write-Host "Downloaded to: $TempZip" -ForegroundColor Green
} catch {
    Write-Host "Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host ""

# Extract
Write-Host "Extracting..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $TempZip -DestinationPath "$env:TEMP\signaler-extract" -Force
    Write-Host "Extracted successfully" -ForegroundColor Green
} catch {
    Write-Host "Extract failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host ""

# Copy files
Write-Host "Copying files..." -ForegroundColor Yellow
$ExtractedDir = "$env:TEMP\signaler-extract\signaler-main"
Write-Host "From: $ExtractedDir" -ForegroundColor Gray
Write-Host "To: $InstallDir" -ForegroundColor Gray

try {
    Copy-Item "$ExtractedDir\*" -Destination $InstallDir -Recurse -Force
    Write-Host "Files copied successfully" -ForegroundColor Green
} catch {
    Write-Host "Copy failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host ""

# Build
Write-Host "Building (this will take a minute)..." -ForegroundColor Yellow
Set-Location $InstallDir

Write-Host "Running: npm install" -ForegroundColor Gray
$npmInstallOutput = & npm install 2>&1
Write-Host $npmInstallOutput
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "npm install completed" -ForegroundColor Green
Write-Host ""

Write-Host "Running: npm run build" -ForegroundColor Gray
$npmBuildOutput = & npm run build 2>&1
Write-Host $npmBuildOutput
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm build failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "npm build completed" -ForegroundColor Green
Write-Host ""

# Verify build
Write-Host "Verifying build output..." -ForegroundColor Yellow
if (Test-Path "$InstallDir\dist\bin.js") {
    Write-Host "✓ dist/bin.js exists" -ForegroundColor Green
} else {
    Write-Host "✗ dist/bin.js NOT FOUND!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host ""

# Create launcher
Write-Host "Creating launcher..." -ForegroundColor Yellow
$LauncherScript = @"
@echo off
node "%~dp0dist\bin.js" %*
"@
$LauncherScript | Out-File -FilePath "$InstallDir\signaler.cmd" -Encoding ASCII
Write-Host "Launcher created: $InstallDir\signaler.cmd" -ForegroundColor Green
Write-Host ""

# Test CLI
Write-Host "Testing CLI..." -ForegroundColor Yellow
Write-Host "Running: $InstallDir\signaler.cmd --help" -ForegroundColor Gray
$TestOutput = & "$InstallDir\signaler.cmd" --help 2>&1
Write-Host $TestOutput
Write-Host ""
Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Gray
Write-Host ""

if ($LASTEXITCODE -eq 0) {
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "✓ INSTALLATION SUCCESSFUL!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
} else {
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "✗ CLI TEST FAILED" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Cleanup
Remove-Item $TempZip -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\signaler-extract" -Recurse -Force -ErrorAction SilentlyContinue
