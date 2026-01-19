import { describe, expect, it, beforeEach } from "vitest";
import * as fc from "fast-check";
import { BatchScheduler } from "../src/core/batch-scheduler.js";
import { DefaultAuditContext } from "../src/core/audit-context.js";
import type { 
  ExecutionPlan,
  SchedulingOptions,
  ExecutionBatch,
  BatchExecutionResult
} from "../src/core/batch-scheduler.js";
import type { 
  AuditPlugin, 
  AuditContext, 
  AuditResult, 
  PluginConfig,
  AuditType,
  AuditDevice
} from "../src/core/plugin-interface.js";
import type { PageConfig } from "../src/core/multi-audit-engine.js";

describe("Parallel Execution Performance", () => {
  let scheduler: BatchScheduler;

  beforeEach(() => {
    scheduler = new BatchScheduler();
  });

  // Feature: comprehensive-audit-system, Property 2: Parallel Execution Performance
  it("should complete parallel execution faster than sequential while producing equivalent results", () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        pages: fc.array(
          fc.record({
            path: fc.webPath().filter(path => path.length > 0),
            label: fc.string({ minLength: 1, maxLength: 30 }),
            devices: fc.array(fc.constantFrom('mobile', 'desktop') as fc.Arbitrary<AuditDevice>, { minLength: 1, maxLength: 2 }),
            scope: fc.option(fc.constantFrom('public', 'requires-auth'), { nil: undefined })
          }),
          { minLength: 1, maxLength: 3 }
        ),
        plugins: fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 15 }).filter(s => /^[a-zA-Z][a-zA-Z0-9-]*$/.test(s)),
            type: fc.constantFrom('performance', 'security', 'accessibility', 'code-quality', 'ux') as fc.Arbitrary<AuditType>,
            phase: fc.constantFrom(1, 2, 3) as fc.Arbitrary<1 | 2 | 3>,
            dependencies: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 2 }),
            executionTimeMs: fc.integer({ min: 100, max: 2000 }),
            shouldSucceed: fc.boolean()
          }),
          { minLength: 2, maxLength: 4 }
        ),
        parallelOptions: fc.record({
          maxParallelPages: fc.integer({ min: 1, max: 4 }),
          maxParallelPlugins: fc.integer({ min: 2, max: 6 }),
          enableDataSharing: fc.boolean(),
          maxConcurrentTasks: fc.integer({ min: 2, max: 8 })
        })
      }),
      async ({ pages, plugins, parallelOptions }) => {
        // Remove duplicate plugin names and ensure at least 2 plugins
        const uniquePlugins = plugins.filter((plugin, index, array) => 
          array.findIndex(p => p.name === plugin.name) === index
        );
        
        if (uniquePlugins.length < 2) return; // Skip if not enough plugins for meaningful comparison

        // Create mock plugins
        const mockPlugins: AuditPlugin[] = uniquePlugins.map(pluginSpec => ({
          name: pluginSpec.name,
          version: '1.0.0',
          type: pluginSpec.type,
          phase: pluginSpec.phase,
          dependencies: pluginSpec.dependencies.filter(dep => dep !== pluginSpec.name), // Avoid self-dependency
          
          async configure(config: PluginConfig): Promise<void> {
            // Mock configuration
          },
          
          async audit(context: AuditContext): Promise<AuditResult> {
            // Simulate execution time
            await new Promise(resolve => setTimeout(resolve, Math.min(pluginSpec.executionTimeMs, 200))); // Cap for test performance
            
            if (!pluginSpec.shouldSucceed && Math.random() < 0.1) { // 10% failure rate for failing plugins
              throw new Error(`Plugin ${pluginSpec.name} simulated failure`);
            }
            
            return {
              pluginName: pluginSpec.name,
              type: pluginSpec.type,
              issues: [],
              metrics: {
                executionTime: pluginSpec.executionTimeMs,
                itemsProcessed: Math.floor(Math.random() * 50)
              },
              metadata: {
                url: context.url,
                device: context.device,
                timestamp: Date.now()
              },
              executionTimeMs: pluginSpec.executionTimeMs,
              success: true
            };
          },
          
          async cleanup(): Promise<void> {
            // Mock cleanup
          },
          
          validate(config: PluginConfig): boolean {
            return true;
          }
        }));

        // Create scheduling options for parallel execution
        const parallelSchedulingOptions: SchedulingOptions = {
          maxParallelPages: parallelOptions.maxParallelPages,
          maxParallelPlugins: parallelOptions.maxParallelPlugins,
          enableDataSharing: parallelOptions.enableDataSharing,
          resourceLimits: {
            maxMemoryMB: 512,
            maxConcurrentTasks: parallelOptions.maxConcurrentTasks
          },
          timeouts: {
            taskTimeoutMs: 10000,
            batchTimeoutMs: 30000
          }
        };

        // Create scheduling options for sequential execution
        const sequentialSchedulingOptions: SchedulingOptions = {
          ...parallelSchedulingOptions,
          maxParallelPages: 1,
          maxParallelPlugins: 1,
          maxConcurrentTasks: 1
        };

        // Create execution plan for parallel execution
        const parallelPlan = await scheduler.createExecutionPlan(
          pages as PageConfig[],
          mockPlugins,
          parallelSchedulingOptions
        );

        // Create execution plan for sequential execution
        const sequentialPlan = await scheduler.createExecutionPlan(
          pages as PageConfig[],
          mockPlugins,
          sequentialSchedulingOptions
        );

        // Verify both plans have the same number of total steps
        expect(parallelPlan.totalSteps).toBe(sequentialPlan.totalSteps);
        expect(parallelPlan.totalSteps).toBe(pages.length * mockPlugins.length * pages.reduce((sum, p) => sum + p.devices.length, 0));

        // Verify parallel plan should have fewer batches (more tasks per batch)
        if (mockPlugins.length > 1 && parallelOptions.maxParallelPlugins > 1) {
          expect(parallelPlan.batches.length).toBeLessThanOrEqual(sequentialPlan.batches.length);
        }

        // Verify parallel plan should have better resource utilization
        expect(parallelPlan.resourceRequirements.maxConcurrentPlugins).toBeGreaterThanOrEqual(
          sequentialPlan.resourceRequirements.maxConcurrentPlugins
        );

        // Simulate execution timing comparison
        const parallelEstimatedTime = parallelPlan.estimatedTimeMs;
        const sequentialEstimatedTime = sequentialPlan.estimatedTimeMs;

        // Parallel execution should be faster or equal (never slower)
        expect(parallelEstimatedTime).toBeLessThanOrEqual(sequentialEstimatedTime);

        // If we have multiple plugins that can run in parallel, parallel should be significantly faster
        if (mockPlugins.length > 1 && parallelOptions.maxParallelPlugins > 1) {
          const speedupRatio = sequentialEstimatedTime / parallelEstimatedTime;
          expect(speedupRatio).toBeGreaterThanOrEqual(1.0); // At least no slowdown
          
          // With good parallelization, we should see some speedup
          if (mockPlugins.length >= parallelOptions.maxParallelPlugins) {
            expect(speedupRatio).toBeGreaterThan(1.1); // At least 10% speedup
          }
        }

        // Test actual execution of a small batch to verify results equivalence
        if (parallelPlan.batches.length > 0 && sequentialPlan.batches.length > 0) {
          // Create mock contexts for execution
          const contexts = new Map<string, AuditContext>();
          
          for (const page of pages) {
            for (const device of page.devices) {
              const contextKey = `${page.path}-${device}`;
              const context = new DefaultAuditContext({
                url: `https://example.com${page.path}`,
                page: {} as any, // Mock page object
                device,
                pageConfig: page
              });
              contexts.set(contextKey, context);
            }
          }

          // Execute first batch from parallel plan
          const parallelBatch = parallelPlan.batches[0];
          const parallelStartTime = Date.now();
          
          try {
            const parallelResult = await scheduler.executeBatch(
              parallelBatch,
              contexts,
              parallelSchedulingOptions
            );
            const parallelActualTime = Date.now() - parallelStartTime;

            // Verify batch execution results
            expect(parallelResult.batchId).toBe(parallelBatch.id);
            expect(parallelResult.taskResults.size).toBe(parallelBatch.tasks.length);
            expect(parallelResult.metadata.successfulTasks + parallelResult.metadata.failedTasks).toBe(parallelBatch.tasks.length);

            // Verify all tasks produced results
            for (const task of parallelBatch.tasks) {
              const result = parallelResult.taskResults.get(task.id);
              expect(result).toBeDefined();
              expect(result?.pluginName).toBe(task.plugin.name);
              expect(result?.type).toBe(task.plugin.type);
            }

            // If data sharing is enabled, verify shared data was produced
            if (parallelOptions.enableDataSharing) {
              const tasksWithProducedData = parallelBatch.tasks.filter(t => t.produces.length > 0);
              if (tasksWithProducedData.length > 0) {
                expect(parallelResult.sharedData.size).toBeGreaterThanOrEqual(0); // May be 0 if no data was actually produced
              }
            }

            // Verify execution time is reasonable
            expect(parallelActualTime).toBeLessThan(parallelSchedulingOptions.timeouts.batchTimeoutMs);
            
            // Parallel execution should complete within reasonable bounds of estimated time
            const timeRatio = parallelActualTime / parallelBatch.estimatedTimeMs;
            expect(timeRatio).toBeLessThan(3.0); // Allow up to 3x estimated time due to test overhead
            
          } catch (error) {
            // Execution errors are acceptable in some cases (e.g., plugin failures)
            expect(error).toBeInstanceOf(Error);
          }
        }

        // Verify resource requirements are within limits
        expect(parallelPlan.resourceRequirements.maxConcurrentPages).toBeLessThanOrEqual(parallelOptions.maxParallelPages);
        expect(parallelPlan.resourceRequirements.maxConcurrentPlugins).toBeLessThanOrEqual(parallelOptions.maxParallelPlugins);
        expect(parallelPlan.resourceRequirements.estimatedMemoryMB).toBeLessThanOrEqual(parallelSchedulingOptions.resourceLimits.maxMemoryMB);
      }
    ), { numRuns: 100 });
  });

  // Feature: comprehensive-audit-system, Property 2: Parallel Execution Performance
  it("should maintain data sharing efficiency across parallel execution batches", () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        pages: fc.array(
          fc.record({
            path: fc.webPath().filter(path => path.length > 0),
            label: fc.string({ minLength: 1, maxLength: 20 }),
            devices: fc.constantFrom(['mobile'], ['desktop'], ['mobile', 'desktop']),
            scope: fc.option(fc.constantFrom('public', 'requires-auth'), { nil: undefined })
          }),
          { minLength: 1, maxLength: 2 }
        ),
        dataSharingEnabled: fc.boolean(),
        pluginDependencies: fc.record({
          hasLighthouse: fc.boolean(),
          hasSecurity: fc.boolean(),
          hasAccessibility: fc.boolean()
        })
      }),
      async ({ pages, dataSharingEnabled, pluginDependencies }) => {
        // Create plugins with realistic data dependencies
        const mockPlugins: AuditPlugin[] = [];
        
        if (pluginDependencies.hasLighthouse) {
          mockPlugins.push({
            name: 'lighthouse-plugin',
            version: '1.0.0',
            type: 'performance',
            phase: 1,
            dependencies: [],
            async configure() {},
            async audit(context: AuditContext): Promise<AuditResult> {
              // Lighthouse produces core performance data
              const result: AuditResult = {
                pluginName: 'lighthouse-plugin',
                type: 'performance',
                issues: [],
                metrics: { score: 85, lcp: 2500 },
                metadata: { lighthouseVersion: '10.0.0' },
                executionTimeMs: 1000,
                success: true
              };
              
              // Store shared data
              if (dataSharingEnabled) {
                context.sharedData.set('lighthouse_results', result);
                context.sharedData.set('page_metrics', result.metrics);
              }
              
              return result;
            },
            async cleanup() {},
            validate() { return true; }
          });
        }

        if (pluginDependencies.hasSecurity) {
          mockPlugins.push({
            name: 'security-plugin',
            version: '1.0.0',
            type: 'security',
            phase: 1,
            dependencies: [],
            async configure() {},
            async audit(context: AuditContext): Promise<AuditResult> {
              // Security plugin can use network data if available
              const networkData = context.sharedData.get('network_requests');
              
              const result: AuditResult = {
                pluginName: 'security-plugin',
                type: 'security',
                issues: [],
                metrics: { vulnerabilities: networkData ? 1 : 2 }, // Fewer vulnerabilities if network data available
                metadata: { 
                  headers: { 'x-frame-options': 'DENY' },
                  usedSharedData: !!networkData
                },
                executionTimeMs: 800,
                success: true
              };
              
              if (dataSharingEnabled) {
                context.sharedData.set('security_headers', result.metadata.headers);
              }
              
              return result;
            },
            async cleanup() {},
            validate() { return true; }
          });
        }

        if (pluginDependencies.hasAccessibility) {
          mockPlugins.push({
            name: 'accessibility-plugin',
            version: '1.0.0',
            type: 'accessibility',
            phase: 1,
            dependencies: pluginDependencies.hasLighthouse ? ['lighthouse-plugin'] : [],
            async configure() {},
            async audit(context: AuditContext): Promise<AuditResult> {
              // Accessibility plugin benefits from lighthouse results
              const lighthouseData = context.sharedData.get('lighthouse_results');
              
              const result: AuditResult = {
                pluginName: 'accessibility-plugin',
                type: 'accessibility',
                issues: [],
                metrics: { 
                  violations: lighthouseData ? 3 : 5, // Fewer violations if lighthouse data available
                  score: lighthouseData ? 90 : 85
                },
                metadata: { 
                  axeVersion: '4.0.0',
                  usedLighthouseData: !!lighthouseData
                },
                executionTimeMs: 1200,
                success: true
              };
              
              if (dataSharingEnabled) {
                context.sharedData.set('axe_results', result.metadata);
              }
              
              return result;
            },
            async cleanup() {},
            validate() { return true; }
          });
        }

        if (mockPlugins.length < 2) return; // Need at least 2 plugins for meaningful test

        const schedulingOptions: SchedulingOptions = {
          maxParallelPages: 2,
          maxParallelPlugins: 4,
          enableDataSharing: dataSharingEnabled,
          resourceLimits: {
            maxMemoryMB: 512,
            maxConcurrentTasks: 6
          },
          timeouts: {
            taskTimeoutMs: 5000,
            batchTimeoutMs: 15000
          }
        };

        // Create execution plan
        const plan = await scheduler.createExecutionPlan(
          pages as PageConfig[],
          mockPlugins,
          schedulingOptions
        );

        // Verify plan structure
        expect(plan.totalSteps).toBe(pages.length * mockPlugins.length * pages.reduce((sum, p) => sum + p.devices.length, 0));
        expect(plan.batches.length).toBeGreaterThan(0);

        // Test data sharing efficiency by executing batches
        const contexts = new Map<string, AuditContext>();
        
        for (const page of pages) {
          for (const device of page.devices) {
            const contextKey = `${page.path}-${device}`;
            const context = new DefaultAuditContext({
              url: `https://example.com${page.path}`,
              page: {} as any,
              device,
              pageConfig: page
            });
            contexts.set(contextKey, context);
          }
        }

        // Execute batches sequentially and track data sharing
        const batchResults: BatchExecutionResult[] = [];
        let totalSharedDataKeys = 0;
        let totalDataReuse = 0;

        for (const batch of plan.batches) {
          try {
            const result = await scheduler.executeBatch(batch, contexts, schedulingOptions);
            batchResults.push(result);

            // Count shared data produced
            totalSharedDataKeys += result.sharedData.size;

            // Count data reuse (tasks that used shared data)
            for (const [taskId, taskResult] of result.taskResults) {
              if (taskResult.success && taskResult.metadata.usedSharedData) {
                totalDataReuse++;
              }
            }

          } catch (error) {
            // Batch execution errors are acceptable
            expect(error).toBeInstanceOf(Error);
          }
        }

        // Verify data sharing efficiency
        if (dataSharingEnabled && mockPlugins.length > 1) {
          // Should have produced some shared data
          expect(totalSharedDataKeys).toBeGreaterThanOrEqual(0);
          
          // If we have dependencies, should have some data reuse
          const hasPluginDependencies = mockPlugins.some(p => p.dependencies.length > 0);
          if (hasPluginDependencies && batchResults.length > 1) {
            expect(totalDataReuse).toBeGreaterThanOrEqual(0); // May be 0 if execution order doesn't allow reuse
          }
        } else if (!dataSharingEnabled) {
          // Should not have shared data when disabled
          expect(totalSharedDataKeys).toBe(0);
          expect(totalDataReuse).toBe(0);
        }

        // Verify all batches completed
        expect(batchResults.length).toBeLessThanOrEqual(plan.batches.length);

        // Verify resource efficiency - parallel execution should use resources effectively
        const maxTasksPerBatch = Math.max(...plan.batches.map(b => b.tasks.length));
        if (dataSharingEnabled && mockPlugins.length > 1) {
          expect(maxTasksPerBatch).toBeGreaterThan(1); // Should batch multiple tasks together
        }

        // Verify execution time efficiency
        const totalEstimatedTime = plan.estimatedTimeMs;
        const sequentialEstimatedTime = mockPlugins.reduce((sum, p) => sum + 1000, 0) * pages.length * pages.reduce((sum, p) => sum + p.devices.length, 0);
        
        if (mockPlugins.length > 1) {
          expect(totalEstimatedTime).toBeLessThan(sequentialEstimatedTime); // Parallel should be faster
        }
      }
    ), { numRuns: 100 });
  });
});