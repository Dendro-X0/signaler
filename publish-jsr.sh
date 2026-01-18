#!/bin/bash
# Signaler v2.0.0 JSR Publishing Script

echo "🚀 Publishing Signaler CLI v2.0.0 to JSR..."

# Check if we're in the right directory
if [ ! -f "jsr.json" ]; then
    echo "❌ Error: jsr.json not found. Please run this script from the signaler directory."
    exit 1
fi

# Check if we're authenticated with JSR
echo "🔐 Checking JSR authentication..."
if ! npx jsr whoami > /dev/null 2>&1; then
    echo "❌ Not authenticated with JSR. Please run:"
    echo "   npx jsr auth"
    echo "   Then try again."
    exit 1
fi

echo "✅ JSR authentication verified"

# Build the project
echo "🔨 Building project..."
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors and try again."
    exit 1
fi

echo "✅ Build successful"

# Publish to JSR
echo "📦 Publishing to JSR..."
npx jsr publish --allow-slow-types

if [ $? -eq 0 ]; then
    echo "🎉 Successfully published @signaler/cli@2.0.0 to JSR!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Verify at: https://jsr.io/@signaler/cli"
    echo "2. Test installation: npx jsr add @signaler/cli@2.0.0"
    echo "3. Create GitHub Release with binary assets"
else
    echo "❌ JSR publishing failed. Check the error above."
    echo ""
    echo "💡 Common solutions:"
    echo "1. Ensure you're authenticated: npx jsr auth"
    echo "2. Check package name availability"
    echo "3. Verify jsr.json configuration"
    exit 1
fi