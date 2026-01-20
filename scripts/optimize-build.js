#!/usr/bin/env node

/**
 * Build optimization script for JSR publication
 * Cleans up dist directory and optimizes file structure
 */

import { fileURLToPath } from 'node:url';
import { dirname, join, extname, basename } from 'node:path';
import { readdir, stat, unlink, rmdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distPath = join(__dirname, '..', 'dist');

/**
 * Get all files recursively from a directory
 */
async function getAllFiles(dir) {
  const files = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...await getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
  } catch (err) {
    console.warn(`Warning: Could not read directory ${dir}:`, err.message);
  }
  
  return files;
}

/**
 * Remove unnecessary files from dist directory
 */
async function cleanUnnecessaryFiles() {
  console.log('🧹 Cleaning unnecessary files from dist directory...');
  
  if (!existsSync(distPath)) {
    console.log('No dist directory found, skipping cleanup');
    return;
  }
  
  const allFiles = await getAllFiles(distPath);
  let removedCount = 0;
  
  for (const filePath of allFiles) {
    const fileName = basename(filePath);
    const fileExt = extname(filePath);
    
    // Files to remove
    const shouldRemove = 
      // Test files
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      filePath.includes('/test/') ||
      filePath.includes('/tests/') ||
      filePath.includes('/__tests__/') ||
      
      // Development files
      fileName.includes('.development.') ||
      fileName.includes('.dev.') ||
      
      // Source maps
      fileExt === '.map' ||
      
      // Build artifacts
      fileExt === '.tsbuildinfo' ||
      
      // Temporary files
      fileExt === '.tmp' ||
      fileExt === '.temp' ||
      
      // Log files
      fileExt === '.log';
    
    if (shouldRemove) {
      try {
        await unlink(filePath);
        console.log(`  ✓ Removed: ${filePath.replace(distPath, 'dist')}`);
        removedCount++;
      } catch (err) {
        console.warn(`  ⚠ Could not remove ${filePath}:`, err.message);
      }
    }
  }
  
  console.log(`✓ Removed ${removedCount} unnecessary files`);
}

/**
 * Remove empty directories
 */
async function removeEmptyDirectories() {
  console.log('📁 Removing empty directories...');
  
  const removeEmptyDirs = async (dir) => {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      // Recursively process subdirectories first
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = join(dir, entry.name);
          await removeEmptyDirs(subDir);
        }
      }
      
      // Check if directory is now empty
      const remainingEntries = await readdir(dir);
      if (remainingEntries.length === 0 && dir !== distPath) {
        await rmdir(dir);
        console.log(`  ✓ Removed empty directory: ${dir.replace(distPath, 'dist')}`);
      }
    } catch (err) {
      // Directory might not exist or might not be empty, which is fine
    }
  };
  
  await removeEmptyDirs(distPath);
}

/**
 * Validate file structure
 */
async function validateFileStructure() {
  console.log('🔍 Validating file structure...');
  
  const allFiles = await getAllFiles(distPath);
  let issues = 0;
  
  for (const filePath of allFiles) {
    const fileName = basename(filePath);
    const fileExt = extname(filePath);
    
    // Check for JavaScript files without corresponding .d.ts files
    if (fileExt === '.js' && !fileName.includes('bin') && !fileName.includes('postinstall')) {
      const dtsPath = filePath.replace('.js', '.d.ts');
      if (!existsSync(dtsPath)) {
        console.warn(`  ⚠ Missing TypeScript declaration: ${dtsPath.replace(distPath, 'dist')}`);
        issues++;
      }
    }
    
    // Check file sizes
    try {
      const stats = await stat(filePath);
      
      // Warn about very large files
      if (stats.size > 1024 * 1024) { // 1MB
        console.warn(`  ⚠ Large file detected: ${filePath.replace(distPath, 'dist')} (${Math.round(stats.size / 1024)}KB)`);
      }
      
      // Warn about empty files (except intentionally empty ones)
      if (stats.size === 0 && !fileName.startsWith('.')) {
        console.warn(`  ⚠ Empty file detected: ${filePath.replace(distPath, 'dist')}`);
        issues++;
      }
    } catch (err) {
      console.warn(`  ⚠ Could not stat file ${filePath}:`, err.message);
      issues++;
    }
  }
  
  if (issues === 0) {
    console.log('✓ File structure validation passed');
  } else {
    console.log(`⚠ Found ${issues} potential issues`);
  }
  
  return issues;
}

/**
 * Calculate and report bundle size
 */
async function reportBundleSize() {
  console.log('📊 Calculating bundle size...');
  
  const allFiles = await getAllFiles(distPath);
  let totalSize = 0;
  let fileCount = 0;
  
  const sizeByType = {
    '.js': 0,
    '.d.ts': 0,
    'other': 0
  };
  
  for (const filePath of allFiles) {
    try {
      const stats = await stat(filePath);
      const fileExt = extname(filePath);
      
      totalSize += stats.size;
      fileCount++;
      
      if (sizeByType[fileExt] !== undefined) {
        sizeByType[fileExt] += stats.size;
      } else {
        sizeByType.other += stats.size;
      }
    } catch (err) {
      console.warn(`Could not stat file ${filePath}:`, err.message);
    }
  }
  
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  };
  
  console.log(`✓ Total bundle size: ${formatSize(totalSize)}`);
  console.log(`  - Files: ${fileCount}`);
  console.log(`  - JavaScript: ${formatSize(sizeByType['.js'])}`);
  console.log(`  - TypeScript declarations: ${formatSize(sizeByType['.d.ts'])}`);
  console.log(`  - Other files: ${formatSize(sizeByType.other)}`);
  
  // Warn if bundle is too large
  if (totalSize > 50 * 1024 * 1024) { // 50MB
    console.warn('⚠ Bundle size is quite large (>50MB). Consider further optimization.');
  }
  
  return { totalSize, fileCount };
}

/**
 * Main optimization function
 */
async function main() {
  console.log('🚀 Starting build optimization for JSR publication...\n');
  
  try {
    // Step 1: Clean unnecessary files
    await cleanUnnecessaryFiles();
    console.log();
    
    // Step 2: Remove empty directories
    await removeEmptyDirectories();
    console.log();
    
    // Step 3: Validate file structure
    const issues = await validateFileStructure();
    console.log();
    
    // Step 4: Report bundle size
    const { totalSize, fileCount } = await reportBundleSize();
    console.log();
    
    // Summary
    console.log('📋 Optimization Summary:');
    console.log(`  - Bundle size: ${Math.round(totalSize / 1024)}KB`);
    console.log(`  - File count: ${fileCount}`);
    console.log(`  - Issues found: ${issues}`);
    
    if (issues === 0) {
      console.log('\n✅ Build optimization completed successfully!');
      console.log('The package is ready for JSR publication.');
    } else {
      console.log('\n⚠️  Build optimization completed with warnings.');
      console.log('Please review the issues above before publishing.');
    }
    
  } catch (err) {
    console.error('❌ Build optimization failed:', err.message);
    process.exit(1);
  }
}

main();