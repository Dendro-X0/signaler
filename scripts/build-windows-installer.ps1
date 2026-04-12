#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

function Get-PackageVersion {
  $packageJson = Get-Content -Raw package.json | ConvertFrom-Json
  if (-not $packageJson.version) {
    throw "package.json is missing version."
  }
  return [string]$packageJson.version
}

function Resolve-IsccPath {
  if ($env:INNO_SETUP_COMPILER -and (Test-Path $env:INNO_SETUP_COMPILER)) {
    return $env:INNO_SETUP_COMPILER
  }

  $candidates = @(
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw "Inno Setup compiler not found. Set INNO_SETUP_COMPILER or install Inno Setup 6."
}

$version = Get-PackageVersion
$root = Resolve "."
$releaseDir = Join-Path $root "release"
$portableZip = Join-Path $releaseDir "signaler-$version-portable.zip"

if (-not (Test-Path $portableZip)) {
  Write-Host "Portable zip not found. Building it first..." -ForegroundColor Yellow
  & pnpm.cmd run release:portable -- --version $version
  if ($LASTEXITCODE -ne 0) {
    throw "Portable release build failed."
  }
}

$stagingRoot = Join-Path $releaseDir "windows-installer-staging"
$portableDir = Join-Path $stagingRoot "signaler-$version-portable"
$issPath = Join-Path $root "release-assets\windows\signaler-installer.iss"
$iscc = Resolve-IsccPath

if (Test-Path $stagingRoot) {
  Remove-Item $stagingRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null
Expand-Archive -LiteralPath $portableZip -DestinationPath $stagingRoot -Force

if (-not (Test-Path $portableDir)) {
  throw "Portable release did not extract to expected path: $portableDir"
}

Write-Host "Building Windows installer for Signaler $version..." -ForegroundColor Cyan

& $iscc "/DAppVersion=$version" "/DPortableSourceDir=$portableDir" "/DOutputDir=$releaseDir" $issPath
if ($LASTEXITCODE -ne 0) {
  throw "Inno Setup compilation failed with exit code $LASTEXITCODE."
}

Write-Host "Windows installer built in $releaseDir" -ForegroundColor Green
