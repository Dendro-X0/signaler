import { describe, expect, it } from "vitest";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, join, extname } from "node:path";

describe("Example Coverage Consistency", () => {
  // Feature: jsr-score-optimization, Property 4: Example Coverage Consistency
  it("should have working code examples for all major features", async () => {
    const majorFeatures = [
      'audit',
      'measure',
      'health',
      'bundle',
      'wizard',
      'shell',
      'api'
    ];
    
    const examplesPath = resolve("docs/examples");
    
    // Test each feature individually
    for (const featureName of majorFeatures) {
      const basicUsagePath = join(examplesPath, "basic-usage.md");
      const basicUsageContent = await readFile(basicUsagePath, 'utf-8');
      
      // Create more flexible regex patterns for feature mentions
      const featurePatterns = [
        new RegExp(`signaler\\s+${featureName}`, 'i'),
        new RegExp(`${featureName}\\s*\\(`, 'i'),
        new RegExp(`${featureName}\\s*:`, 'i'),
        new RegExp(`${featureName}\\s+command`, 'i'),
        new RegExp(`###\\s*${featureName}`, 'i'),
        new RegExp(`##\\s*${featureName}`, 'i')
      ];
      
      const hasFeatureExample = featurePatterns.some(pattern => pattern.test(basicUsageContent));
      
      if (!hasFeatureExample) {
        // Also check in CLI usage examples
        try {
          const cliUsagePath = join(examplesPath, "cli-usage.md");
          const cliUsageContent = await readFile(cliUsagePath, 'utf-8');
          const hasCliExample = featurePatterns.some(pattern => pattern.test(cliUsageContent));
          
          expect(hasCliExample).toBe(true);
        } catch (error) {
          if (error.message.includes('ENOENT')) {
            throw new Error(`Missing example for major feature "${featureName}" in basic-usage.md`);
          }
          throw error;
        }
      } else {
        expect(hasFeatureExample).toBe(true);
      }
    }
  });

  // Feature: jsr-score-optimization, Property 4: Example Coverage Consistency
  it("should have framework-specific integration examples for supported frameworks", async () => {
    const supportedFrameworks = [
      'nextjs',
      'nuxt', 
      'remix',
      'sveltekit',
      'astro',
      'express'
    ];
    
    const frameworkIntegrationPath = resolve("docs/examples/framework-integration.md");
    const content = await readFile(frameworkIntegrationPath, 'utf-8');
    
    for (const frameworkName of supportedFrameworks) {
      // Check for framework section header (more flexible patterns)
      const frameworkPatterns = [
        new RegExp(`#{1,3}\\s*${frameworkName}`, 'i'),
        new RegExp(`#{1,3}\\s*${frameworkName}\\s+integration`, 'i'),
        new RegExp(`#{1,3}\\s*${frameworkName}\\s+setup`, 'i'),
        // Handle variations like "Next.js" vs "nextjs"
        frameworkName === 'nextjs' ? new RegExp(`#{1,3}\\s*next\\.js`, 'i') : null
      ].filter(Boolean);
      
      const hasFrameworkSection = frameworkPatterns.some(pattern => pattern.test(content));
      expect(hasFrameworkSection).toBe(true);
    }
  });

  // Feature: jsr-score-optimization, Property 4: Example Coverage Consistency
  it("should have comprehensive configuration examples for different use cases", async () => {
    const configurationTypes = [
      'performance-focused',
      'ci/cd optimized',
      'large site',
      'debug'
    ];
    
    const basicUsagePath = resolve("docs/examples/basic-usage.md");
    const content = await readFile(basicUsagePath, 'utf-8');
    
    for (const configType of configurationTypes) {
      // Create flexible regex for configuration type
      const normalizedType = configType.toLowerCase().replace(/[\/\s-]/g, '[\\s\\-\\/]*');
      const configRegex = new RegExp(`${normalizedType}[\\s\\S]*?configuration|configuration[\\s\\S]*?${normalizedType}`, 'i');
      const hasConfigType = configRegex.test(content);
      
      expect(hasConfigType).toBe(true);
    }
  });

  // Feature: jsr-score-optimization, Property 4: Example Coverage Consistency
  it("should have examples directory with proper structure and content", async () => {
    const examplesPath = resolve("docs/examples");
    
    // Check that examples directory exists
    const stats = await stat(examplesPath);
    expect(stats.isDirectory()).toBe(true);
    
    // Check required example files exist
    const requiredFiles = [
      'basic-usage.md',
      'framework-integration.md'
    ];
    
    for (const fileName of requiredFiles) {
      const filePath = join(examplesPath, fileName);
      const content = await readFile(filePath, 'utf-8');
      
      // Verify file has substantial content
      expect(content.length).toBeGreaterThan(500);
      
      // Verify file contains signaler references
      const hasSignalerReferences = content.toLowerCase().includes('signaler') || 
                                   content.includes('SignalerAPI') ||
                                   content.includes('@signaler/cli');
      expect(hasSignalerReferences).toBe(true);
    }
  });

  // Feature: jsr-score-optimization, Property 4: Example Coverage Consistency
  it("should have consistent example format and quality across all documentation", async () => {
    const exampleFiles = [
      'docs/examples/basic-usage.md',
      'docs/examples/framework-integration.md'
    ];
    
    for (const filePath of exampleFiles) {
      const fullPath = resolve(filePath);
      const content = await readFile(fullPath, 'utf-8');
      
      // Check for code blocks
      const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
      expect(codeBlocks.length).toBeGreaterThan(0);
      
      // Check for working examples
      const hasRealisticExamples = codeBlocks.some(block => 
        block.includes('signaler') || 
        block.includes('npm') || 
        block.includes('import') ||
        block.includes('baseUrl') ||
        block.includes('SignalerAPI') ||
        block.includes('@signaler/cli')
      );
      
      expect(hasRealisticExamples).toBe(true);
    }
  });
});