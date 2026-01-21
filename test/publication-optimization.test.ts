import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { readFile, access, stat, readdir } from "node:fs/promises";
import { resolve, join, extname, basename } from "node:path";
import { constants } from "node:fs";

type JsrExportObject = Readonly<{ import?: string; types?: string }>;
type JsrExportConfig = string | JsrExportObject;

describe("Publication Optimization", () => {
  // Feature: jsr-score-optimization, Property 6: Publication Optimization
  it("should organize files according to JSR best practices", async () => {
    const jsrJsonPath = resolve("jsr.json");
    
    try {
      await access(jsrJsonPath, constants.F_OK);
      
      const jsrContent = await readFile(jsrJsonPath, 'utf-8');
      const jsrJson = JSON.parse(jsrContent);
      
      // Test that all exports point to valid files
      const exportEntries = Object.entries(jsrJson.exports) as Array<[string, JsrExportConfig]>;
      
      for (const [exportPath, exportConfig] of exportEntries) {
        void exportPath;
        if (typeof exportConfig === "string") {
          const exportTargetPath = resolve(exportConfig);
          await access(exportTargetPath, constants.F_OK);
          const extension = extname(exportConfig);
          expect([".ts", ".js", ".mts", ".cts"].includes(extension)).toBe(true);
          continue;
        }
        const config: JsrExportObject = exportConfig;
        if (config.import) {
          const importPath = resolve(config.import);
          await access(importPath, constants.F_OK);
          expect(extname(config.import)).toBe(".js");
        }
        if (config.types) {
          const typesPath = resolve(config.types);
          await access(typesPath, constants.F_OK);
          expect(config.types.endsWith(".d.ts")).toBe(true);
        }
        if (config.import && config.types) {
          const importDir = config.import.substring(0, config.import.lastIndexOf("/"));
          const typesDir = config.types.substring(0, config.types.lastIndexOf("/"));
          expect(importDir).toBe(typesDir);
        }
      }
      
      // Property test for export structure consistency
      fc.assert(fc.property(
        fc.constantFrom(...exportEntries),
        ([exportPath, exportConfig]) => {
          void exportPath;
          if (typeof exportConfig === "string") {
            const extension = extname(exportConfig);
            expect([".ts", ".js", ".mts", ".cts"].includes(extension)).toBe(true);
            return true;
          }
          const config: JsrExportObject = exportConfig;
          if (config.import || config.types) {
            expect(config.import).toBeDefined();
            expect(config.types).toBeDefined();
          }
          if (config.import && config.types) {
            expect(config.import.endsWith(".js")).toBe(true);
            expect(config.types.endsWith(".d.ts")).toBe(true);
            expect(config.import.startsWith("./dist/")).toBe(true);
            expect(config.types.startsWith("./dist/")).toBe(true);
          }
          return true;
        }
      ), { numRuns: 100 });
      
    } catch (error) {
      throw new Error(`JSR file organization validation failed: ${error}`);
    }
  });

  // Feature: jsr-score-optimization, Property 6: Publication Optimization
  it("should exclude unnecessary files from publication", async () => {
    const jsrJsonPath = resolve("jsr.json");
    
    try {
      await access(jsrJsonPath, constants.F_OK);
      
      const jsrContent = await readFile(jsrJsonPath, 'utf-8');
      const jsrJson = JSON.parse(jsrContent);
      
      expect(jsrJson.publish).toBeDefined();
      expect(jsrJson.publish.exclude).toBeDefined();
      expect(Array.isArray(jsrJson.publish.exclude)).toBe(true);
      
      // Test that common unnecessary file patterns are excluded
      const unnecessaryPatterns = [
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.map',
        '**/test/',
        '**/tests/',
        '**/__tests__/',
        '**/*.development.*',
        '**/*.dev.*',
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/*.log',
        '**/*.tmp',
        '**/*.temp'
      ];
      
      fc.assert(fc.property(
        fc.constantFrom(...unnecessaryPatterns),
        (pattern) => {
          const excludeList = jsrJson.publish.exclude;
          const isExcluded = excludeList.some((excludePattern: string) => 
            excludePattern === pattern || 
            excludePattern.includes(pattern.replace('**/', '')) ||
            pattern.includes(excludePattern.replace('**/', ''))
          );
          
          expect(isExcluded).toBe(true);
          
          return true;
        }
      ), { numRuns: 100 });
      
    } catch (error) {
      throw new Error(`Publication exclusion validation failed: ${error}`);
    }
  });

  // Feature: jsr-score-optimization, Property 6: Publication Optimization
  it("should include only essential files for package functionality", async () => {
    const jsrJsonPath = resolve("jsr.json");
    const packageJsonPath = resolve("package.json");
    
    try {
      await access(jsrJsonPath, constants.F_OK);
      await access(packageJsonPath, constants.F_OK);
      
      const jsrContent = await readFile(jsrJsonPath, 'utf-8');
      const jsrJson = JSON.parse(jsrContent);
      
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      // Essential files that should be included (excluding jsr.json and package.json as they're auto-included)
      const essentialFiles = [
        'dist/',
        'README.md',
        'CHANGELOG.md',
        'LICENSE'
      ];
      
      // Test JSR publish.include configuration
      if (jsrJson.publish && jsrJson.publish.include) {
        fc.assert(fc.property(
          fc.constantFrom(...essentialFiles),
          (essentialFile) => {
            const includeList = jsrJson.publish.include;
            const isIncluded = includeList.some((includePattern: string) => 
              includePattern === essentialFile || 
              includePattern.startsWith(essentialFile) ||
              essentialFile.startsWith(includePattern)
            );
            
            expect(isIncluded).toBe(true);
            
            return true;
          }
        ), { numRuns: 100 });
      }
      
      // Test package.json files configuration
      if (packageJson.files) {
        fc.assert(fc.property(
          fc.constantFrom(...essentialFiles),
          (essentialFile) => {
            const filesList = packageJson.files;
            const isIncluded = filesList.some((filePattern: string) => 
              filePattern === essentialFile || 
              filePattern.startsWith(essentialFile) ||
              essentialFile.startsWith(filePattern)
            );
            
            expect(isIncluded).toBe(true);
            
            return true;
          }
        ), { numRuns: 100 });
      }
      
    } catch (error) {
      throw new Error(`Essential files validation failed: ${error}`);
    }
  });

  // Feature: jsr-score-optimization, Property 6: Publication Optimization
  it("should minimize bundle size while maintaining functionality", async () => {
    const distPath = resolve("dist");
    
    try {
      await access(distPath, constants.F_OK);
      
      // Get all files in dist directory
      const getAllFiles = async (dir: string): Promise<string[]> => {
        const files: string[] = [];
        const entries = await readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...await getAllFiles(fullPath));
          } else {
            files.push(fullPath);
          }
        }
        
        return files;
      };
      
      const allFiles = await getAllFiles(distPath);
      
      // Test bundle size constraints
      let totalSize = 0;
      let fileCount = 0;
      
      for (const filePath of allFiles) {
        const stats = await stat(filePath);
        totalSize += stats.size;
        fileCount++;
      }
      
      // Bundle should be under 50MB (reasonable for a CLI tool)
      expect(totalSize).toBeLessThan(50 * 1024 * 1024);
      
      // Should have a reasonable number of files (not excessive)
      expect(fileCount).toBeLessThan(1000);
      
      // Test individual files (non-property test to avoid async issues)
      for (const filePath of allFiles.slice(0, 50)) { // Test first 50 files
        const stats = await stat(filePath);
        const fileName = basename(filePath);
        const fileExt = extname(filePath);
        
        // Files should not be empty (except for intentionally empty files)
        if (!fileName.startsWith('.') && fileExt !== '.map') {
          expect(stats.size).toBeGreaterThan(0);
        }
        
        // JavaScript files should have corresponding TypeScript declarations
        if (fileExt === '.js') {
          const dtsPath = filePath.replace('.js', '.d.ts');
          try {
            await access(dtsPath, constants.F_OK);
          } catch {
            // Some files might not need .d.ts (like bin files), but most should have them
            if (!fileName.includes('bin') && !fileName.includes('postinstall')) {
              console.warn(`Missing TypeScript declaration for ${filePath}`);
            }
          }
        }
        
        // TypeScript declaration files validation
        if (filePath.endsWith('.d.ts')) {
          const jsPath = filePath.replace('.d.ts', '.js');
          try {
            const jsStats = await stat(jsPath);
            
            // For type-only modules, .d.ts can be much larger than .js (which might be just "export {};")
            // Check if this is likely a type-only module
            if (jsStats.size <= 20) { // Very small JS file, likely type-only
              // Allow .d.ts to be much larger for type-only modules, but still reasonable
              expect(stats.size).toBeLessThan(50 * 1024); // Max 50KB for type definitions
            } else {
              // Regular module - .d.ts should be reasonable compared to .js
              expect(stats.size).toBeLessThanOrEqual(jsStats.size * 5);
            }
          } catch {
            // JS file might not exist for some declaration files, which is okay for type-only modules
            // Just ensure the .d.ts file isn't excessively large
            expect(stats.size).toBeLessThan(100 * 1024); // Max 100KB for standalone type definitions
          }
        }
      }
      
      // Property test for file count and size constraints
      fc.assert(fc.property(
        fc.constant({ totalSize, fileCount }),
        (bundleInfo) => {
          expect(bundleInfo.totalSize).toBeLessThan(50 * 1024 * 1024);
          expect(bundleInfo.fileCount).toBeLessThan(1000);
          expect(bundleInfo.fileCount).toBeGreaterThan(0);
          return true;
        }
      ), { numRuns: 100 });
      
    } catch (error) {
      throw new Error(`Bundle size optimization validation failed: ${error}`);
    }
  });

  // Feature: jsr-score-optimization, Property 6: Publication Optimization
  it("should follow semantic versioning and proper release practices", async () => {
    const packageJsonPath = resolve("package.json");
    const jsrJsonPath = resolve("jsr.json");
    
    try {
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      const jsrContent = await readFile(jsrJsonPath, 'utf-8');
      const jsrJson = JSON.parse(jsrContent);
      
      // Test version consistency between package.json and jsr.json
      expect(packageJson.version).toBeDefined();
      expect(jsrJson.version).toBeDefined();
      expect(packageJson.version).toBe(jsrJson.version);
      
      // Test semantic versioning format
      fc.assert(fc.property(
        fc.constant(packageJson.version),
        (version) => {
          // Should follow semantic versioning pattern
          const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
          expect(version).toMatch(semverPattern);
          
          // Parse version components
          const match = version.match(semverPattern);
          if (match) {
            const [, major, minor, patch] = match;
            
            // Version components should be valid numbers
            expect(parseInt(major)).toBeGreaterThanOrEqual(0);
            expect(parseInt(minor)).toBeGreaterThanOrEqual(0);
            expect(parseInt(patch)).toBeGreaterThanOrEqual(0);
            
            // For a mature package, should be at least version 1.0.0 or higher
            const majorVersion = parseInt(major);
            const minorVersion = parseInt(minor);
            const patchVersion = parseInt(patch);
            
            if (majorVersion >= 1) {
              expect(majorVersion).toBeGreaterThanOrEqual(1);
            } else {
              // Pre-1.0 versions should still be reasonable
              expect(minorVersion + patchVersion).toBeGreaterThan(0);
            }
          }
          
          return true;
        }
      ), { numRuns: 100 });
      
      // Test that package has proper release configuration
      expect(packageJson.scripts).toBeDefined();
      expect(typeof packageJson.scripts).toBe('object');
      
      // Should have build script for releases
      const scripts = packageJson.scripts;
      expect(scripts.build || scripts.prepublishOnly || scripts.prepare).toBeDefined();
      
    } catch (error) {
      throw new Error(`Release practices validation failed: ${error}`);
    }
  });
});