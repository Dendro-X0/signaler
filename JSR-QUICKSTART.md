# JSR Quick Start

## For Publishers (You)

### First Time Setup

```bash
# 1. Install JSR CLI
npm install -g @jsr/cli

# 2. Login (opens browser)
jsr login

# 3. Build project
pnpm install
pnpm run build

# 4. Publish
jsr publish
```

### Updating

```bash
# 1. Update version in jsr.json and package.json
# 2. Build
pnpm run build

# 3. Publish
jsr publish
```

## For Users

### Installation

```bash
# Add to project
npx jsr add @auditorix/signaler

# Or install globally
npm install -g jsr:@auditorix/signaler
```

### Usage

```bash
signaler wizard
signaler audit
```

## Benefits

### vs npm
- ✅ No token management
- ✅ No naming conflicts
- ✅ OAuth authentication
- ✅ Simpler publishing

### vs Local Installation
- ✅ Easier for users
- ✅ Automatic updates
- ✅ Standard package manager
- ✅ Works everywhere

## Links

- **JSR Homepage**: https://jsr.io/
- **Your Package**: https://jsr.io/@auditorix/signaler (after publishing)
- **Documentation**: Auto-generated from TypeScript

## Commands

```bash
# Login
jsr login

# Publish
jsr publish

# Dry run (test without publishing)
jsr publish --dry-run

# Check who you're logged in as
jsr whoami
```

## Configuration

Edit `jsr.json`:

```json
{
  "name": "@auditorix/signaler",
  "version": "1.0.8",
  "exports": {
    ".": "./dist/index.js",
    "./cli": "./dist/cli.js"
  },
  "bin": {
    "signaler": "./dist/bin.js"
  }
}
```

## Workflow

```
Edit code → Build → Test → Update version → Publish
     ↓         ↓      ↓           ↓            ↓
   src/    pnpm    node      jsr.json      jsr
          build   dist/                  publish
                  bin.js
```

## That's It!

JSR makes publishing simple. No tokens, no hassle.
