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

function Ensure-UserPathContains {
  param(
    [string]$PathEntry
  )

  $currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not $currentUserPath) {
    $currentUserPath = ""
  }

  $entries = $currentUserPath -split ';' | Where-Object { $_ -and $_.Trim().Length -gt 0 }
  $alreadyPresent = $entries | Where-Object { $_.TrimEnd('\') -ieq $PathEntry.TrimEnd('\') } | Select-Object -First 1
  if (-not $alreadyPresent) {
    $newUserPath = if ($currentUserPath.Trim().Length -eq 0) { $PathEntry } else { "$currentUserPath;$PathEntry" }
    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
  }

  $sessionEntries = $env:Path -split ';' | Where-Object { $_ -and $_.Trim().Length -gt 0 }
  $sessionPresent = $sessionEntries | Where-Object { $_.TrimEnd('\') -ieq $PathEntry.TrimEnd('\') } | Select-Object -First 1
  if (-not $sessionPresent) {
    $env:Path = if ($env:Path.Trim().Length -eq 0) { $PathEntry } else { "$env:Path;$PathEntry" }
  }
}

function Install-RuntimeDependencies {
  param(
    [string]$InstallDir
  )

  Write-Host ""
  Write-Host "==> Step 4/4: Installing runtime dependencies" -ForegroundColor Cyan
  Write-Host "    First install usually takes 5-15 minutes (Lighthouse, Playwright, axe-core, and related tooling)." -ForegroundColor DarkGray
  Write-Host "    npm may look idle while resolving the dependency tree." -ForegroundColor DarkGray
  Write-Host ""

  $startedAt = Get-Date
  Push-Location $InstallDir
  try {
    $npmArgs = @("--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund", "--loglevel=info")
    $npmCommand = "install"
    if (Test-Path (Join-Path $InstallDir "package-lock.json")) {
      $npmCommand = "ci"
      Write-Host "    Using package-lock.json (npm ci) for a faster, reproducible install." -ForegroundColor DarkGray
      Write-Host ""
    }

    & npm.cmd $npmCommand @npmArgs
    if ($LASTEXITCODE -ne 0) {
      throw "npm $npmCommand failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }

  $elapsed = (Get-Date) - $startedAt
  Write-Host ("    Dependencies ready in {0:mm\:ss}." -f $elapsed) -ForegroundColor DarkGray
}

function Get-ReleaseApiUrl {
  param(
    [string]$Repo,
    [string]$Version
  )

  if ($Version -eq "latest") {
    return "https://api.github.com/repos/$Repo/releases/latest"
  }

  $tag = if ($Version.StartsWith("v")) { $Version } else { "v$Version" }
  return "https://api.github.com/repos/$Repo/releases/tags/$tag"
}

function Get-PortableAssetUrl {
  param(
    [string]$Repo,
    [string]$Version
  )

  $apiUrl = Get-ReleaseApiUrl -Repo $Repo -Version $Version
  $headers = @{ "User-Agent" = "signaler-install-script" }
  if ($env:GITHUB_TOKEN) {
    $headers["Authorization"] = "Bearer $($env:GITHUB_TOKEN)"
  } elseif ($env:GH_TOKEN) {
    $headers["Authorization"] = "Bearer $($env:GH_TOKEN)"
  }
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

$InstallStartedAt = Get-Date

Write-Host "==> Step 1/4: Resolving Signaler release" -ForegroundColor Cyan
Write-Host "Repo: $Repo" -ForegroundColor DarkGray
Write-Host "Version: $Version" -ForegroundColor DarkGray

$asset = Get-PortableAssetUrl -Repo $Repo -Version $Version
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null

Write-Host ""
Write-Host "==> Step 2/4: Downloading portable release ($($asset.tag))" -ForegroundColor Cyan
$downloadStartedAt = Get-Date
Invoke-WebRequest -Headers @{ "User-Agent" = "signaler-install-script" } -Uri $asset.url -OutFile $ZipPath
$downloadElapsed = (Get-Date) - $downloadStartedAt
Write-Host ("    Download complete in {0:mm\:ss}." -f $downloadElapsed) -ForegroundColor DarkGray

Write-Host ""
Write-Host "==> Step 3/4: Extracting to $InstallDir" -ForegroundColor Cyan
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
Ensure-UserPathContains -PathEntry $BinDir

Remove-Item $TempRoot -Recurse -Force
Remove-Item $ZipPath -Force

Write-Host ""
Write-Host "Installed $($asset.tag) to $InstallDir" -ForegroundColor Green
Write-Host "Launcher directory: $BinDir" -ForegroundColor Green
$totalElapsed = (Get-Date) - $InstallStartedAt
Write-Host ("Total install time: {0:mm\:ss}" -f $totalElapsed) -ForegroundColor DarkGray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. PATH was updated for the current user and this session." -ForegroundColor White
Write-Host "  2. Restart your terminal if it was already open in another window." -ForegroundColor White
Write-Host "  3. Run: signaler --version  (or: signalar --version)" -ForegroundColor White
Write-Host "  4. Update later with: signaler upgrade" -ForegroundColor White
Write-Host "  5. Remove later with: signaler uninstall --global" -ForegroundColor White
