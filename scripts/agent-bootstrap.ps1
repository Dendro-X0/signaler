#!/usr/bin/env pwsh

param(
  [switch]$Help
)

$ErrorActionPreference = "Stop"

if ($Help -or $args -contains "-h" -or $args -contains "--help") {
  Write-Host "Usage:" -ForegroundColor Cyan
  Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/agent-bootstrap.ps1"
  Write-Host ""
  Write-Host "Optional environment overrides:"
  Write-Host "  BASE_URL=http://127.0.0.1:3000"
  Write-Host "  DISCOVER_SCOPE=full"
  Write-Host "  CONFIG_PATH=C:\path\to\signaler.config.json"
  Write-Host "  OUTPUT_DIR=C:\path\to\.signaler"
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")

if (-not $env:BASE_URL) { $env:BASE_URL = "http://127.0.0.1:3000" }
if (-not $env:DISCOVER_SCOPE) { $env:DISCOVER_SCOPE = "full" }
if (-not $env:CONFIG_PATH) { $env:CONFIG_PATH = Join-Path $RepoRoot "signaler.config.json" }
if (-not $env:OUTPUT_DIR) { $env:OUTPUT_DIR = Join-Path $RepoRoot ".signaler" }

function Invoke-Signaler {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  $signalerCmd = Get-Command signaler -ErrorAction SilentlyContinue
  if ($null -ne $signalerCmd) {
    & signaler @Args
    return
  }

  $localBin = Join-Path $RepoRoot "dist/bin.js"
  if (Test-Path $localBin) {
    & node $localBin @Args
    return
  }

  throw "Could not find 'signaler' in PATH or '$localBin'. Build local CLI first: corepack pnpm run build"
}

Write-Host "Running Signaler bootstrap..." -ForegroundColor Cyan
Write-Host "BASE_URL=$env:BASE_URL"
Write-Host "DISCOVER_SCOPE=$env:DISCOVER_SCOPE"
Write-Host "CONFIG_PATH=$env:CONFIG_PATH"

Invoke-Signaler @(
  "discover",
  "--scope", "$env:DISCOVER_SCOPE",
  "--non-interactive",
  "--yes",
  "--base-url", "$env:BASE_URL",
  "--config", "$env:CONFIG_PATH"
)

Invoke-Signaler @(
  "run",
  "--contract", "v3",
  "--mode", "throughput",
  "--ci",
  "--no-color",
  "--yes",
  "--config", "$env:CONFIG_PATH"
)

Invoke-Signaler @(
  "report",
  "--dir", "$env:OUTPUT_DIR"
)

Write-Host ""
Write-Host "Bootstrap complete. Agent read order:" -ForegroundColor Green
Write-Host "1. $env:OUTPUT_DIR/agent-index.json"
Write-Host "2. $env:OUTPUT_DIR/suggestions.json"
Write-Host "3. $env:OUTPUT_DIR/issues.json"
Write-Host "4. $env:OUTPUT_DIR/results.json"
Write-Host "5. $env:OUTPUT_DIR/run.json"
