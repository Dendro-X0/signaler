# Local Installation (Simplest Method)

## The Problem

npm packaging has too many restrictions and complications. Let's skip it entirely.

## The Solution: Use It Locally

### Method 1: Clone and Link (Recommended)

```bash
# Clone the repository
git clone https://github.com/Dendro-X0/signaler.git
cd signaler

# Install dependencies
pnpm install

# Build
pnpm run build

# Link globally (makes 'signaler' command available everywhere)
pnpm link --global

# Now use it anywhere
cd ~/my-project
signaler wizard
signaler audit
```

**Advantages:**
- ✅ No npm registry
- ✅ No packaging issues
- ✅ Works immediately
- ✅ Easy to update (`git pull && pnpm install && pnpm run build`)
- ✅ You control everything

### Method 2: Run Directly (No Global Install)

```bash
# Clone and build
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
pnpm install
pnpm run build

# Run from the signaler directory
node dist/bin.js wizard

# Or create an alias
alias signaler="node /path/to/signaler/dist/bin.js"

# Now use it
signaler wizard
signaler audit
```

### Method 3: Use Your Own Projects

Since you have multiple full-stack projects that need this tool:

```bash
# In each project, add signaler as a local dependency
cd ~/my-project
pnpm add file:../signaler

# Or use it via npx
npx ../signaler/dist/bin.js wizard
npx ../signaler/dist/bin.js audit
```

## For Your Full-Stack Projects

You mentioned you have several projects that need optimization. Here's the workflow:

### One-Time Setup

```bash
# Clone signaler once
cd ~/projects
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
pnpm install
pnpm run build
pnpm link --global
```

### Use in Each Project

```bash
cd ~/projects/my-nextjs-app
signaler wizard  # Creates apex.config.json
signaler audit   # Runs performance audit

cd ~/projects/my-nuxt-app
signaler wizard
signaler audit

cd ~/projects/my-remix-app
signaler wizard
signaler audit
```

## Updating

```bash
cd ~/projects/signaler
git pull
pnpm install
pnpm run build
# If linked globally, it's automatically updated
```

## Why This Works

1. **No npm registry** - You're not fighting with npm's rules
2. **No packaging** - Just use the built JavaScript directly
3. **No installation complexity** - Clone, build, link
4. **Full control** - You own the code, modify as needed
5. **Easy updates** - Just `git pull`

## Troubleshooting

### "signaler: command not found"

If `pnpm link --global` doesn't work:

```bash
# Find where pnpm stores global bins
pnpm root -g

# Add it to your PATH
# Windows (PowerShell):
$env:PATH += ";C:\Users\YourName\AppData\Local\pnpm"

# Linux/macOS (bash):
export PATH="$PATH:$HOME/.local/share/pnpm"
```

Or just use Method 2 (run directly with `node dist/bin.js`).

### "Cannot find module"

Make sure you ran `pnpm install` and `pnpm run build`.

### Permission Issues

On Linux/macOS, you might need:

```bash
chmod +x dist/bin.js
```

## Summary

**Forget npm. Forget packaging. Just use it locally.**

1. Clone the repo
2. Build it (`pnpm install && pnpm run build`)
3. Link it globally (`pnpm link --global`)
4. Use it in your projects (`signaler wizard`)

This is the simplest, most reliable way to use the tool.
