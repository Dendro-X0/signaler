# Signaler v2.0.0 Release Instructions - JSR Only

## 🎉 Release Status: Ready for JSR Publication

### ✅ Completed Steps
- [x] Version bumped to 2.0.0
- [x] CI tests passing (6/6 platforms)
- [x] v2.0.0 tag created and pushed
- [x] Documentation verified
- [x] Simplified to JSR-only distribution

### 🚀 JSR-Only Publication Strategy

**Why JSR-Only?**
- ✅ Cleaner distribution model
- ✅ Automatic dependency management
- ✅ No GitHub Releases complexity
- ✅ Avoids outdated release confusion
- ✅ Better CI/CD reliability

### 📦 Publication Steps

#### Option 1: Automated (Preferred)
The v2.0.0 tag should trigger the JSR publish workflow automatically.

#### Option 2: Manual JSR Publishing
```bash
# Authenticate with JSR (one-time setup)
npx jsr auth

# Publish to JSR
npx jsr publish --allow-slow-types
```

Or use the helper script:
```bash
./publish-jsr.sh      # Linux/macOS
# or
publish-jsr.bat       # Windows
```

### 🎯 Installation Instructions

**Primary and Only Method:**
```bash
npx jsr add @signaler/cli@2.0.0
signaler --version
```

### 📚 Documentation Updates Needed

Update README.md and documentation to reflect JSR-only installation:

```markdown
## Installation

```bash
npx jsr add @signaler/cli
```

That's it! No binary downloads, no GitHub Releases complexity.
```

### ✅ Verification Steps

After JSR publication:

1. **Verify JSR**: Check https://jsr.io/@signaler/cli
2. **Test Installation**:
   ```bash
   npx jsr add @signaler/cli@2.0.0
   signaler --version
   ```
3. **Update Documentation**: Remove GitHub Releases references

### 🧹 Cleanup Tasks

- [ ] Delete outdated GitHub Releases (v1.0.9 and earlier)
- [ ] Update README.md to JSR-only installation
- [ ] Remove binary release files from repository
- [ ] Update all documentation references

### 🎯 Post-Release Tasks

- [ ] Publish to JSR
- [ ] Test JSR installation
- [ ] Clean up GitHub Releases
- [ ] Update documentation
- [ ] Announce JSR-only approach

---

## 🎉 JSR-Only Release Strategy

This simplified approach eliminates:
- ❌ GitHub Releases complexity
- ❌ Binary file management
- ❌ Multiple distribution channels
- ❌ Version confusion

And provides:
- ✅ Single source of truth (JSR)
- ✅ Automatic updates
- ✅ Better dependency management
- ✅ Cleaner CI/CD pipeline