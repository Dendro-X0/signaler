# Installation Options

You now have **three ways** to install and use Signaler. Choose what works best for you.

---

## Option 1: JSR (Recommended for Users)

**Best for:** End users who want simple installation

### Installation

```bash
# Add to project
npx jsr add @signaler/cli

# Or install globally
npm install -g jsr:@signaler/cli
```

### Usage

```bash
signaler wizard
signaler audit
```

### Pros
- ✅ Simple one-command installation
- ✅ Works with npm/pnpm/yarn/deno
- ✅ Automatic updates
- ✅ No npm registry issues

### Cons
- ⚠️ Requires JSR to be published first

### When to Use
- You want the easiest installation
- You're an end user, not a developer
- You want standard package manager workflow

---

## Option 2: Local Installation (Recommended for Development)

**Best for:** Development, customization, or when JSR isn't published yet

### Installation

```bash
# Clone and build
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
pnpm install
pnpm run build

# Link globally
pnpm link --global
```

### Usage

```bash
cd ~/my-project
signaler wizard
signaler audit
```

### Pros
- ✅ Full control over the code
- ✅ Easy to modify and customize
- ✅ No registry dependencies
- ✅ Works immediately
- ✅ Easy updates (`git pull && pnpm install && pnpm run build`)

### Cons
- ⚠️ Requires git and pnpm
- ⚠️ Manual updates

### When to Use
- You're developing or customizing Signaler
- You want to contribute to the project
- You need the latest unreleased features
- You want full control

---

## Option 3: Portable Package (For Distribution)

**Best for:** Sharing with team members or offline installation

### Creation

```bash
# Build portable package
pnpm install
pnpm run build

# Copy these folders:
# - dist/
# - node_modules/
# - package.json
# - signaler.cmd (Windows) or signaler.sh (Linux/macOS)
```

### Usage

```bash
# Windows
.\signaler.cmd wizard

# Linux/macOS
./signaler.sh wizard
```

### Pros
- ✅ No installation needed
- ✅ Works offline
- ✅ Easy to share (zip and send)
- ✅ No registry dependencies

### Cons
- ⚠️ Large file size (includes node_modules)
- ⚠️ Manual updates

### When to Use
- You need offline installation
- You're distributing to a team
- You want a self-contained package

---

## Comparison

| Feature | JSR | Local | Portable |
|---------|-----|-------|----------|
| **Installation** | One command | Clone + build | Extract zip |
| **Updates** | Automatic | `git pull` | Manual |
| **Size** | Small | Small | Large |
| **Offline** | ❌ | ✅ | ✅ |
| **Customization** | ❌ | ✅ | ❌ |
| **Ease of use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## Recommendations

### For Your Full-Stack Projects

Since you have multiple projects that need optimization:

**Use Local Installation:**

```bash
# Setup once
cd ~/projects
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
pnpm install && pnpm run build && pnpm link --global

# Use everywhere
cd ~/projects/project1 && signaler audit
cd ~/projects/project2 && signaler audit
cd ~/projects/project3 && signaler audit
```

**Why?**
- You control the code
- Easy to customize for your needs
- One setup, use everywhere
- Simple updates

### For Public Distribution

**Publish to JSR:**

```bash
# One-time setup
npm install -g @jsr/cli
jsr login

# Publish
pnpm run build
jsr publish
```

**Why?**
- Users get simple installation
- Standard package manager workflow
- No npm registry issues

---

## Quick Start Guide

### I want to use it now (Local)

```bash
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
pnpm install && pnpm run build && pnpm link --global
cd ~/my-project && signaler wizard
```

### I want to publish it (JSR)

```bash
npm install -g @jsr/cli
jsr login
cd signaler
pnpm run build
jsr publish
```

### I want to share it (Portable)

```bash
cd signaler
pnpm install && pnpm run build
# Zip the folder and share
```

---

## Documentation

- **Local Installation**: [INSTALL-LOCAL.md](INSTALL-LOCAL.md)
- **JSR Publishing**: [PUBLISH-JSR.md](PUBLISH-JSR.md)
- **JSR Quick Start**: [JSR-QUICKSTART.md](JSR-QUICKSTART.md)

---

## Summary

**You have options now:**

1. **JSR** - Simple for users (after you publish)
2. **Local** - Best for development and your projects
3. **Portable** - For offline/team distribution

**For your immediate needs** (optimizing your full-stack projects):
→ Use **Local Installation** (Option 2)

**For public distribution** (when ready):
→ Publish to **JSR** (Option 1)

The tool is ready to use. Pick the method that works for you.
