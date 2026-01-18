import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { ActionableRecommendationGenerator } from "../src/reporting/generators/actionable-recommendation-generator.js";
import { CodeExampleTemplates } from "../src/reporting/generators/code-example-templates.js";
import type { PageDeviceSummary, OpportunitySummary } from "../src/core/types.js";

describe("Actionable Recommendations", () => {
  // Feature: signaler-reporting-improvements, Property 10: Actionable Fix Guidance
  it("should generate framework-specific code examples for all issue types", () => {
    fc.assert(fc.property(
      fc.record({
        pages: fc.array(fc.record({
          label: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          path: fc.string({ minLength: 1, maxLength: 50 }).map(s => `/${s.replace(/\s+/g, '-')}`),
          url: fc.webUrl(),
          device: fc.constantFrom('desktop', 'mobile'),
          scores: fc.record({
            performance: fc.option(fc.integer({ min: 0, max: 100 })),
            accessibility: fc.option(fc.integer({ min: 0, max: 100 })),
            bestPractices: fc.option(fc.integer({ min: 0, max: 100 })),
            seo: fc.option(fc.integer({ min: 0, max: 100 }))
          }),
          metrics: fc.record({
            lcpMs: fc.option(fc.integer({ min: 0, max: 10000 })),
            fcpMs: fc.option(fc.integer({ min: 0, max: 5000 })),
            tbtMs: fc.option(fc.integer({ min: 0, max: 2000 })),
            cls: fc.option(fc.float({ min: 0, max: 1 })),
            inpMs: fc.option(fc.integer({ min: 0, max: 1000 }))
          }),
          opportunities: fc.array(fc.record({
            id: fc.constantFrom(
              'unused-javascript',
              'render-blocking-resources',
              'unoptimized-images',
              'modern-image-formats',
              'unused-css-rules',
              'server-response-time',
              'uses-text-compression'
            ),
            title: fc.string({ minLength: 1 }),
            estimatedSavingsMs: fc.option(fc.integer({ min: 100, max: 5000 })),
            estimatedSavingsBytes: fc.option(fc.integer({ min: 1000, max: 1000000 }))
          }), { minLength: 1, maxLength: 3 })
        }), { minLength: 1, maxLength: 5 }),
        framework: fc.constantFrom('nextjs', 'react', 'vue', 'angular', 'generic')
      }),
      (testData) => {
        const generator = new ActionableRecommendationGenerator();
        const context = { framework: testData.framework };
        
        const recommendations = generator.generateRecommendations(
          testData.pages as PageDeviceSummary[],
          context
        );

        // Verify all recommendations have required properties
        for (const recommendation of recommendations) {
          expect(recommendation.issueId).toBeDefined();
          expect(recommendation.title).toBeDefined();
          expect(recommendation.description).toBeDefined();
          expect(recommendation.severity).toMatch(/^(critical|high|medium|low)$/);
          expect(recommendation.category).toMatch(/^(javascript|css|images|caching|network|accessibility)$/);
          
          // Verify implementation details
          expect(recommendation.implementation.difficulty).toMatch(/^(easy|medium|hard)$/);
          expect(recommendation.implementation.estimatedTimeMinutes).toBeGreaterThan(0);
          expect(recommendation.implementation.steps).toBeDefined();
          expect(recommendation.implementation.steps.length).toBeGreaterThan(0);
          expect(recommendation.implementation.documentation).toBeDefined();
          expect(recommendation.implementation.documentation.length).toBeGreaterThan(0);
          
          // Verify impact metrics
          expect(recommendation.impact.affectedPages).toBeGreaterThan(0);
          expect(recommendation.impact.performanceGainMs).toBeGreaterThanOrEqual(0);
          expect(recommendation.impact.byteSavings).toBeGreaterThanOrEqual(0);
          
          // Framework-specific recommendations should have code examples
          if (testData.framework === 'nextjs' || testData.framework === 'react') {
            if (['unused-javascript', 'render-blocking-resources', 'unoptimized-images'].includes(recommendation.issueId)) {
              expect(recommendation.implementation.codeExample).toBeDefined();
              expect(recommendation.implementation.codeExample!.length).toBeGreaterThan(0);
            }
          }
        }

        // Verify recommendations are sorted by impact (highest first)
        for (let i = 1; i < recommendations.length; i++) {
          const prevImpact = (recommendations[i-1].impact.performanceGainMs || 0) * recommendations[i-1].impact.affectedPages;
          const currentImpact = (recommendations[i].impact.performanceGainMs || 0) * recommendations[i].impact.affectedPages;
          expect(prevImpact).toBeGreaterThanOrEqual(currentImpact);
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 10: Actionable Fix Guidance
  it("should provide implementation difficulty estimation for all recommendations", () => {
    fc.assert(fc.property(
      fc.record({
        opportunities: fc.array(fc.record({
          id: fc.constantFrom(
            'unused-javascript',
            'render-blocking-resources',
            'server-response-time',
            'uses-text-compression'
          ),
          title: fc.string({ minLength: 1 }),
          estimatedSavingsMs: fc.integer({ min: 100, max: 5000 }),
          estimatedSavingsBytes: fc.integer({ min: 1000, max: 1000000 })
        }), { minLength: 1, maxLength: 5 }),
        framework: fc.constantFrom('nextjs', 'react', 'generic')
      }),
      (testData) => {
        const generator = new ActionableRecommendationGenerator();
        
        // Create mock page data
        const pages: PageDeviceSummary[] = [{
          label: 'Test Page',
          path: '/test',
          url: 'https://example.com/test',
          device: 'desktop',
          scores: { performance: 50 },
          metrics: { lcpMs: 3000 },
          opportunities: testData.opportunities as OpportunitySummary[]
        }];

        const recommendations = generator.generateRecommendations(pages, { framework: testData.framework });

        for (const recommendation of recommendations) {
          // Verify difficulty estimation is appropriate for issue type
          switch (recommendation.issueId) {
            case 'unused-javascript':
              if (testData.framework === 'nextjs') {
                expect(recommendation.implementation.difficulty).toBe('easy');
                expect(recommendation.implementation.estimatedTimeMinutes).toBeLessThanOrEqual(60);
              } else {
                expect(recommendation.implementation.difficulty).toBe('medium');
              }
              break;
              
            case 'server-response-time':
              expect(recommendation.implementation.difficulty).toBe('hard');
              expect(recommendation.implementation.estimatedTimeMinutes).toBeGreaterThanOrEqual(60);
              break;
              
            case 'uses-text-compression':
              expect(recommendation.implementation.difficulty).toBe('easy');
              expect(recommendation.implementation.estimatedTimeMinutes).toBeLessThanOrEqual(30);
              break;
          }
          
          // Verify time estimation is reasonable
          expect(recommendation.implementation.estimatedTimeMinutes).toBeGreaterThan(0);
          expect(recommendation.implementation.estimatedTimeMinutes).toBeLessThanOrEqual(240); // Max 4 hours
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 10: Actionable Fix Guidance
  it("should include relevant documentation links for all recommendations", () => {
    fc.assert(fc.property(
      fc.array(fc.constantFrom(
        'unused-javascript',
        'render-blocking-resources',
        'unoptimized-images',
        'unused-css-rules',
        'server-response-time',
        'uses-text-compression'
      ), { minLength: 1, maxLength: 6 }),
      (issueIds) => {
        const generator = new ActionableRecommendationGenerator();
        
        // Create opportunities for each issue type
        const opportunities = issueIds.map(id => ({
          id,
          title: `Test ${id}`,
          estimatedSavingsMs: 1000,
          estimatedSavingsBytes: 50000
        }));

        const pages: PageDeviceSummary[] = [{
          label: 'Test Page',
          path: '/test',
          url: 'https://example.com/test',
          device: 'desktop',
          scores: { performance: 50 },
          metrics: { lcpMs: 3000 },
          opportunities: opportunities as OpportunitySummary[]
        }];

        const recommendations = generator.generateRecommendations(pages);

        for (const recommendation of recommendations) {
          // Verify documentation links are provided
          expect(recommendation.implementation.documentation).toBeDefined();
          expect(recommendation.implementation.documentation.length).toBeGreaterThan(0);
          
          // Verify all documentation links are valid URLs
          for (const docLink of recommendation.implementation.documentation) {
            expect(docLink).toMatch(/^https?:\/\/.+/);
          }
          
          // Verify framework-specific documentation
          if (recommendation.framework === 'nextjs') {
            const hasNextJSDoc = recommendation.implementation.documentation.some(
              link => link.includes('nextjs.org')
            );
            if (['unused-javascript', 'unoptimized-images', 'render-blocking-resources'].includes(recommendation.issueId)) {
              expect(hasNextJSDoc).toBe(true);
            }
          }
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 10: Actionable Fix Guidance
  it("code example templates should provide valid framework-specific examples", () => {
    fc.assert(fc.property(
      fc.record({
        framework: fc.constantFrom('nextjs', 'react', 'vue', 'angular', 'generic'),
        category: fc.constantFrom('dynamic-import', 'code-splitting', 'image-optimization', 'cache-control', 'compression')
      }),
      (testData) => {
        const templates = new CodeExampleTemplates();
        const frameworkTemplates = templates.getTemplatesByFramework(testData.framework);
        const categoryTemplates = templates.getTemplatesByCategory(testData.category);

        // Verify framework templates (only if any exist for this framework)
        if (frameworkTemplates.length > 0) {
          for (const template of frameworkTemplates) {
            expect(template.framework).toMatch(/^(nextjs|react|vue|angular|generic)$/);
            expect(template.category).toMatch(/^(dynamic-import|code-splitting|image-optimization|cache-control|compression)$/);
            expect(template.title).toBeDefined();
            expect(template.description).toBeDefined();
            expect(template.after).toBeDefined();
            expect(template.after.length).toBeGreaterThan(0);
          
            // Verify code examples contain framework-specific syntax
            if (template.framework === 'nextjs') {
              if (template.category === 'dynamic-import') {
                expect(template.after).toContain('next/dynamic');
              }
              if (template.category === 'image-optimization') {
                expect(template.after).toContain('next/image');
              }
            }
            
            if (template.framework === 'react') {
              if (template.category === 'dynamic-import') {
                expect(template.after).toMatch(/lazy\(|React\.lazy/);
                expect(template.after).toContain('Suspense');
              }
            }
          }
        }

        // Verify category templates (only if any exist for this category)
        if (categoryTemplates.length > 0) {
          for (const template of categoryTemplates) {
            expect(template.category).toBe(testData.category);
            
            // Verify category-specific content
            switch (testData.category) {
              case 'dynamic-import':
                expect(template.after).toMatch(/(import\(|lazy\(|dynamic\()/);
                break;
              case 'image-optimization':
                expect(template.after).toMatch(/(Image|img|picture|srcset)/);
                break;
              case 'cache-control':
                expect(template.after).toMatch(/(Cache-Control|cache|redis|etag)/i);
                break;
              case 'compression':
                expect(template.after).toMatch(/(gzip|brotli|compression)/i);
                break;
            }
          }
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 10: Actionable Fix Guidance
  it("should create step-by-step fix instructions for all issue types", () => {
    fc.assert(fc.property(
      fc.constantFrom(
        'unused-javascript',
        'render-blocking-resources',
        'unoptimized-images',
        'unused-css-rules',
        'server-response-time',
        'uses-text-compression'
      ),
      (issueId) => {
        const generator = new ActionableRecommendationGenerator();
        
        const pages: PageDeviceSummary[] = [{
          label: 'Test Page',
          path: '/test',
          url: 'https://example.com/test',
          device: 'desktop',
          scores: { performance: 50 },
          metrics: { lcpMs: 3000 },
          opportunities: [{
            id: issueId,
            title: `Test ${issueId}`,
            estimatedSavingsMs: 1000,
            estimatedSavingsBytes: 50000
          }] as OpportunitySummary[]
        }];

        const recommendations = generator.generateRecommendations(pages);
        const recommendation = recommendations.find(r => r.issueId === issueId);
        
        // The recommendation should exist for known issue types
        if (recommendation) {
          expect(recommendation.implementation.steps).toBeDefined();
          expect(recommendation.implementation.steps.length).toBeGreaterThanOrEqual(3);
          
          // Verify steps are actionable and specific
          for (const step of recommendation.implementation.steps) {
            expect(step.length).toBeGreaterThan(10); // Not just single words
            expect(step).toMatch(/^[A-Z]/); // Starts with capital letter
          }
          
          // Verify issue-specific steps
          switch (issueId) {
            case 'unused-javascript':
              expect(recommendation.implementation.steps.some(step => 
                step.toLowerCase().includes('dynamic import') || 
                step.toLowerCase().includes('code splitting')
              )).toBe(true);
              break;
              
            case 'unoptimized-images':
              expect(recommendation.implementation.steps.some(step => 
                step.toLowerCase().includes('image') && 
                (step.toLowerCase().includes('optimize') || step.toLowerCase().includes('format'))
              )).toBe(true);
              break;
              
            case 'server-response-time':
              expect(recommendation.implementation.steps.some(step => 
                step.toLowerCase().includes('server') || 
                step.toLowerCase().includes('database') ||
                step.toLowerCase().includes('cache')
              )).toBe(true);
              break;
          }
        } else {
          // If no specific recommendation exists, verify a generic one was created
          expect(recommendations.length).toBeGreaterThan(0);
        }
      }
    ), { numRuns: 100 });
  });
});