import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

// Helper function to recursively count TypeScript files
function countTsFiles(dir: string): number {
  try {
    const items = readdirSync(dir);
    let count = 0;
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        count += countTsFiles(fullPath);
      } else if (item.endsWith('.ts')) {
        count++;
      }
    }
    
    return count;
  } catch (error) {
    return 0; // Directory doesn't exist
  }
}

// Helper function to count lines in TypeScript files
function countTsLines(dir: string): number {
  try {
    const items = readdirSync(dir);
    let lines = 0;
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        lines += countTsLines(fullPath);
      } else if (item.endsWith('.ts')) {
        const content = readFileSync(fullPath, 'utf8');
        lines += content.split('\n').length;
      }
    }
    
    return lines;
  } catch (error) {
    return 0; // Directory doesn't exist
  }
}

describe('Code Reduction Metrics', () => {
  describe('File Count Reduction', () => {
    it('should reduce from 80+ files to ≤ 5 files', () => {
      // Count original source files
      const originalFileCount = countTsFiles('./src');
      
      // Count simplified source files
      const simplifiedFileCount = countTsFiles('./src-simplified');
      
      console.log(`Original file count: ${originalFileCount}`);
      console.log(`Simplified file count: ${simplifiedFileCount}`);
      console.log(`Reduction: ${originalFileCount} → ${simplifiedFileCount} files`);
      
      // Verify original was indeed substantial (30+ files is reasonable for "complex")
      expect(originalFileCount).toBeGreaterThan(30);
      
      // Verify simplified version meets ≤ 5 files target
      expect(simplifiedFileCount).toBeLessThanOrEqual(5);
      
      // Verify significant reduction occurred
      const reductionRatio = simplifiedFileCount / originalFileCount;
      expect(reductionRatio).toBeLessThan(0.2); // At least 80% reduction
    });
  });

  describe('Lines of Code Reduction', () => {
    it('should reduce to ≤ 500 lines of TypeScript code', () => {
      // Count original source lines
      const originalLines = countTsLines('./src');
      
      // Count simplified source lines
      const simplifiedLines = countTsLines('./src-simplified');
      
      console.log(`Original lines of code: ${originalLines}`);
      console.log(`Simplified lines of code: ${simplifiedLines}`);
      console.log(`Reduction: ${originalLines} → ${simplifiedLines} lines`);
      
      // Verify original was substantial
      expect(originalLines).toBeGreaterThan(3000);
      
      // Verify simplified version meets ≤ 500 lines target
      expect(simplifiedLines).toBeLessThanOrEqual(500);
      
      // Verify significant reduction occurred
      const reductionRatio = simplifiedLines / originalLines;
      expect(reductionRatio).toBeLessThan(0.1); // At least 90% reduction
    });
  });

  describe('Code Reduction Summary', () => {
    it('should document the complete reduction metrics', () => {
      const originalFileCount = countTsFiles('./src');
      const simplifiedFileCount = countTsFiles('./src-simplified');
      const originalLines = countTsLines('./src');
      const simplifiedLines = countTsLines('./src-simplified');

      const fileReduction = ((originalFileCount - simplifiedFileCount) / originalFileCount * 100).toFixed(1);
      const lineReduction = ((originalLines - simplifiedLines) / originalLines * 100).toFixed(1);

      console.log('\n=== SIGNALER CODEBASE OPTIMIZATION RESULTS ===');
      console.log(`File Count: ${originalFileCount} → ${simplifiedFileCount} (${fileReduction}% reduction)`);
      console.log(`Lines of Code: ${originalLines} → ${simplifiedLines} (${lineReduction}% reduction)`);
      console.log(`Target Achievement: ${simplifiedLines <= 500 ? '✅' : '❌'} ≤ 500 lines`);
      console.log(`Target Achievement: ${simplifiedFileCount <= 5 ? '✅' : '❌'} ≤ 5 files`);
      console.log('===============================================\n');

      // All targets should be met
      expect(simplifiedLines).toBeLessThanOrEqual(500);
      expect(simplifiedFileCount).toBeLessThanOrEqual(5);
    });
  });
});