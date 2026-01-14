# Signaler Standalone Installer for Windows
# Downloads and installs Signaler without npm

param(
    [string]$InstallDir = "$env:LOCALAPPDATA\signaler",
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

Write-Host "Installing Signaler..." -ForegroundColor Green
Write-Host "Install directory: $InstallDir"

# Check prerequisites
try {
    $null = Get-Command node -ErrorAction Stop
} catch {
    Write-Host "Error: Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    Write-Host "Visit: https://nodejs.org/"
    exit 1
}

try {
    $null = Get-Command git -ErrorAction Stop
} catch {
    Write-Host "Error: git is not installed. Please install git first." -ForegroundColor Red
    exit 1
}

# Create temp directory
$TempDir = Join-Path $env:TEMP "signaler-install-$(Get-Random)"
New-Item -ItemType Directory -Path $TempDir | Out-Null

try {
    Write-Host "Downloading Signaler..."
    Set-Location $TempDir
    git clone --depth 1 --branch $Branch https://github.com/Dendro-X0/signaler.git signaler
    Set-Location signaler

    # Check if pnpm is available
    $PkgMgr = "npm"
    try {
        $null = Get-Command pnpm -ErrorAction Stop
        $PkgMgr = "pnpm"
    } catch {
        Write-Host "pnpm not found, using npm (slower)" -ForegroundColor Yellow
    }

    Write-Host "Installing dependencies..."
    & $PkgMgr install --prod

    Write-Host "Building..."
    & $PkgMgr run build

    Write-Host "Building Rust launcher..."
    try {
        $null = Get-Command cargo -ErrorAction Stop
        Set-Location launcher
        cargo build --release
        Set-Location ..
    } catch {
        Write-Host "Warning: Rust/cargo not found. Skipping Rust launcher build." -ForegroundColor Yellow
        Write-Host "You can still use: node dist/bin.js"
    }

    # Create installation directory
    if (Test-Path $InstallDir) {
        Remove-Item -Recurse -Force $InstallDir
    }
    New-Item -ItemType Directory -Path $InstallDir | Out-Null

    # Copy files
    Write-Host "Installing to $InstallDir..."
    Copy-Item -Recurse dist "$InstallDir\"
    Copy-Item -Recurse node_modules "$InstallDir\"
    Copy-Item package.json "$InstallDir\"

    # Copy Rust binary if it exists
    $RustBinary = "launcher\target\release\signaler.exe"
    if (Test-Path $RustBinary) {
        Copy-Item $RustBinary "$InstallDir\"
    }

    # Create engine manifest
    $Manifest = @"
{
  "schemaVersion": 1,
  "engineVersion": "1.0.6",
  "minNode": "18.0.0",
  "entry": "dist/bin.js",
  "defaultOutputDirName": ".signaler"
}
"@
    $Manifest | Out-File -FilePath "$InstallDir\engine.manifest.json" -Encoding UTF8

    # Create wrapper batch file
    $WrapperBatch = @"
@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%signaler.exe" (
    "%SCRIPT_DIR%signaler.exe" engine run %*
) else (
    node "%SCRIPT_DIR%dist\bin.js" %*
)
"@
    $WrapperBatch | Out-File -FilePath "$InstallDir\signaler-cli.cmd" -Encoding ASCII

    # Add to PATH
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($UserPath -notlike "*$InstallDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
        Write-Host "Added $InstallDir to PATH" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "✓ Signaler installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Location: $InstallDir"
    Write-Host ""
    Write-Host "To use Signaler:"
    if (Test-Path "$InstallDir\signaler.exe") {
        Write-Host "  $InstallDir\signaler.exe doctor"
        Write-Host "  $InstallDir\signaler.exe engine run wizard"
        Write-Host "  $InstallDir\signaler.exe engine run audit"
    } else {
        Write-Host "  node $InstallDir\dist\bin.js --help"
        Write-Host "  node $InstallDir\dist\bin.js wizard"
    }
    Write-Host ""
    Write-Host "Or from anywhere (after restarting terminal):"
    Write-Host "  signaler-cli wizard"
    Write-Host "  signaler-cli audit"
    Write-Host ""
    Write-Host "Restart your terminal for PATH changes to take effect."

} finally {
    # Cleanup
    Set-Location $env:TEMP
    Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
}
