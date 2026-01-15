# Publish to JSR - Quick Guide

## Ready to Publish? Follow These Steps:

### 1. Build the Project

```bash
cd signaler
pnpm install
pnpm run build
```

### 2. Verify Build Output

```bash
dir dist
```

You should see:
- `bin.js`
- `cli.js`
- `index.js`
- Various `.d.ts` files

### 3. Test Locally (Optional)

```bash
node dist/bin.js help
```

### 4. Dry Run (See What Will Be Published)

```bash
npx jsr publish --dry-run
```

This shows you exactly what files will be published without actually publishing.

### 5. Publish to JSR

```bash
npx jsr publish
```

**What happens:**
1. Browser opens automatically
2. You'll be prompted to log in to JSR (or create account)
3. You'll need to create the `@auditorix` scope (first time only)
4. Authorize the publish
5. Package uploads to JSR
6. Done!

### 6. Verify Publication

Visit: https://jsr.io/@signaler/signaler

### 7. Test Installation

```bash
# In a different directory
npx jsr add @signaler/signaler

# Or install globally
npm install -g jsr:@signaler/signaler

# Test it
signaler --version
```

## Troubleshooting

### "Scope @signaler does not exist"

1. Go to https://jsr.io/new
2. Create the `@signaler` scope
3. Try `npx jsr publish` again

### "Version 1.0.8 already exists"

Update version in `jsr.json`:
```json
{
  "version": "1.0.9"
}
```

### "Build files missing"

Run `pnpm run build` first.

### Browser doesn't open

Copy the URL from terminal and paste it in your browser manually.

## After Publishing

Your package will be available:
- **JSR**: `jsr:@signaler/signaler`
- **npm**: `npx jsr add @signaler/signaler`
- **Deno**: `deno add @signaler/signaler`
- **Web**: https://jsr.io/@signaler/signaler

## Update README

After successful publish, update the README to show JSR as the primary installation method (already done!).

## Next Version

To publish updates:
1. Update version in `jsr.json` and `package.json`
2. Update `CHANGELOG.md`
3. Build: `pnpm run build`
4. Publish: `npx jsr publish`

That's it! No tokens, no npm conflicts, just simple publishing.
