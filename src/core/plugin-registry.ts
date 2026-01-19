/**
 * Plugin Registry - Manages plugin lifecycle and registration
 * 
 * This module provides the default implementation of the plugin registry
 * for managing audit plugins in the comprehensive audit system.
 */

import type { 
  AuditPlugin, 
  PluginRegistry, 
  PluginInfo, 
  AuditType 
} from './plugin-interface.js';

/**
 * Default implementation of the plugin registry
 */
export class DefaultPluginRegistry implements PluginRegistry {
  private plugins = new Map<string, AuditPlugin>();
  private pluginConfigs = new Map<string, boolean>(); // enabled/disabled state

  /**
   * Register a new audit plugin
   */
  register(plugin: AuditPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    // Validate plugin dependencies
    for (const dependency of plugin.dependencies) {
      if (!this.plugins.has(dependency)) {
        throw new Error(
          `Plugin '${plugin.name}' depends on '${dependency}' which is not registered`
        );
      }
    }

    this.plugins.set(plugin.name, plugin);
    this.pluginConfigs.set(plugin.name, true); // Default to enabled
  }

  /**
   * Get a registered plugin by name
   */
  get(name: string): AuditPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins
   */
  list(): readonly AuditPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by audit type
   */
  getByType(type: AuditType): readonly AuditPlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.type === type);
  }

  /**
   * Get plugins by implementation phase
   */
  getByPhase(phase: 1 | 2 | 3): readonly AuditPlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.phase === phase);
  }

  /**
   * Get only enabled plugins
   */
  getEnabled(): readonly AuditPlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => 
      this.pluginConfigs.get(plugin.name) === true
    );
  }

  /**
   * Get enabled plugins by type
   */
  getEnabledByType(type: AuditType): readonly AuditPlugin[] {
    return this.getByType(type).filter(plugin => 
      this.pluginConfigs.get(plugin.name) === true
    );
  }

  /**
   * Get enabled plugins by phase
   */
  getEnabledByPhase(phase: 1 | 2 | 3): readonly AuditPlugin[] {
    return this.getByPhase(phase).filter(plugin => 
      this.pluginConfigs.get(plugin.name) === true
    );
  }

  /**
   * Enable or disable a plugin
   */
  setEnabled(name: string, enabled: boolean): void {
    if (!this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is not registered`);
    }
    this.pluginConfigs.set(name, enabled);
  }

  /**
   * Check if a plugin is enabled
   */
  isEnabled(name: string): boolean {
    return this.pluginConfigs.get(name) === true;
  }

  /**
   * Unregister a plugin
   */
  unregister(name: string): boolean {
    const removed = this.plugins.delete(name);
    if (removed) {
      this.pluginConfigs.delete(name);
      
      // Check for plugins that depend on this one
      const dependentPlugins = Array.from(this.plugins.values())
        .filter(plugin => plugin.dependencies.includes(name));
      
      if (dependentPlugins.length > 0) {
        const dependentNames = dependentPlugins.map(p => p.name).join(', ');
        throw new Error(
          `Cannot unregister plugin '${name}' because it is required by: ${dependentNames}`
        );
      }
    }
    return removed;
  }

  /**
   * Clear all registered plugins
   */
  clear(): void {
    this.plugins.clear();
    this.pluginConfigs.clear();
  }

  /**
   * Get plugin information for all registered plugins
   */
  getPluginInfo(): readonly PluginInfo[] {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      type: plugin.type,
      phase: plugin.phase,
      description: `${plugin.type} audit plugin`,
      dependencies: plugin.dependencies,
      enabled: this.pluginConfigs.get(plugin.name) === true
    }));
  }

  /**
   * Resolve plugin execution order based on dependencies
   */
  resolveExecutionOrder(plugins: readonly AuditPlugin[]): AuditPlugin[] {
    const resolved: AuditPlugin[] = [];
    const resolving = new Set<string>();
    const visited = new Set<string>();

    const visit = (plugin: AuditPlugin): void => {
      if (visited.has(plugin.name)) {
        return;
      }

      if (resolving.has(plugin.name)) {
        throw new Error(`Circular dependency detected involving plugin '${plugin.name}'`);
      }

      resolving.add(plugin.name);

      // Visit dependencies first
      for (const depName of plugin.dependencies) {
        const dependency = plugins.find(p => p.name === depName);
        if (dependency) {
          visit(dependency);
        }
      }

      resolving.delete(plugin.name);
      visited.add(plugin.name);
      resolved.push(plugin);
    };

    // Visit all plugins
    for (const plugin of plugins) {
      visit(plugin);
    }

    return resolved;
  }

  /**
   * Validate plugin compatibility
   */
  validateCompatibility(plugins: readonly AuditPlugin[]): void {
    const pluginMap = new Map(plugins.map(p => [p.name, p]));

    for (const plugin of plugins) {
      // Check dependencies exist
      for (const depName of plugin.dependencies) {
        if (!pluginMap.has(depName)) {
          throw new Error(
            `Plugin '${plugin.name}' depends on '${depName}' which is not available`
          );
        }
      }

      // Check for version conflicts (simplified - just check for duplicates)
      const sameTypePlugins = plugins.filter(p => p.type === plugin.type && p.name !== plugin.name);
      if (sameTypePlugins.length > 0) {
        const conflictNames = sameTypePlugins.map(p => p.name).join(', ');
        console.warn(
          `Multiple plugins for audit type '${plugin.type}': ${plugin.name}, ${conflictNames}`
        );
      }
    }
  }
}