import { describe, expect, it, beforeEach } from "vitest";
import * as fc from "fast-check";
import { MultiAuditEngine } from "../src/core/multi-audit-engine.js";
import { DefaultPluginRegistry } from "../src/core/plugin-registry.js";
import type { 
  MultiAuditConfig, 
  PageConfig,
  AuditPlugin, 
  AuditContext, 
  AuditResult, 
  PluginConfig,
  AuditType,
  AuditDevice
} from "../src/core/multi-audit-engine.js";

describe("Configuration System Consistency", () => {
  let engine: MultiAuditEngine;
  let registry: DefaultPluginRegistry;

  beforeEach(() => {
    registry = new DefaultPluginRegistry();
    engine = new MultiAuditEngine(registry);
  });

  // Feature: comprehensive-audit-system, Property 3: Configuration System Consistency
  it("should distribute configuration parameters correctly to all enabled audit types", () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        baseUrl: fc.webUrl(),
        pages: fc.array(
          fc.record({
            path: fc.webPath().filter(path => path.length > 0), // Ensure non-empty path
            label: fc.string({ minLength: 1, maxLength: 50 }),
            devices: fc.array(fc.constantFrom('mobile', 'desktop') as fc.Arbitrary<AuditDevice>, { minLength: 1, maxLength: 2 }),
            scope: fc.option(fc.constantFrom('public', 'requires-auth'), { nil: undefined })
          }),
          { minLength: 1, maxLength: 3 }
        ),
        plugins: fc.record({
          'lighthouse-plugin': fc.record({
            enabled: fc.boolean(),
            settings: fc.record({
              timeout: fc.option(fc.integer({ min: 5000, max: 30000 })),
              throttling: fc.option(fc.constantFrom('simulate', 'devtools'))
            }),
            severityThresholds: fc.option(fc.record({
              performance: fc.option(fc.constantFrom('critical', 'high', 'medium', 'low')),
              accessibility: fc.option(fc.constantFrom('critical', 'high', 'medium', 'low'))
            })),
            timeoutMs: fc.option(fc.integer({ min: 10000, max: 60000 }))
          }),
          'security-plugin': fc.record({
            enabled: fc.boolean(),
            settings: fc.record({
              checkHeaders: fc.option(fc.boolean()),
              checkTLS: fc.option(fc.boolean()),
              severity: fc.option(fc.constantFrom('critical', 'high', 'medium', 'low'))
            }),
            timeoutMs: fc.option(fc.integer({ min: 5000, max: 30000 }))
          }),
          'accessibility-plugin': fc.record({
            enabled: fc.boolean(),
            settings: fc.record({
              wcagLevel: fc.option(fc.constantFrom('A', 'AA', 'AAA')),
              includeExperimental: fc.option(fc.boolean())
            }),
            timeoutMs: fc.option(fc.integer({ min: 10000, max: 45000 }))
          })
        }),
        execution: fc.record({
          parallel: fc.integer({ min: 1, max: 4 }),
          timeout: fc.integer({ min: 10000, max: 120000 }),
          retries: fc.integer({ min: 0, max: 5 }),
          shareData: fc.boolean()
        }),
        metadata: fc.option(fc.record({
          buildId: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
          environment: fc.option(fc.constantFrom('dev', 'staging', 'prod')),
          branch: fc.option(fc.string({ minLength: 1, maxLength: 30 }))
        }))
      }),
      async ({ baseUrl, pages, plugins, execution, metadata }) => {
        // Create fresh engine and registry for this test
        const testRegistry = new DefaultPluginRegistry();
        const testEngine = new MultiAuditEngine(testRegistry);
        
        // Create mock plugins for testing
        const mockPlugins: AuditPlugin[] = [
          {
            name: 'lighthouse-plugin',
            version: '1.0.0',
            type: 'performance' as AuditType,
            phase: 1,
            dependencies: [],
            configReceived: null as PluginConfig | null,
            
            async configure(config: PluginConfig): Promise<void> {
              (this as any).configReceived = config;
              if (!config.enabled) {
                throw new Error('Plugin disabled');
              }
            },
            
            async audit(context: AuditContext): Promise<AuditResult> {
              return {
                pluginName: 'lighthouse-plugin',
                type: 'performance',
                issues: [],
                metrics: { score: 85 },
                metadata: { configured: true },
                executionTimeMs: 1000,
                success: true
              };
            },
            
            async cleanup(): Promise<void> {},
            validate(config: PluginConfig): boolean {
              return typeof config.enabled === 'boolean';
            }
          },
          {
            name: 'security-plugin',
            version: '1.0.0',
            type: 'security' as AuditType,
            phase: 1,
            dependencies: [],
            configReceived: null as PluginConfig | null,
            
            async configure(config: PluginConfig): Promise<void> {
              (this as any).configReceived = config;
              if (!config.enabled) {
                throw new Error('Plugin disabled');
              }
            },
            
            async audit(context: AuditContext): Promise<AuditResult> {
              return {
                pluginName: 'security-plugin',
                type: 'security',
                issues: [],
                metrics: { vulnerabilities: 0 },
                metadata: { configured: true },
                executionTimeMs: 800,
                success: true
              };
            },
            
            async cleanup(): Promise<void> {},
            validate(config: PluginConfig): boolean {
              return typeof config.enabled === 'boolean';
            }
          },
          {
            name: 'accessibility-plugin',
            version: '1.0.0',
            type: 'accessibility' as AuditType,
            phase: 1,
            dependencies: [],
            configReceived: null as PluginConfig | null,
            
            async configure(config: PluginConfig): Promise<void> {
              (this as any).configReceived = config;
              if (!config.enabled) {
                throw new Error('Plugin disabled');
              }
            },
            
            async audit(context: AuditContext): Promise<AuditResult> {
              return {
                pluginName: 'accessibility-plugin',
                type: 'accessibility',
                issues: [],
                metrics: { violations: 2 },
                metadata: { configured: true },
                executionTimeMs: 1200,
                success: true
              };
            },
            
            async cleanup(): Promise<void> {},
            validate(config: PluginConfig): boolean {
              return typeof config.enabled === 'boolean';
            }
          }
        ];

        // Register plugins
        for (const plugin of mockPlugins) {
          testEngine.registerPlugin(plugin);
        }

        // Create configuration
        const config: MultiAuditConfig = {
          baseUrl,
          pages: pages as PageConfig[],
          plugins,
          execution,
          metadata
        };

        // Validate configuration
        expect(() => testEngine.validateConfig(config)).not.toThrow();

        // Configure plugins
        await testEngine.configurePlugins(config.plugins);

        // Verify each plugin received its configuration
        for (const [pluginName, pluginConfig] of Object.entries(config.plugins)) {
          const plugin = mockPlugins.find(p => p.name === pluginName);
          if (plugin && pluginConfig.enabled) {
            const receivedConfig = (plugin as any).configReceived;
            expect(receivedConfig).toBeDefined();
            expect(receivedConfig.enabled).toBe(pluginConfig.enabled);
            expect(receivedConfig.settings).toEqual(pluginConfig.settings);
            
            // Verify timeout configuration
            if (pluginConfig.timeoutMs) {
              expect(receivedConfig.timeoutMs).toBe(pluginConfig.timeoutMs);
            }
            
            // Verify severity thresholds if provided
            if (pluginConfig.severityThresholds) {
              expect(receivedConfig.severityThresholds).toEqual(pluginConfig.severityThresholds);
            }
          }
        }

        // Verify enabled/disabled state is correctly applied
        const enabledPlugins = testEngine.getEnabledPlugins();
        const expectedEnabledCount = Object.values(config.plugins).filter(p => p.enabled).length;
        expect(enabledPlugins.length).toBe(expectedEnabledCount);

        // Verify plugin registry state
        for (const [pluginName, pluginConfig] of Object.entries(config.plugins)) {
          const isEnabled = testRegistry.isEnabled(pluginName);
          expect(isEnabled).toBe(pluginConfig.enabled);
        }

        // Test configuration validation edge cases
        const invalidConfigs = [
          { ...config, baseUrl: '' }, // Empty baseUrl
          { ...config, pages: [] }, // Empty pages
          { ...config, plugins: null }, // Null plugins
          { ...config, execution: { ...config.execution, parallel: 0 } }, // Invalid parallel
          { ...config, execution: { ...config.execution, timeout: 500 } }, // Too short timeout
          { ...config, execution: { ...config.execution, retries: -1 } } // Negative retries
        ];

        for (const invalidConfig of invalidConfigs) {
          expect(() => testEngine.validateConfig(invalidConfig as MultiAuditConfig)).toThrow();
        }

        // Test page configuration validation
        const invalidPageConfigs = [
          { ...config, pages: [{ ...config.pages[0], path: '' }] }, // Empty path
          { ...config, pages: [{ ...config.pages[0], label: '' }] }, // Empty label
          { ...config, pages: [{ ...config.pages[0], devices: [] }] } // Empty devices
        ];

        for (const invalidPageConfig of invalidPageConfigs) {
          expect(() => testEngine.validateConfig(invalidPageConfig as MultiAuditConfig)).toThrow();
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: comprehensive-audit-system, Property 3: Configuration System Consistency
  it("should maintain configuration consistency across plugin lifecycle operations", () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        pluginConfigs: fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9-]*$/.test(s)),
            enabled: fc.boolean(),
            settings: fc.record({
              customSetting: fc.string({ minLength: 1, maxLength: 50 }),
              numericSetting: fc.integer({ min: 1, max: 1000 }),
              booleanSetting: fc.boolean()
            }),
            timeoutMs: fc.integer({ min: 5000, max: 30000 })
          }),
          { minLength: 1, maxLength: 4 }
        ),
        operations: fc.array(
          fc.record({
            type: fc.constantFrom('enable', 'disable', 'reconfigure'),
            pluginIndex: fc.integer({ min: 0, max: 3 }),
            newSettings: fc.option(fc.record({
              customSetting: fc.string({ minLength: 1, maxLength: 30 }),
              numericSetting: fc.integer({ min: 1, max: 500 })
            }))
          }),
          { minLength: 1, maxLength: 6 }
        )
      }),
      async ({ pluginConfigs, operations }) => {
        // Create fresh engine and registry for this test
        const testRegistry = new DefaultPluginRegistry();
        const testEngine = new MultiAuditEngine(testRegistry);
        
        // Remove duplicate plugin names
        const uniqueConfigs = pluginConfigs.filter((config, index, array) => 
          array.findIndex(c => c.name === config.name) === index
        );

        if (uniqueConfigs.length === 0) return; // Skip if no unique configs

        // Create mock plugins
        const mockPlugins: AuditPlugin[] = uniqueConfigs.map(config => ({
          name: config.name,
          version: '1.0.0',
          type: 'performance' as AuditType,
          phase: 1,
          dependencies: [],
          configHistory: [] as PluginConfig[],
          
          async configure(pluginConfig: PluginConfig): Promise<void> {
            (this as any).configHistory.push({ ...pluginConfig });
            if (!pluginConfig.enabled) {
              throw new Error('Plugin disabled');
            }
          },
          
          async audit(context: AuditContext): Promise<AuditResult> {
            return {
              pluginName: config.name,
              type: 'performance',
              issues: [],
              metrics: {},
              metadata: {},
              executionTimeMs: 100,
              success: true
            };
          },
          
          async cleanup(): Promise<void> {},
          validate(pluginConfig: PluginConfig): boolean {
            return typeof pluginConfig.enabled === 'boolean';
          }
        }));

        // Register plugins
        for (const plugin of mockPlugins) {
          testEngine.registerPlugin(plugin);
        }

        // Initial configuration
        const initialPluginConfigs: Record<string, PluginConfig> = {};
        for (const config of uniqueConfigs) {
          initialPluginConfigs[config.name] = {
            enabled: config.enabled,
            settings: config.settings,
            timeoutMs: config.timeoutMs
          };
        }

        await testEngine.configurePlugins(initialPluginConfigs);

        // Verify initial configuration
        for (const plugin of mockPlugins) {
          const configHistory = (plugin as any).configHistory as PluginConfig[];
          if (initialPluginConfigs[plugin.name].enabled) {
            expect(configHistory.length).toBeGreaterThan(0);
            const lastConfig = configHistory[configHistory.length - 1];
            expect(lastConfig.enabled).toBe(initialPluginConfigs[plugin.name].enabled);
            expect(lastConfig.settings).toEqual(initialPluginConfigs[plugin.name].settings);
          }
        }

        // Apply operations and verify consistency
        let currentConfigs = { ...initialPluginConfigs };
        
        for (const operation of operations) {
          const pluginIndex = operation.pluginIndex % uniqueConfigs.length;
          const targetPlugin = uniqueConfigs[pluginIndex];
          const pluginName = targetPlugin.name;
          
          switch (operation.type) {
            case 'enable':
              currentConfigs[pluginName] = {
                ...currentConfigs[pluginName],
                enabled: true
              };
              break;
              
            case 'disable':
              currentConfigs[pluginName] = {
                ...currentConfigs[pluginName],
                enabled: false
              };
              break;
              
            case 'reconfigure':
              if (operation.newSettings) {
                currentConfigs[pluginName] = {
                  ...currentConfigs[pluginName],
                  settings: {
                    ...currentConfigs[pluginName].settings,
                    ...operation.newSettings
                  }
                };
              }
              break;
          }
          
          // Apply configuration changes
          try {
            await testEngine.configurePlugins(currentConfigs);
            
            // Verify configuration was applied correctly
            const plugin = mockPlugins.find(p => p.name === pluginName);
            if (plugin) {
              const configHistory = (plugin as any).configHistory as PluginConfig[];
              const expectedEnabled = currentConfigs[pluginName].enabled;
              
              if (expectedEnabled) {
                // Plugin should have received the new configuration
                expect(configHistory.length).toBeGreaterThan(0);
                const lastConfig = configHistory[configHistory.length - 1];
                expect(lastConfig.enabled).toBe(expectedEnabled);
                expect(lastConfig.settings).toEqual(currentConfigs[pluginName].settings);
              }
              
              // Verify registry state
              const isEnabled = testRegistry.isEnabled(pluginName);
              expect(isEnabled).toBe(expectedEnabled);
            }
          } catch (error) {
            // Configuration errors are acceptable for disabled plugins
            if (currentConfigs[pluginName].enabled) {
              throw error; // Re-throw if plugin should be enabled
            }
          }
        }

        // Final consistency check
        const enabledPlugins = testEngine.getEnabledPlugins();
        const expectedEnabledPlugins = Object.entries(currentConfigs)
          .filter(([_, config]) => config.enabled)
          .map(([name, _]) => name);
        
        expect(enabledPlugins.map(p => p.name).sort()).toEqual(expectedEnabledPlugins.sort());
      }
    ), { numRuns: 100 });
  });
});