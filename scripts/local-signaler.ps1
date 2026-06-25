#Requires -Version 5.1
# Dot-source or run to use the local Signaler build:
#   . "E:\Web Projects\experimental-workspace\apex-auditor-workspace\signaler\scripts\local-signaler.ps1"

$SignalerRepo = Split-Path -Parent $PSScriptRoot
$SignalerBin = Join-Path $SignalerRepo "dist\bin.js"

if (-not (Test-Path $SignalerBin)) {
    Write-Error "Local Signaler not built. Run: cd `"$SignalerRepo`"; pnpm run build"
    exit 1
}

function signaler {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    & node $SignalerBin @Args
}

$version = & node $SignalerBin --version 2>&1 | Select-Object -First 2
Write-Host "Local Signaler: $($version -join ' ')"
Write-Host "Usage: signaler explore --cwd <app>  |  signaler bootstrap --audit --yes --cwd <app>"
