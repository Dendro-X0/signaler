#!/usr/bin/env bash
# Final setup script - creates wrapper pointing to local development version

echo "=== Signaler CLI - Final Setup ==="
echo ""

# Create the wrapper directory if it doesn't exist
mkdir -p "$HOME/AppData/Local/signaler/bin"

# Create the wrapper pointing to the local development version
cat > "$HOME/AppData/Local/signaler/bin/signaler" << 'EOF'
#!/usr/bin/env bash
# Signaler CLI wrapper - points to local development version
exec node "/e/Web Project/experimental-workspace/apex-auditor-workspace/signaler/dist/bin.js" "$@"
EOF

chmod +x "$HOME/AppData/Local/signaler/bin/signaler"

echo "✓ Wrapper created at: $HOME/AppData/Local/signaler/bin/signaler"
echo ""
echo "Testing..."
signaler help | head -n 3
echo ""
echo "✓ Setup complete!"
echo ""
echo "You can now use 'signaler' from anywhere:"
echo "  signaler wizard"
echo "  signaler audit"
echo ""
