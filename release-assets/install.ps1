#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

$Repo = if ($env:SIGNALER_REPO) { $env:SIGNALER_REPO } else { "Dendro-X0/signaler" }
$Version = if ($env:SIGNALER_VERSION) { $env:SIGNALER_VERSION } else { "latest" }
$LocalAppData = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { Join-Path $HOME "AppData\\Local" }
$BaseDir = Join-Path $LocalAppData "signaler"
$InstallDir = Join-Path $BaseDir "current"
$BinDir = Join-Path $BaseDir "bin"
$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("signaler-install-" + [guid]::NewGuid().ToString("N"))
$ZipPath = Join-Path ([System.IO.Path]::GetTempPath()) ("signaler-portable-" + [guid]::NewGuid().ToString("N") + ".zip")

function Install-RuntimeDependencies {
  param(
    [string]$InstallDir
  )

  Write-Host "Installing runtime dependencies..." -ForegroundColor Yellow
  Push-Location $InstallDir
  try {
    & npm install --omit=dev --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

function Get-ReleaseApiUrl {
  param(
    [string]$Repo,
    [string]$Version
  )

  if ($Version -eq "latest") {
    return "https://api.github.com/repos/$Repo/releases/latest"
  }

  return "https://api.github.com/repos/$Repo/releases/tags/$Version"
}

function Get-PortableAssetUrl {
  param(
    [string]$Repo,
    [string]$Version
  )

  $apiUrl = Get-ReleaseApiUrl -Repo $Repo -Version $Version
  $headers = @{ "User-Agent" = "signaler-install-script" }
  $release = Invoke-RestMethod -Headers $headers -Uri $apiUrl
  $asset = $release.assets | Where-Object { $_.name -like "*-portable.zip" } | Select-Object -First 1
  if (-not $asset) {
    throw "No *-portable.zip asset found for $Repo ($Version)."
  }

  return @{
    tag = $release.tag_name
    url = $asset.browser_download_url
  }
}

function Write-Launcher {
  param(
    [string]$BinDir,
    [string]$InstallDir
  )

  New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
  $cmdPath = Join-Path $BinDir "signaler.cmd"
  $cmdAliasPath = Join-Path $BinDir "signalar.cmd"
  $bashPath = Join-Path $BinDir "signaler"
  $bashAliasPath = Join-Path $BinDir "signalar"
  $cmdContent = "@echo off`r`nsetlocal`r`nset `"ROOT=$InstallDir`"`r`nnode `"%ROOT%\dist\bin.js`" %*`r`n"
  $bashContent = "#!/usr/bin/env bash`nROOT_DIR=""$InstallDir""`nexec node ""$ROOT_DIR/dist/bin.js"" ""`$@""`n"
  Set-Content -Path $cmdPath -Value $cmdContent -Encoding Ascii -NoNewline
  Set-Content -Path $cmdAliasPath -Value $cmdContent -Encoding Ascii -NoNewline
  Set-Content -Path $bashPath -Value $bashContent -Encoding Utf8 -NoNewline
  Set-Content -Path $bashAliasPath -Value $bashContent -Encoding Utf8 -NoNewline
}

Write-Host "Installing Signaler..." -ForegroundColor Cyan
Write-Host "Repo: $Repo" -ForegroundColor DarkGray
Write-Host "Version: $Version" -ForegroundColor DarkGray

$asset = Get-PortableAssetUrl -Repo $Repo -Version $Version
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null

Invoke-WebRequest -Headers @{ "User-Agent" = "signaler-install-script" } -Uri $asset.url -OutFile $ZipPath
Expand-Archive -LiteralPath $ZipPath -DestinationPath $TempRoot -Force

$root = Get-ChildItem -Path $TempRoot | Select-Object -First 1
if (-not $root) {
  throw "Portable zip did not contain an extractable root directory."
}

if (Test-Path $InstallDir) {
  Remove-Item $InstallDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path (Split-Path $InstallDir -Parent) | Out-Null
Move-Item -LiteralPath $root.FullName -Destination $InstallDir
Install-RuntimeDependencies -InstallDir $InstallDir
Write-Launcher -BinDir $BinDir -InstallDir $InstallDir

Remove-Item $TempRoot -Recurse -Force
Remove-Item $ZipPath -Force

Write-Host ""
Write-Host "Installed $($asset.tag) to $InstallDir" -ForegroundColor Green
Write-Host "Launcher directory: $BinDir" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Add '$BinDir' to PATH if needed." -ForegroundColor White
Write-Host "  2. Restart your terminal if it was already open." -ForegroundColor White
Write-Host "  3. Run: signaler --version  (or: signalar --version)" -ForegroundColor White
Write-Host "  4. Update later with: signaler upgrade" -ForegroundColor White
Write-Host "  5. Remove later with: signaler uninstall --global" -ForegroundColor White
