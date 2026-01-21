#!/usr/bin/env node

/**
 * JSR publication preparation script
 * Ensures package structure meets JSR requirements
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootPath = join(__dirname, '..');

/**
 * Validate JSR configuration
 */
async function validateJSRConfig() {
  console.log('🔍 Validating JSR configuration...');
  
  const jsrJsonPath = join(rootPath, 'jsr.json');
  
  try {
    await access(jsrJsonPath, constants.F_OK);
    
    const jsrContent = await readFile(jsrJsonPath, 'utf-8');
    const jsrJson = JSON.parse(jsrContent);
    
    // Required fields
    const requiredFields = ['name', 'version', 'exports', 'publish'];
    const missingFields = requiredFields.filter(field => !jsrJson[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required JSR fields: ${missingFields.join(', ')}`);
    }
    
    // Validate exports
    if (!jsrJson.exports || Object.keys(jsrJson.exports).length === 0) {
      throw new Error('JSR exports configuration is empty');
    }
    
    // Check that all export paths exist
    for (const [exportPath, exportConfig] of Object.entries(jsrJson.exports)) {
      if (typeof exportConfig === 'string') {
        const targetPath = join(rootPath, exportConfig);
        try {
          await access(targetPath, constants.F_OK);
        } catch {
          throw new Error(`Export file not found for ${exportPath}: ${exportConfig}`);
        }
        continue;
      }

      if (typeof exportConfig === 'object' && exportConfig !== null) {
        const config = exportConfig;
        
        if (config.import) {
          const importPath = join(rootPath, config.import);
          try {
            await access(importPath, constants.F_OK);
          } catch {
            throw new Error(`Export import file not found: ${config.import}`);
          }
        }
        
        if (config.types) {
          const typesPath = join(rootPath, config.types);
          try {
            await access(typesPath, constants.F_OK);
          } catch {
            throw new Error(`Export types file not found: ${config.types}`);
          }
        }
      }
    }
    
    console.log('✓ JSR configuration is valid');
    return jsrJson;
    
  } catch (err) {
    throw new Error(`JSR configuration validation failed: ${err.message}`);
  }
}

/**
 * Validate package.json compatibility
 */
async function validatePackageJson() {
  console.log('🔍 Validating package.json compatibility...');
  
  const packageJsonPath = join(rootPath, 'package.json');
  
  try {
    const packageContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    
    // Check version consistency with JSR
    const jsrJsonPath = join(rootPath, 'jsr.json');
    const jsrContent = await readFile(jsrJsonPath, 'utf-8');
    const jsrJson = JSON.parse(jsrContent);
    
    if (packageJson.version !== jsrJson.version) {
      throw new Error(`Version mismatch: package.json (${packageJson.version}) vs jsr.json (${jsrJson.version})`);
    }
    
    // Check required metadata
    const requiredMetadata = ['name', 'description', 'license', 'author'];
    const missingMetadata = requiredMetadata.filter(field => !packageJson[field]);
    
    if (missingMetadata.length > 0) {
      console.warn(`⚠ Missing recommended metadata: ${missingMetadata.join(', ')}`);
    }
    
    console.log('✓ Package.json is compatible');
    return packageJson;
    
  } catch (err) {
    throw new Error(`Package.json validation failed: ${err.message}`);
  }
}

/**
 * Check essential files exist
 */
async function checkEssentialFiles() {
  console.log('🔍 Checking essential files...');
  
  const jsrJsonPath = join(rootPath, 'jsr.json');
  const jsrContent = await readFile(jsrJsonPath, 'utf-8');
  const jsrJson = JSON.parse(jsrContent);

  const exportTargets = Object.values(jsrJson.exports)
    .filter((value) => typeof value === 'string');

  const essentialFiles = [
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    ...exportTargets,
  ];
  
  const missingFiles = [];
  
  for (const file of essentialFiles) {
    const filePath = join(rootPath, file);
    try {
      await access(filePath, constants.F_OK);
    } catch {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    throw new Error(`Missing essential files: ${missingFiles.join(', ')}`);
  }
  
  console.log('✓ All essential files present');
}

/**
 * Generate publication summary
 */
async function generatePublicationSummary() {
  console.log('📋 Generating publication summary...');
  
  const jsrJsonPath = join(rootPath, 'jsr.json');
  const jsrContent = await readFile(jsrJsonPath, 'utf-8');
  const jsrJson = JSON.parse(jsrContent);
  
  const summary = {
    name: jsrJson.name,
    version: jsrJson.version,
    exports: Object.keys(jsrJson.exports),
    includePatterns: jsrJson.publish?.include || [],
    excludePatterns: jsrJson.publish?.exclude || [],
    timestamp: new Date().toISOString()
  };
  
  console.log('📦 Publication Summary:');
  console.log(`  Package: ${summary.name}@${summary.version}`);
  console.log(`  Exports: ${summary.exports.join(', ')}`);
  console.log(`  Include patterns: ${summary.includePatterns.length}`);
  console.log(`  Exclude patterns: ${summary.excludePatterns.length}`);
  
  return summary;
}

/**
 * Main preparation function
 */
async function main() {
  console.log('🚀 Preparing package for JSR publication...\n');
  
  try {
    // Step 1: Validate JSR configuration
    await validateJSRConfig();
    console.log();
    
    // Step 2: Validate package.json compatibility
    await validatePackageJson();
    console.log();
    
    // Step 3: Check essential files
    await checkEssentialFiles();
    console.log();
    
    // Step 4: Generate publication summary
    const summary = await generatePublicationSummary();
    console.log();
    
    console.log('✅ Package is ready for JSR publication!');
    console.log('\nNext steps:');
    console.log('  1. Run: npx jsr publish --dry-run');
    console.log('  2. Review the output');
    console.log('  3. Run: npx jsr publish');
    
  } catch (err) {
    console.error('❌ JSR preparation failed:', err.message);
    console.error('\nPlease fix the issues above before publishing to JSR.');
    process.exit(1);
  }
}

main();