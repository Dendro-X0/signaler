# Signaler v2.1.0 Release Checklist

## Pre-Release Validation

### Version Updates
- [x] Updated `package.json` version to `2.1.0`
- [x] Updated `jsr.json` version to `2.1.0`
- [x] Updated `CHANGELOG.md` with v2.1.0 release notes

### Documentation
- [x] Created comprehensive `docs/FEATURES.md`
- [x] Created detailed `docs/MIGRATION.md`
- [x] Created complete `docs/RELEASE-NOTES-v2.1.md`
- [x] Created `docs/IMPLEMENTATION-SUMMARY.md`
- [x] Updated `README.md` with new documentation links

### Build & CLI
- [x] Build successful (`pnpm build`)
- [x] CLI working (`node dist/bin.js --version`)
- [x] Package files updated to include documentation

### CI/CD
- [x] Updated publish workflow (`.github/workflows/publish.yml`)
- [x] Added documentation verification step
- [x] Added GitHub release creation

## Release Process

### Option 1: Manual GitHub Release (Recommended)

1. **Commit and Push Changes**:
   ```bash
   git add .
   git commit -m "Release v2.1.0 - Multi-Audit Foundation

   🚀 Major architecture release with pluggable audits
   
   - Plugin interface system and registry
   - Multi-audit engine with shared execution context
   - Intelligent batch scheduling and parallel execution
   - Performance optimizations with caching and resource limits
   - Backward-compatible workflows and reports"
   
   git push origin main
   ```

2. **Create and Push Tag**:
   ```bash
   git tag v2.1.0
   git push origin v2.1.0
   ```

3. **Automatic Release**: The GitHub workflow will automatically:
   - Run tests and build
   - Verify documentation exists
   - Publish to JSR
   - Create GitHub release with release notes

### Option 2: Manual Workflow Trigger

1. **Commit and Push Changes** (same as above)

2. **Trigger Workflow**:
   - Go to GitHub Actions
   - Select "Publish v2.1 to JSR" workflow
   - Click "Run workflow"
   - Enter version: `2.1.0`
   - Click "Run workflow"

## Post-Release Tasks

### Verification
- [ ] Verify JSR publication: https://jsr.io/@signaler/cli
- [ ] Test installation: `npx jsr add @signaler/cli@2.1.0`
- [ ] Verify GitHub release created
- [ ] Check release notes and assets

### Communication
- [ ] Update project README if needed
- [ ] Announce release in relevant channels
- [ ] Update documentation links
- [ ] Share migration guide with users

## 🧪 Testing the Release

### Installation Test
```bash
# Test JSR installation
npx jsr add @signaler/cli@2.1.0

# Verify version
signaler --version

# Test basic functionality
signaler help
```

### Migration Test
```bash
# Test migration tool (when implemented)
signaler migrate --from ./old-config.js --to ./signaler.config.js

# Validate configuration
signaler validate --config ./signaler.config.js
```

## 📚 Documentation Links

- **Features**: [docs/FEATURES.md](docs/FEATURES.md)
- **Migration**: [docs/MIGRATION.md](docs/MIGRATION.md)
- **Release Notes**: [docs/RELEASE-NOTES-v2.1.md](docs/RELEASE-NOTES-v2.1.md)
- **Implementation Summary**: [docs/IMPLEMENTATION-SUMMARY.md](docs/IMPLEMENTATION-SUMMARY.md)

## 🎯 Key Features to Highlight

- **Plugin Architecture**: Pluggable audits with dependency-aware registry
- **Multi-Audit Engine**: Coordinated execution with shared context
- **Intelligent Scheduling**: Parallel batches with resource-aware limits
- **Performance Optimizations**: Caching and pooled resource management
- **Backward Compatibility**: Existing workflows unchanged

---

**Ready for Release!** 🚀

The v2.1.0 release is prepared and ready to deploy. All documentation is complete, version numbers are updated, and the CI/CD pipeline is configured for automatic publishing.