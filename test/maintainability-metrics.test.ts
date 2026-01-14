import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

// Helper function to calculate cyclomatic complexity (simplified)
function calculateCyclomaticComplexity(code: string): number {
  // Count decision points: if, else, while, for, switch, case, catch, &&, ||, ?
  const decisionPoints = [
    /\bif\s*\(/g,
    /\belse\b/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\bswitch\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /&&/g,
    /\|\|/g,
    /\?/g
  ];
  
  let complexity = 1; // Base complexity
  
  for (const pattern of decisionPoints) {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }
  
  return complexity;
}

// Helper function to analyze code organization
function analyzeCodeOrganization(dir: string): {
  totalFiles: number;
  averageFileSize: number;
  maxFileSize: number;
  totalComplexity: number;
  averageComplexity: number;
  maxComplexity: number;
} {
  const files: string[] = [];
  
  function collectFiles(currentDir: string) {
    try {
      const items = readdirSync(currentDir);
      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          collectFiles(fullPath);
        } else if (item.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
  }
  
  collectFiles(dir);
  
  if (files.length === 0) {
    return {
      totalFiles: 0,
      averageFileSize: 0,
      maxFileSize: 0,
      totalComplexity: 0,
      averageComplexity: 0,
      maxComplexity: 0
    };
  }
  
  let totalLines = 0;
  let maxLines = 0;
  let totalComplexity = 0;
  let maxComplexity = 0;
  
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    const complexity = calculateCyclomaticComplexity(content);
    
    totalLines += lines;
    maxLines = Math.max(maxLines, lines);
    totalComplexity += complexity;
    maxComplexity = Math.max(maxComplexity, complexity);
  }
  
  return {
    totalFiles: files.length,
    averageFileSize: Math.round(totalLines / files.length),
    maxFileSize: maxLines,
    totalComplexity,
    averageComplexity: Math.round(totalComplexity / files.length),
    maxComplexity
  };
}

// Helper function to check separation of concerns
function checkSeparationOfConcerns(dir: string): {
  hasConfigModule: boolean;
  hasLighthouseModule: boolean;
  hasReportModule: boolean;
  hasTypesModule: boolean;
  modularity: number; // 0-1 score
} {
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.ts'));
    
    const hasConfigModule = files.some(f => f.includes('config'));
    const hasLighthouseModule = files.some(f => f.includes('lighthouse'));
    const hasReportModule = files.some(f => f.includes('report'));
    const hasTypesModule = files.some(f => f.includes('types'));
    
    // Calculate modularity score based on clear separation
    const separationCount = [hasConfigModule, hasLighthouseModule, hasReportModule, hasTypesModule]
      .filter(Boolean).length;
    
    const modularity = separationCount / 4; // 4 expected modules
    
    return {
      hasConfigModule,
      hasLighthouseModule,
      hasReportModule,
      hasTypesModule,
      modularity
    };
  } catch (error) {
    return {
      hasConfigModule: false,
      hasLighthouseModule: false,
      hasReportModule: false,
      hasTypesModule: false,
      modularity: 0
    };
  }
}

