# Release Notes: v1.0.8 - Stability Release

**Release Date:** January 14, 2026  
**Type:** Stability & UX Improvements  
**Breaking Changes:** None

## Overview

Version 1.0.8 is a major stability release that transforms Signaler into a robust, production-ready CLI tool. This release focuses on reliability, error handling, resource management, and user experience without adding new features.

## What's New

### 🔧 Installation & Setup Improvements

**Node.js Version Validation**
- Checks for Node.js 16+ before installation
- Clear error messages with upgrade instructions
- Prevents cryptic errors from incompatible versions

**Installation Verification**
- Verifies CLI works after installation
- Tests build output exists
- Provides troubleshooting guidance on failure

**Memory Monitoring**
- Warns when system memory is low (<512MB free)
- Helps users understand potential performance issues
- Suggests closing other applications

### 🛡️ Enhanced Error Handling

**Context-Aware Error Messages**
- Missing config file → Suggests running `signaler wizard`
- Connection refused → Checks dev server and baseUrl
- Permission denied → Provides permission troubleshooting
- Unknown errors → Shows DEBUG mode instructions

**Graceful Shutdown**
- Ctrl+C properly cleans up Chrome processes
- Prevents orphaned browser instances
- User-friendly shutdown messages

**Configuration Validation**
- Validates baseUrl format before running
- Checks for duplicate page paths
- Validates parallel and timeout settings
- Clear error messages with specific issues

### ⚡ Lighthouse Runner Stability

**Transient Error Detection**
- Identifies network, Chrome, and timeout errors
- Automatic retry for transient failures
- Better error categorization for retry decisions

**Chrome Process Management**
- Automatic cleanup on shutdown and errors
- Graceful shutdown with SIGTERM then SIGKILL
- No orphaned Chrome processes

**Memory Awareness**
- Monitors available memory
- Warns when memory is constrained
- Adjusts parallelism based on available resources

### 🔄 Parallel Execution Improvements

**Adaptive Parallelism**
- Automatically reduces workers on high failure rates (>30%)
- Reduces parallelism on consecutive failures (≥3)
- Memory-aware worker calculation (1.5GB per worker)
- User notifications of parallelism changes

**Worker Pool Management**
- Optimal parallel calculation based on CPU and memory
- Graceful worker shutdown
- Enhanced cleanup with proper error handling
- Failure rate tracking and adjustment

### 🎨 User Experience Polish

**Progress Indicators**
- Spinner animations for warm-up phase
- Real-time progress updates with page counts
- Success/failure indicators
- Better visual feedback during long operations

**Status Messages**
- Clearer messages throughout CLI operations
- Helpful suggestions when errors occur
- Memory warnings when resources are low
- Parallelism reduction notifications

## Technical Details

### New Utilities

Five new utility modules were added:

1. **`utils/memory-monitor.ts`** - Memory status tracking
2. **`utils/retry.ts`** - Retry logic with exponential backoff
3. **`utils/chrome-cleanup.ts`** - Chrome process management
4. **`utils/worker-pool.ts`** - Adaptive parallel worker management
5. **`utils/progress.ts`** - Progress indicators and spinners

### Modified Files

- `src/bin.ts` - Node.js check, memory check, error handling, Chrome cleanup
- `src/core/config.ts` - Configuration validation
- `src/lighthouse-worker.ts` - Enhanced error detection
- `src/lighthouse-runner.ts` - Parallel execution improvements, worker cleanup, adaptive parallelism, warm-up spinner
- `scripts/quick-install.ps1` - Installer improvements

## Before & After

### Installation
**Before:** Silent failures, no verification  
**After:** Verified installations with clear errors

### Error Messages
**Before:** Generic "Error occurred"  
**After:** Specific, actionable guidance

### Chrome Management
**Before:** Orphaned processes after crashes  
**After:** Automatic cleanup, no orphans

### Parallelism
**Before:** Fixed workers regardless of failures  
**After:** Adaptive adjustment based on failures

### Progress Feedback
**Before:** Basic text updates  
**After:** Spinner animations and real-time updates

## Success Metrics

✅ **Installation:** Clear error messages, verification, memory check  
✅ **Error Handling:** Specific guidance for all common issues  
✅ **Configuration:** Validation before audit starts  
✅ **Chrome Stability:** Automatic cleanup, no orphaned processes  
✅ **Memory Awareness:** Warnings and parallelism limits  
✅ **Retry Logic:** Automatic retry for transient errors  
✅ **Parallel Execution:** Adaptive adjustment, graceful cleanup  
✅ **Worker Management:** Proper shutdown, failure tracking  
✅ **Progress Indicators:** Spinners for warm-up, better UX

## Upgrade Guide

### From v1.0.7 or earlier

No breaking changes! Simply update to v1.0.8:

```bash
# If installed via npm/pnpm
pnpm update @auditorix/signaler

# If installed via GitHub
signaler upgrade --repo Dendro-X0/signaler
```

All existing configurations and workflows will continue to work.

## Testing

### Automated Tests
- ✅ 27/27 unit tests passing
- ✅ TypeScript compilation successful
- ✅ No diagnostic errors

### Manual Testing
- ✅ CLI help commands work
- ✅ Error handling verified
- ✅ Progress indicators functional
- ✅ Plan command shows correct configuration

## Known Issues

None identified. All planned features implemented successfully.

## Future Enhancements

While v1.0.8 is complete, potential future improvements include:

- Progress bars for audit execution (currently using line-based progress)
- Color-coded status messages throughout CLI
- Interactive progress dashboard
- Real-time performance metrics display

## Credits

This release focused on stability and reliability improvements based on real-world usage feedback. Special thanks to all users who reported issues and provided feedback.

## Support

- **Documentation:** See README.md and INSTALL.md
- **Issues:** https://github.com/Dendro-X0/signaler/issues
- **Discussions:** https://github.com/Dendro-X0/signaler/discussions

## Next Steps

After installing v1.0.8:

1. Run `signaler wizard` to create or update your configuration
2. Test with `signaler audit --plan` to verify settings
3. Run your first audit with `signaler audit`
4. Enjoy improved stability and better error messages!

---

**Full Changelog:** See [CHANGELOG.md](CHANGELOG.md) for complete details.
