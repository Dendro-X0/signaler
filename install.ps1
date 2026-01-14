# Signaler One-Line Installer for Windows
# Downloads pre-built standalone binary from GitHub Releases

$ErrorActionPreference = "Stop"

$REPO = "Dendro-X0/signaler"
$INSTALL_DIR = if ($env:SIGNALER_INSTALL_DIR) { $env:SIGNALER_INSTALL_DIR } else { "$env:LOCALAPPDATA\signaler" }
$PLATFORM = "windows-x64"
$BINARY_NAME = "signaler.exe"

Write-Host "Installing Signaler for $PLATFORM..." -ForegroundColor Cyan

# Get latest release URL
$DOWNLOAD_URL = "https://github.com/$REPO/releases/latest/download/signaler-$PLATFORM.exe"

# Create install directory
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null

# Download binary
Write-Host "Downloading from $DOWNLOAD_URL..." -ForegroundColor Yellow
$BINARY_PATH = Join-Path $INSTALL_DIR $BINARY_NAME

try {
    Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $BINARY_PATH -UseBasicParsing
} catch {
    Write-Host "Error: Failed to download binary" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ Signaler installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Location: $BINARY_PATH" -ForegroundColor Cyan
Write-Host ""

# Check if in PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$INSTALL_DIR*") {
    Write-Host "Adding to PATH..." -ForegroundColor Yellow
    try {
        [Environment]::SetEnvironmentVariable(
            "Path",
            "$currentPath;$INSTALL_DIR",
            "User"
        )
        Write-Host "✓ Added to PATH" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please restart your terminal and run: signaler --help" -ForegroundColor Cyan
    } catch {
        Write-Host "Could not add to PATH automatically." -ForegroundColor Yellow
        Write-Host "Add manually: $INSTALL_DIR" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Or run directly: $BINARY_PATH --help" -ForegroundColor Cyan
    }
} else {
    Write-Host "Run: signaler --help" -ForegroundColor Cyan
}
