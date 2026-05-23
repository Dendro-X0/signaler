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
  Write-Host "  JOB_PRESET=agent|manual   (default: agent)"
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")

if (-not $env:BASE_URL) { $env:BASE_URL = "http://127.0.0.1:3000" }
if (-not $env:DISCOVER_SCOPE) { $env:DISCOVER_SCOPE = "full" }
if (-not $env:CONFIG_PATH) { $env:CONFIG_PATH = Join-Path $RepoRoot "signaler.config.json" }
if (-not $env:OUTPUT_DIR) { $env:OUTPUT_DIR = Join-Path $RepoRoot ".signaler" }
if (-not $env:JOB_PRESET) { $env:JOB_PRESET = "agent" }

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
Write-Host "JOB_PRESET=$env:JOB_PRESET"

if ($env:JOB_PRESET -eq "agent") {
  $jobArgs = @(
    "job", "run", "--preset", "agent",
    "--base-url", "$env:BASE_URL",
    "--cwd", "$RepoRoot",
    "--dir", "$env:OUTPUT_DIR"
  )
  if (Test-Path $env:CONFIG_PATH) {
    $jobArgs += @("--config", "$env:CONFIG_PATH")
  }
  Invoke-Signaler -Args $jobArgs
} else {
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
    "--artifact-profile", "lean",
    "--ci",
    "--no-color",
    "--yes",
    "--config", "$env:CONFIG_PATH"
  )

  Invoke-Signaler @(
    "analyze",
    "--contract", "v6",
    "--artifact-profile", "lean",
    "--dir", "$env:OUTPUT_DIR"
  )
}

Write-Host ""
Write-Host "Bootstrap complete. Prefer projections:" -ForegroundColor Green
Write-Host "  signaler query --view agent --dir $env:OUTPUT_DIR"
Write-Host "  signaler query --view perf --dir $env:OUTPUT_DIR"
Write-Host "  signaler explain --id <issue-id> --dir $env:OUTPUT_DIR"
Write-Host ""
Write-Host "Direct file read order (when needed):"
Write-Host "1. $env:OUTPUT_DIR/analyze.json"
Write-Host "2. $env:OUTPUT_DIR/performance-triage.json"
Write-Host "3. $env:OUTPUT_DIR/agent-index.json"
