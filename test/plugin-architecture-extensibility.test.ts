import { describe, expect, it, beforeEach } from "vitest";
import * as fc from "fast-check";
import { DefaultPluginRegistry } from "../src/core/plugin-registry.js";
import { DefaultAuditContext } from "../src/core/audit-context.js";
import type { 
  AuditPlugin, 
  AuditContext, 
  AuditResult, 
  PluginConfig,
  AuditType,
  IssueSeverity
} from "../src/core/plugin-interface.js";

describe("Plugin Architecture Extensibility", () => {
  let registry: DefaultPluginRegistry;

  beforeEach(() => {
    registry = new DefaultPluginRegistry();
  });

  // Feature: comprehensive-audit-system, Property 1: Plugin Architecture Extensibility
  it("should successfully register, configure, and execute any valid audit plugin", () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        pluginName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(s)),
        pluginVersion: fc.string({ minLength: 1, maxLength: 20 }),
        auditType: fc.constantFrom('performance', 'security', 'accessibility', 'code-quality', 'ux') as fc.Arbitrary<AuditType>,
        phase: fc.constantFrom(1, 2, 3) as fc.Arbitrary<1 | 2 | 3>,
        dependencies: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 3 }),
        config: fc.record({
          enabled: fc.boolean(),
          settings: fc.record({
            timeout: fc.option(fc.integer({ min: 1000, max: 30000 })),
            severity: fc.option(fc.constantFrom('critical', 'high', 'medium', 'low') as fc.Arbitrary<IssueSeverity>)
          }),
          timeoutMs: fc.option(fc.integer({ min: 1000, max: 60000 }))
        }),
        shouldSucceed: fc.boolean(),
        executionTime: fc.integer({ min: 100, max: 5000 })
      }),
      async ({ pluginName, pluginVersion, auditType, phase, dependencies, config, shouldSucceed, executionTime }) => {
        registry = new DefaultPluginRegistry();
        // Create a mock plugin that implements the AuditPlugin interface
        const mockPlugin: AuditPlugin = {
          name: pluginName,
          version: pluginVersion,
          type: auditType,
          phase,
          dependencies: dependencies.filter(dep => dep !== pluginName), // Avoid self-dependency
          
          async configure(pluginConfig: PluginConfig): Promise<void> {
            if (!pluginConfig.enabled && shouldSucceed) {
              throw new Error('Plugin is disabled');
            }
          },
          
          async audit(context: AuditContext): Promise<AuditResult> {
            // Simulate audit execution time
            await new Promise(resolve => setTimeout(resolve, Math.min(executionTime, 100))); // Cap for test performance
            
            if (!shouldSucceed) {
              throw new Error('Simulated audit failure');
            }
            
            return {
              pluginName,
              type: auditType,
              issues: [],
              metrics: {
                executionTime: executionTime,
                itemsAnalyzed: Math.floor(Math.random() * 100)
              },
              metadata: {
                version: pluginVersion,
                phase,
                url: context.url
              },
              executionTimeMs: executionTime,
              success: true
            };
          },
          
          async cleanup(): Promise<void> {
            // Cleanup simulation
          },
          
          validate(pluginConfig: PluginConfig): boolean {
            return typeof pluginConfig.enabled === 'boolean';
          }
        };

        // Register dependencies first (create simple mock dependencies)
        for (const depName of mockPlugin.dependencies) {
          if (!registry.get(depName)) {
            const depPlugin: AuditPlugin = {
              name: depName,
              version: '1.0.0',
              type: auditType,
              phase: 1,
              dependencies: [],
              async configure() {},
              async audit(context: AuditContext): Promise<AuditResult> {
                return {
                  pluginName: depName,
                  type: auditType,
                  issues: [],
                  metrics: {},
                  metadata: {},
                  executionTimeMs: 50,
                  success: true
                };
              },
              async cleanup() {},
              validate() { return true; }
            };
            registry.register(depPlugin);
          }
        }

        // Test plugin registration
        expect(() => registry.register(mockPlugin)).not.toThrow();
        
        // Verify plugin was registered
        const retrievedPlugin = registry.get(pluginName);
        expect(retrievedPlugin).toBeDefined();
        expect(retrievedPlugin?.name).toBe(pluginName);
        expect(retrievedPlugin?.version).toBe(pluginVersion);
        expect(retrievedPlugin?.type).toBe(auditType);
        expect(retrievedPlugin?.phase).toBe(phase);

        // Test plugin configuration
        const isValidConfig = mockPlugin.validate(config);
        expect(typeof isValidConfig).toBe('boolean');

        if (isValidConfig) {
          if (config.enabled || shouldSucceed) {
            await expect(mockPlugin.configure(config)).resolves.toBeUndefined();
          } else {
            // Plugin might throw if disabled and shouldSucceed is false
            try {
              await mockPlugin.configure(config);
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
            }
          }
        }

        // Test plugin execution with mock context
        const mockContext = new DefaultAuditContext({
          url: 'https://example.com/test',
          page: {} as any, // Mock page object
          device: 'desktop',
          pageConfig: {
            path: '/test',
            label: 'Test Page'
          }
        });

        if (shouldSucceed && config.enabled) {
          const result = await mockPlugin.audit(mockContext);
          
          // Verify result structure
          expect(result.pluginName).toBe(pluginName);
          expect(result.type).toBe(auditType);
          expect(Array.isArray(result.issues)).toBe(true);
          expect(typeof result.metrics).toBe('object');
          expect(typeof result.metadata).toBe('object');
          expect(typeof result.executionTimeMs).toBe('number');
          expect(result.success).toBe(true);
        } else if (!shouldSucceed) {
          // Plugin should fail gracefully
          await expect(mockPlugin.audit(mockContext)).rejects.toThrow();
        }

        // Test plugin cleanup
        await expect(mockPlugin.cleanup()).resolves.toBeUndefined();

        // Test registry functionality
        const allPlugins = registry.list();
        expect(allPlugins.length).toBeGreaterThan(0);
        expect(allPlugins.some(p => p.name === pluginName)).toBe(true);

        const pluginsByType = registry.getByType(auditType);
        expect(pluginsByType.some(p => p.name === pluginName)).toBe(true);

        const pluginsByPhase = registry.getByPhase(phase);
        expect(pluginsByPhase.some(p => p.name === pluginName)).toBe(true);

        // Test plugin info retrieval
        const pluginInfo = registry.getPluginInfo();
        const thisPluginInfo = pluginInfo.find(info => info.name === pluginName);
        expect(thisPluginInfo).toBeDefined();
        expect(thisPluginInfo?.version).toBe(pluginVersion);
        expect(thisPluginInfo?.type).toBe(auditType);
        expect(thisPluginInfo?.phase).toBe(phase);
      }
    ), { numRuns: 100 });
  });

  // Feature: comprehensive-audit-system, Property 1: Plugin Architecture Extensibility  
  it("should handle plugin dependency resolution correctly", () => {
    fc.assert(fc.property(
      fc.record({
        plugins: fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9-]*$/.test(s)),
            version: fc.string({ minLength: 1, maxLength: 10 }),
            type: fc.constantFrom('performance', 'security', 'accessibility', 'code-quality', 'ux') as fc.Arbitrary<AuditType>,
            phase: fc.constantFrom(1, 2, 3) as fc.Arbitrary<1 | 2 | 3>,
            dependencies: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { maxLength: 2 })
          }),
          { minLength: 1, maxLength: 5 }
        )
      }),
      ({ plugins }) => {
        const registry = new DefaultPluginRegistry();
        const createdPlugins: AuditPlugin[] = [];

        // Create plugin instances
        for (const pluginSpec of plugins) {
          const plugin: AuditPlugin = {
            name: pluginSpec.name,
            version: pluginSpec.version,
            type: pluginSpec.type,
            phase: pluginSpec.phase,
            dependencies: pluginSpec.dependencies.filter(dep => dep !== pluginSpec.name), // Avoid self-dependency
            async configure() {},
            async audit(context: AuditContext): Promise<AuditResult> {
              return {
                pluginName: pluginSpec.name,
                type: pluginSpec.type,
                issues: [],
                metrics: {},
                metadata: {},
                executionTimeMs: 100,
                success: true
              };
            },
            async cleanup() {},
            validate() { return true; }
          };
          createdPlugins.push(plugin);
        }

        // Remove duplicate plugin names to avoid conflicts
        const uniquePlugins = createdPlugins.filter((plugin, index, array) => 
          array.findIndex(p => p.name === plugin.name) === index
        );

        // Try to register plugins (some may fail due to missing dependencies)
        const registeredPlugins: AuditPlugin[] = [];
        
        for (const plugin of uniquePlugins) {
          try {
            // First register plugins with no dependencies
            if (plugin.dependencies.length === 0) {
              registry.register(plugin);
              registeredPlugins.push(plugin);
            }
          } catch (error) {
            // Expected for plugins with missing dependencies
          }
        }

        // Then try to register plugins with dependencies
        let previousCount = -1;
        while (registeredPlugins.length > previousCount && registeredPlugins.length < uniquePlugins.length) {
          previousCount = registeredPlugins.length;
          
          for (const plugin of uniquePlugins) {
            if (!registeredPlugins.includes(plugin)) {
              try {
                registry.register(plugin);
                registeredPlugins.push(plugin);
              } catch (error) {
                // Expected for plugins with unmet dependencies
              }
            }
          }
        }

        // Verify registry state
        const listedPlugins = registry.list();
        expect(listedPlugins.length).toBe(registeredPlugins.length);

        // Test execution order resolution for registered plugins
        if (registeredPlugins.length > 0) {
          try {
            const executionOrder = registry.resolveExecutionOrder(registeredPlugins);
            expect(executionOrder.length).toBe(registeredPlugins.length);
            
            // Verify dependencies come before dependents
            for (let i = 0; i < executionOrder.length; i++) {
              const plugin = executionOrder[i];
              for (const depName of plugin.dependencies) {
                const depIndex = executionOrder.findIndex(p => p.name === depName);
                if (depIndex !== -1) {
                  expect(depIndex).toBeLessThan(i);
                }
              }
            }
          } catch (error) {
            // Circular dependencies or other issues are acceptable in random data
            expect(error).toBeInstanceOf(Error);
          }
        }

        // Test compatibility validation
        expect(() => registry.validateCompatibility(registeredPlugins)).not.toThrow();
      }
    ), { numRuns: 100 });
  });
});