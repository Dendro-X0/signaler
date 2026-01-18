#!/usr/bin/env node

/**
 * Release script for Signaler v2.0
 * 
 * This script helps prepare and validate the v2.0 release
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const VERSION = '2.0.0';

console.log('🚀 Signaler v2.0 Release Preparation');
console.log('=====================================\n');

// Check if we're in the right directory
if (!existsSync('package.json')) {
  console.error('❌ Error: package.json not found. Run this script from the signaler directory.');
  process.exit(1);
}

// Verify version in package.json
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
if (packageJson.version !== VERSION) {
  console.error(`❌ Error: package.json version is ${packageJson.version}, expected ${VERSION}`);
  process.exit(1);
}

console.log('✅ Version check passed');

// Verify JSR configuration
if (!existsSync('jsr.json')) {
  console.error('❌ Error: jsr.json not found');
  process.exit(1);
}

const jsrJson = JSON.parse(readFileSync('jsr.json', 'utf8'));
if (jsrJson.version !== VERSION) {
  console.error(`❌ Error: jsr.json version is ${jsrJson.version}, expected ${VERSION}`);
  process.exit(1);
}

console.log('✅ JSR configuration check passed');

// Verify documentation exists
const requiredDocs = [
  'docs/FEATURES.md',
  'docs/MIGRATION.md',
  'docs/RELEASE-NOTES-v2.0.md',
  'docs/IMPLEMENTATION-SUMMARY.md'
];

for (const doc of requiredDocs) {
  if (!existsSync(doc)) {
    console.error(`❌ Error: Required documentation missing: ${doc}`);
    process.exit(1);
  }
}

console.log('✅ Documentation check passed');

// Run tests
console.log('\n🧪 Running tests...');
try {
  execSync('pnpm test', { stdio: 'inherit' });
  console.log('✅ Tests passed');
} catch (error) {
  console.error('❌ Tests failed');
  process.exit(1);
}

// Build the project
console.log('\n🔨 Building project...');
try {
  execSync('pnpm build', { stdio: 'inherit' });
  console.log('✅ Build successful');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Verify CLI works
console.log('\n🔧 Testing CLI...');
try {
  const output = execSync('node dist/bin.js --version', { encoding: 'utf8' });
  if (!output.includes(VERSION)) {
    console.error(`❌ CLI version mismatch. Expected ${VERSION}, got: ${output.trim()}`);
    process.exit(1);
  }
  console.log('✅ CLI test passed');
} catch (error) {
  console.error('❌ CLI test failed');
  process.exit(1);
}

console.log('\n🎉 Release preparation complete!');
console.log('\nNext steps:');
console.log('1. Commit all changes: git add . && git commit -m "Release v2.0.0"');
console.log('2. Create and push tag: git tag v2.0.0 && git push origin v2.0.0');
console.log('3. Or trigger manual publish: Go to GitHub Actions and run "Publish v2.0 to JSR"');
console.log('\n📚 Documentation:');
console.log('- Features: docs/FEATURES.md');
console.log('- Migration: docs/MIGRATION.md');
console.log('- Release Notes: docs/RELEASE-NOTES-v2.0.md');