describe('Maintainability Metrics', () => {
  describe('Cyclomatic Complexity', () => {
    it('should have low cyclomatic complexity in simplified version', () => {
      const originalMetrics = analyzeCodeOrganization('./src');
      const simplifiedMetrics = analyzeCodeOrganization('./src-simplified');
      
      console.log(`Original average complexity: ${originalMetrics.averageComplexity}`);
      console.log(`Original max complexity: ${originalMetrics.maxComplexity}`);
      console.log(`Simplified average complexity: ${simplifiedMetrics.averageComplexity}`);
      console.log(`Simplified max complexity: ${simplifiedMetrics.maxComplexity}`);
      
      // Simplified version should have lower complexity
      expect(simplifiedMetrics.averageComplexity).toBeLessThan(originalMetrics.averageComplexity);
      
      // No single file should be extremely complex (threshold: 80, down from 1733)
      expect(simplifiedMetrics.maxComplexity).toBeLessThan(80);
      
      // Average complexity should be reasonable (threshold: 40, down from 75)
      expect(simplifiedMetrics.averageComplexity).toBeLessThan(40);
    });
  });

  describe('Code Organization', () => {
    it('should have clear separation of concerns', () => {
      const separation = checkSeparationOfConcerns('./src-simplified');
      
      console.log(`Has config module: ${separation.hasConfigModule}`);
      console.log(`Has lighthouse module: ${separation.hasLighthouseModule}`);
      console.log(`Has report module: ${separation.hasReportModule}`);
      console.log(`Has types module: ${separation.hasTypesModule}`);
      console.log(`Modularity score: ${separation.modularity}`);
      
      // Should have clear separation of concerns
      expect(separation.hasConfigModule).toBe(true);
      expect(separation.hasLighthouseModule).toBe(true);
      expect(separation.hasReportModule).toBe(true);
      expect(separation.hasTypesModule).toBe(true);
      
      // High modularity score
      expect(separation.modularity).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('File Size Distribution', () => {
    it('should have reasonable file sizes', () => {
      const originalMetrics = analyzeCodeOrganization('./src');
      const simplifiedMetrics = analyzeCodeOrganization('./src-simplified');
      
      console.log(`Original average file size: ${originalMetrics.averageFileSize} lines`);
      console.log(`Original max file size: ${originalMetrics.maxFileSize} lines`);
      console.log(`Simplified average file size: ${simplifiedMetrics.averageFileSize} lines`);
      console.log(`Simplified max file size: ${simplifiedMetrics.maxFileSize} lines`);
      
      // Simplified version should have smaller average file size
      expect(simplifiedMetrics.averageFileSize).toBeLessThan(originalMetrics.averageFileSize);
      
      // No single file should be too large (threshold: 300 lines)
      expect(simplifiedMetrics.maxFileSize).toBeLessThan(300);
      
      // Average file size should be reasonable (threshold: 200 lines)
      expect(simplifiedMetrics.averageFileSize).toBeLessThan(200);
    });
  });

  describe('Maintainability Summary', () => {
    it('should demonstrate improved maintainability', () => {
      const originalMetrics = analyzeCodeOrganization('./src');
      const simplifiedMetrics = analyzeCodeOrganization('./src-simplified');
      const separation = checkSeparationOfConcerns('./src-simplified');
      
      const complexityImprovement = ((originalMetrics.averageComplexity - simplifiedMetrics.averageComplexity) / originalMetrics.averageComplexity * 100).toFixed(1);
      const fileSizeImprovement = ((originalMetrics.averageFileSize - simplifiedMetrics.averageFileSize) / originalMetrics.averageFileSize * 100).toFixed(1);
      
      console.log('\n=== MAINTAINABILITY IMPROVEMENTS ===');
      console.log(`File Count: ${originalMetrics.totalFiles} → ${simplifiedMetrics.totalFiles}`);
      console.log(`Average Complexity: ${originalMetrics.averageComplexity} → ${simplifiedMetrics.averageComplexity} (${complexityImprovement}% improvement)`);
      console.log(`Average File Size: ${originalMetrics.averageFileSize} → ${simplifiedMetrics.averageFileSize} lines (${fileSizeImprovement}% improvement)`);
      console.log(`Max Complexity: ${originalMetrics.maxComplexity} → ${simplifiedMetrics.maxComplexity}`);
      console.log(`Modularity Score: ${separation.modularity}/1.0`);
      console.log(`Separation of Concerns: ${separation.modularity >= 0.8 ? '✅' : '❌'} Well organized`);
      console.log(`Complexity Target: ${simplifiedMetrics.averageComplexity < 40 ? '✅' : '❌'} < 40 average`);
      console.log(`File Size Target: ${simplifiedMetrics.averageFileSize < 200 ? '✅' : '❌'} < 200 lines average`);
      console.log('=====================================\n');
      
      // All maintainability targets should be met
      expect(separation.modularity).toBeGreaterThanOrEqual(0.8);
      expect(simplifiedMetrics.averageComplexity).toBeLessThan(40);
      expect(simplifiedMetrics.averageFileSize).toBeLessThan(200);
      expect(simplifiedMetrics.maxComplexity).toBeLessThan(80);
    });
  });
});