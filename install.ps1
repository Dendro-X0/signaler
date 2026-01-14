# Signaler Binary Installer for Windows
# Downloads pre-built standalone executable from GitHub Releases
# No Node.js, no npm, no dependencies required!

param(
    [string]$InstallDir = "$env:LOCALAPPDATA\Programs\signaler"
)

$ErrorActionPreference = "Stop"

$Repo = "Dendro-X0/signaler"
$BinaryName = "signaler.exe"
$Platform = "windows-x64"

Write-Host "Installing Signaler..." -ForegroundColor Green
Write-Host "Install directory: $InstallDir"
Write-Host "Platform: $Platform"

# Get latest release URL
$DownloadUrl = "https://github.com/$Repo/releases/latest/download/signaler-$Platform.exe"

Write-Host "Downloading from: $DownloadUrl"

# Create install directory
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Download binary
$BinaryPath = Join-Path $InstallDir $BinaryName
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $BinaryPath -UseBasicParsing
} catch {
    Write-Host "Error downloading binary: $_" -ForegroundColor Red
    Write-Host "Please download manually from: https://github.com/$Repo/releases" -ForegroundColor Yellow
    exit 1
}

# Add to PATH
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    try {
        [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
        Write-Host "Added $InstallDir to PATH" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Could not add to PATH automatically." -ForegroundColor Yellow
        Write-Host "Please add manually: $InstallDir" -ForegroundColor Yellow
    }
}

# Get file size
$FileSize = (Get-Item $BinaryPath).Length
$FileSizeMB = [math]::Round($FileSize / 1MB, 1)

Write-Host ""
Write-Host "✓ Signaler installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Location: $BinaryPath"
Write-Host "Size: $FileSizeMB MB"
Write-Host ""
Write-Host "This is a standalone executable with:" -ForegroundColor Cyan
Write-Host "  ✓ No Node.js required"
Write-Host "  ✓ No npm required"
Write-Host "  ✓ No dependencies"
Write-Host ""
Write-Host "To use Signaler:"
Write-Host "  $BinaryPath wizard" -ForegroundColor Yellow
Write-Host "  $BinaryPath audit" -ForegroundColor Yellow
Write-Host ""
Write-Host "Restart your terminal, then you can use:" -ForegroundColor Green
Write-Host "  signaler wizard" -ForegroundColor Yellow
Write-Host "  signaler audit" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: You may need to restart your IDE/terminal for PATH changes to take effect." -ForegroundColor Cyan
