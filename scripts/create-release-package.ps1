#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
& node (Join-Path $RepoRoot "scripts/create-portable-release.js") @args
