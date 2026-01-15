# Publishing to JSR (JavaScript Registry)

JSR is a modern package registry for JavaScript and TypeScript with better DX than npm.

## Why JSR?

- ✅ No npm token issues
- ✅ No naming conflicts
- ✅ Native TypeScript support
- ✅ Better documentation
- ✅ Simpler publishing
- ✅ Works with npm, pnpm, yarn, deno

## Prerequisites

1. **Create JSR account**: https://jsr.io/
2. **Install JSR CLI**:
   ```bash
   npm install -g @jsr/cli
   # or
   deno install -A -f jsr:@jsr/cli
   ```

## Publishing Steps

### 1. Build the Project

```bash
pnpm install
pnpm run build
```

### 2. Login to JSR

```bash
jsr login
```

This opens a browser for authentication.

### 3. Publish

```bash
jsr publish
```

That's it! JSR will:
- Read `jsr.json` configuration
- Package the files listed in `publish.include`
- Upload to JSR registry
- Make it available via `jsr:@auditorix/signaler`

## Installation for Users

### Using Deno

```bash
deno install -A -n signaler jsr:@auditorix/signaler
```

### Using npm/pnpm/yarn

```bash
# npm
npx jsr add @auditorix/signaler

# pnpm
pnpm dlx jsr add @auditorix/signaler

# yarn
yarn dlx jsr add @auditorix/signaler
```

### Using directly

```bash
# Deno
deno run -A jsr:@auditorix/signaler/cli wizard

# Node.js with jsr
npx jsr:@auditorix/signaler wizard
```

## Configuration

The `jsr.json` file configures what gets published:

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
  },
  "publish": {
    "include": [
      "dist/**/*.js",
      "dist/**/*.d.ts",
      "README.md",
      "LICENSE",
      "CHANGELOG.md"
    ]
  }
}
```

## Updating

To publish a new version:

1. Update version in `jsr.json` and `package.json`
2. Build: `pnpm run build`
3. Publish: `jsr publish`

## Advantages Over npm

### For Publishers (You)

- **No tokens needed** - OAuth authentication
- **No naming conflicts** - Scoped packages by default
- **Simpler config** - Just `jsr.json`
- **Better errors** - Clear validation messages
- **TypeScript native** - No need for separate @types packages

### For Users

- **Multiple runtimes** - Works with Node.js, Deno, Bun
- **Better docs** - Auto-generated from TypeScript
- **Faster installs** - Optimized registry
- **No registry issues** - Modern infrastructure

## Comparison

### npm Publishing

```bash
# Setup
npm login
npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN

# Publish
npm publish --access public

# Issues
- Token management
- Naming conflicts
- Registry downtime
- Complex configuration
```

### JSR Publishing

```bash
# Setup
jsr login  # One-time OAuth

# Publish
jsr publish

# Benefits
- No tokens
- No conflicts
- Modern registry
- Simple config
```

## Testing Before Publishing

### Dry Run

```bash
jsr publish --dry-run
```

This shows what would be published without actually publishing.

### Local Testing

```bash
# Build
pnpm run build

# Test locally
node dist/bin.js help

# Test in another project
cd ~/test-project
pnpm add file:../signaler
```

## Documentation

JSR automatically generates documentation from:
- README.md
- TypeScript types
- JSDoc comments

View at: `https://jsr.io/@auditorix/signaler`

## CI/CD Integration

### GitHub Actions

```yaml
name: Publish to JSR

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Build
        run: pnpm run build
        
      - name: Publish to JSR
        run: npx jsr publish
        env:
          JSR_TOKEN: ${{ secrets.JSR_TOKEN }}
```

## Troubleshooting

### "Package not found"

Make sure you're logged in:
```bash
jsr whoami
```

If not logged in:
```bash
jsr login
```

### "Version already exists"

Update the version in `jsr.json`:
```json
{
  "version": "1.0.9"
}
```

### "Build files missing"

Make sure you ran `pnpm run build` before publishing.

### "Permission denied"

You need to be a member of the `@auditorix` scope on JSR.

## Migration from npm

If you were using npm before:

1. **Keep package.json** - JSR works alongside npm
2. **Add jsr.json** - JSR-specific configuration
3. **Publish to both** - Users can choose

Users can install from either:
```bash
# From JSR
pnpm dlx jsr add @auditorix/signaler

# From npm (if you publish there too)
pnpm add @auditorix/signaler
```

## Summary

**JSR is simpler than npm:**

1. Login once: `jsr login`
2. Build: `pnpm run build`
3. Publish: `jsr publish`

No tokens, no conflicts, no hassle.

## Next Steps

1. Create JSR account: https://jsr.io/
2. Install JSR CLI: `npm install -g @jsr/cli`
3. Login: `jsr login`
4. Publish: `jsr publish`

Your package will be available at:
- `jsr:@auditorix/signaler`
- `https://jsr.io/@auditorix/signaler`
