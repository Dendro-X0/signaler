#!/usr/bin/env bash
# Quick fix script - run this in your current terminal

echo "=== Quick Fix: Removing Old Signaler Installation ==="
echo ""

# Remove old installations
echo "Removing old installations..."
npm uninstall -g @signaler/cli 2>/dev/null || true
rm -rf "$HOME/AppData/Local/signaler"
rm -rf "$HOME/AppData/Local/Programs/signaler"
echo "✓ Removed"
echo ""

# Clear cache
echo "Clearing npm cache..."
npm cache clean --force
echo "✓ Cleared"
echo ""

# Install fresh
echo "Installing latest version..."
npx jsr add @signaler/cli
echo "✓ Installed"
echo ""

# Create wrapper
echo "Creating Git Bash wrapper..."
mkdir -p "$HOME/AppData/Local/signaler/bin"
cat > "$HOME/AppData/Local/signaler/bin/signaler" << 'EOF'
#!/usr/bin/env bash
SIGNALER_ROOT="$HOME/AppData/Local/signaler/current"
exec node "$SIGNALER_ROOT/dist/bin.js" "$@"
EOF
chmod +x "$HOME/AppData/Local/signaler/bin/signaler"
echo "✓ Created"
echo ""

echo "=== Done! ==="
echo ""
echo "IMPORTANT: Restart your terminal now!"
echo "Then test with: signaler"
echo ""
