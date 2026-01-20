@echo off
REM Signaler v2.1.0 JSR Publishing Script for Windows

echo 🚀 Publishing Signaler CLI v2.1.0 to JSR...

REM Check if we're in the right directory
if not exist "jsr.json" (
    echo ❌ Error: jsr.json not found. Please run this script from the signaler directory.
    pause
    exit /b 1
)

REM Check if we're authenticated with JSR
echo 🔐 Checking JSR authentication...
npx jsr whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not authenticated with JSR. Please run:
    echo    npx jsr auth
    echo    Then try again.
    pause
    exit /b 1
)

echo ✅ JSR authentication verified

REM Build the project
echo 🔨 Building project...
pnpm build

if %errorlevel% neq 0 (
    echo ❌ Build failed. Please fix build errors and try again.
    pause
    exit /b 1
)

echo ✅ Build successful

REM Publish to JSR
echo 📦 Publishing to JSR...
npx jsr publish --allow-slow-types

if %errorlevel% equ 0 (
    echo 🎉 Successfully published @signaler/cli@2.1.0 to JSR!
    echo.
    echo 📋 Next steps:
    echo 1. Verify at: https://jsr.io/@signaler/cli
    echo 2. Test installation: npx jsr add @signaler/cli@2.1.0
    echo 3. Create GitHub Release with binary assets
) else (
    echo ❌ JSR publishing failed. Check the error above.
    echo.
    echo 💡 Common solutions:
    echo 1. Ensure you're authenticated: npx jsr auth
    echo 2. Check package name availability
    echo 3. Verify jsr.json configuration
    pause
    exit /b 1
)

pause