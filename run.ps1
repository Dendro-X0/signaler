# Simple wrapper to run signaler directly with Node.js
# This bypasses all installation issues

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& node "$ScriptDir\dist\bin.js" $args
