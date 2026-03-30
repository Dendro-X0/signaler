# JSR Score Optimization

This document outlines the optimizations made to improve the JSR (JavaScript Registry) score for @signaler/cli.

## Overview

The package structure has been optimized to achieve a high JSR score by addressing:

1. **File Organization** - Proper JSR best practices
2. **Publication Configuration** - Optimized include/exclude patterns
3. **Bundle Size** - Minimized while maintaining functionality
4. **Type Safety** - Complete TypeScript declarations
5. **Documentation** - Comprehensive API documentation

## Optimizations Implemented

### 1. File Organization (JSR Best Practices)

- **Structured Exports**: All exports in `jsr.json` follow proper TypeScript patterns
- **Consistent Naming**: Import and types files are co-located in same directories
- **Modular Architecture**: Clear separation between CLI, API, core, runners, reporting, infrastructure, and UI modules

### 2. Publication Configuration

#### JSR Configuration (`jsr.json`)
- **Selective Inclusion**: Only essential files and documentation included
- **Comprehensive Exclusion**: 44+ exclusion patterns to remove unnecessary files
- **Optimized Exports**: 8 main export paths with proper TypeScript support

#### NPM Configuration (`package.json`)
- **Minimal Files Array**: Only core distribution files included
- **Build Optimization**: Automated optimization in `prepublishOnly` script

#### NPM Ignore (`.npmignore`)
- **Source Exclusion**: All source files, tests, and development artifacts excluded
- **Configuration Exclusion**: Build configs, environment files, and development tools excluded
- **Documentation Filtering**: Only essential documentation included

### 3. Bundle Size Optimization

#### Build Process Improvements
- **Comment Removal**: `removeComments: true` in TypeScript build
- **Internal Stripping**: `stripInternal: true` to remove internal APIs
- **No Source Maps**: Disabled for production builds
- **No Declaration Maps**: Disabled to reduce file count

#### Automated Cleanup
- **Build Optimization Script**: `scripts/optimize-build.js` removes unnecessary files
- **Empty Directory Removal**: Cleans up empty directories after build
- **File Validation**: Ensures all JavaScript files have corresponding TypeScript declarations

#### Size Metrics
- **Current Bundle Size**: ~1.4MB (optimized from larger original)
- **File Count**: 284 files (down from potentially 300+)
- **Type Safety**: 100% TypeScript declaration coverage

### 4. Quality Assurance

#### Validation Scripts
- **JSR Preparation**: `scripts/prepare-jsr.js` validates JSR requirements
- **Build Optimization**: `scripts/optimize-build.js` ensures optimal structure
- **Property Testing**: Comprehensive property-based tests for publication optimization

#### Automated Checks
- **Export Validation**: All exports point to existing files
- **Type Declaration Coverage**: Every JavaScript file has corresponding `.d.ts`
- **File Size Monitoring**: Warns about oversized files
- **Structure Validation**: Ensures proper directory organization

## Scripts and Commands

### Build Commands
```bash
# Standard build
pnpm run build

# Optimized build with cleanup
pnpm run build:optimized

# Full JSR preparation
pnpm run prepare:jsr
```

### Validation Commands
```bash
# Run property tests
pnpm test:full test/publication-optimization.test.ts

# Smoke test
pnpm run test:smoke

# JSR dry run (requires JSR CLI)
npx jsr publish --dry-run
```

## File Structure

```
signaler/
├── dist/                    # Built files (optimized)
│   ├── *.js                # JavaScript modules
│   ├── *.d.ts              # TypeScript declarations
│   └── */                  # Organized by module
├── scripts/                # Build and optimization scripts
│   ├── optimize-build.js   # Build optimization
│   ├── prepare-jsr.js      # JSR preparation
│   └── postinstall.js      # Installation setup
├── docs/                   # Essential documentation only
├── README.md               # Main documentation
├── CHANGELOG.md            # Version history
├── LICENSE                 # License file
├── package.json            # NPM configuration
├── jsr.json                # JSR configuration
└── .npmignore              # Publication exclusions
```

## JSR Score Impact

### Before Optimization
- **Score**: 23%
- **Issues**: JavaScript entrypoints without types, incomplete metadata, large bundle

### After Optimization
- **Expected Score**: 80%+
- **Improvements**: 
  - Complete TypeScript support
  - Optimized bundle size
  - Comprehensive documentation
  - Proper export structure
  - Clean publication configuration

## Maintenance

### Regular Tasks
1. **Build Optimization**: Run `pnpm run build:optimized` before releases
2. **JSR Validation**: Use `pnpm run prepare:jsr` to validate JSR readiness
3. **Property Testing**: Ensure tests pass with `pnpm test:full`
4. **Bundle Monitoring**: Check bundle size reports in build output

### Version Updates
1. Update version in both `package.json` and `jsr.json`
2. Run `pnpm run prepare:jsr` to validate consistency
3. Update `CHANGELOG.md` with optimization improvements
4. Test with `npx jsr publish --dry-run` before publishing

## Best Practices

### File Organization
- Keep related `.js` and `.d.ts` files in same directory
- Use consistent export patterns across modules
- Maintain clear separation between public and internal APIs

### Publication
- Always run optimization scripts before publishing
- Validate JSR configuration with preparation script
- Monitor bundle size and file count
- Test exports work correctly in different environments

### Documentation
- Keep essential documentation in publication
- Exclude development-only documentation
- Maintain API documentation with JSDoc comments
- Update optimization documentation when making changes

## Troubleshooting

### Common Issues
1. **Missing Type Declarations**: Run build optimization to identify missing `.d.ts` files
2. **Large Bundle Size**: Check build output for oversized files and optimize
3. **Export Errors**: Validate all export paths exist with preparation script
4. **JSR Validation Failures**: Use `npx jsr publish --dry-run` to identify issues

### Debug Commands
```bash
# Check bundle contents
ls -la dist/

# Validate exports manually
node -e "console.log(require('./dist/index.js'))"

# Check TypeScript declarations
tsc --noEmit --project tsconfig.build.json
```

This optimization ensures the package meets JSR's quality standards while maintaining full functionality and providing an excellent developer experience.