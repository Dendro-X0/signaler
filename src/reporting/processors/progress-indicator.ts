/**
 * Progress Indicator - Visual progress tracking for long operations
 * 
 * This module provides progress indicators and status reporting
 * for long-running report generation operations.
 */

import { EventEmitter } from 'node:events';

export interface ProgressConfig {
  showPercentage: boolean;
  showETA: boolean;
  showThroughput: boolean;
  updateInterval: number; // milliseconds
  width: number; // progress bar width in characters
  format: 'bar' | 'spinner' | 'dots' | 'minimal';
}

export interface ProgressState {
  current: number;
  total: number;
  percentage: number;
  startTime: number;
  elapsedMs: number;
  estimatedTotalMs: number;
  remainingMs: number;
  throughputPerSecond: number;
  stage: string;
  message?: string;
}

export interface ProgressUpdate {
  current: number;
  total?: number;
  stage?: string;
  message?: string;
}

/**
 * Progress indicator for report generation operations
 */
export class ProgressIndicator extends EventEmitter {
  private config: ProgressConfig;
  private state: ProgressState;
  private intervalId?: NodeJS.Timeout;
  private lastUpdateTime: number;
  private isActive: boolean;

  constructor(config: Partial<ProgressConfig> = {}) {
    super();
    
    this.config = {
      showPercentage: config.showPercentage ?? true,
      showETA: config.showETA ?? true,
      showThroughput: config.showThroughput ?? false,
      updateInterval: config.updateInterval ?? 100,
      width: config.width ?? 40,
      format: config.format ?? 'bar'
    };

    this.state = {
      current: 0,
      total: 100,
      percentage: 0,
      startTime: Date.now(),
      elapsedMs: 0,
      estimatedTotalMs: 0,
      remainingMs: 0,
      throughputPerSecond: 0,
      stage: 'Initializing'
    };

    this.lastUpdateTime = Date.now();
    this.isActive = false;
  }

  /**
   * Start progress tracking
   */
  start(total: number, stage: string = 'Processing'): void {
    this.state.total = total;
    this.state.current = 0;
    this.state.startTime = Date.now();
    this.state.stage = stage;
    this.lastUpdateTime = Date.now();
    this.isActive = true;

    this.updateState();
    this.render();

    // Start periodic updates
    this.intervalId = setInterval(() => {
      if (this.isActive) {
        this.updateState();
        this.render();
      }
    }, this.config.updateInterval);

    this.emit('start', { ...this.state });
  }

  /**
   * Update progress
   */
  update(update: ProgressUpdate): void {
    if (!this.isActive) return;

    const now = Date.now();
    
    if (update.total !== undefined) {
      this.state.total = update.total;
    }
    
    this.state.current = update.current;
    
    if (update.stage) {
      this.state.stage = update.stage;
    }
    
    if (update.message) {
      this.state.message = update.message;
    }

    this.lastUpdateTime = now;
    this.updateState();
    this.render();

    this.emit('update', { ...this.state });
  }

  /**
   * Complete progress tracking
   */
  complete(message?: string): void {
    if (!this.isActive) return;

    this.state.current = this.state.total;
    this.state.percentage = 100;
    this.state.stage = 'Complete';
    
    if (message) {
      this.state.message = message;
    }

    this.updateState();
    this.render();
    this.cleanup();

    this.emit('complete', { ...this.state });
  }

  /**
   * Stop progress tracking with error
   */
  error(message: string): void {
    if (!this.isActive) return;

    this.state.stage = 'Error';
    this.state.message = message;
    
    this.render();
    this.cleanup();

    this.emit('error', { ...this.state, error: message });
  }

  /**
   * Get current progress state
   */
  getState(): ProgressState {
    return { ...this.state };
  }

  /**
   * Check if progress is active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Update internal state calculations
   */
  private updateState(): void {
    const now = Date.now();
    this.state.elapsedMs = now - this.state.startTime;
    this.state.percentage = Math.min(100, (this.state.current / this.state.total) * 100);

    // Calculate throughput
    if (this.state.elapsedMs > 0) {
      this.state.throughputPerSecond = (this.state.current / this.state.elapsedMs) * 1000;
    }

    // Calculate ETA
    if (this.state.current > 0 && this.state.throughputPerSecond > 0) {
      const remaining = this.state.total - this.state.current;
      this.state.remainingMs = (remaining / this.state.throughputPerSecond) * 1000;
      this.state.estimatedTotalMs = this.state.elapsedMs + this.state.remainingMs;
    }
  }

  /**
   * Render progress indicator
   */
  private render(): void {
    if (!process.stdout.isTTY) {
      // Non-TTY environment, use simple text output
      this.renderSimple();
      return;
    }

    switch (this.config.format) {
      case 'bar':
        this.renderProgressBar();
        break;
      case 'spinner':
        this.renderSpinner();
        break;
      case 'dots':
        this.renderDots();
        break;
      case 'minimal':
        this.renderMinimal();
        break;
    }
  }

  /**
   * Render progress bar
   */
  private renderProgressBar(): void {
    const filled = Math.floor((this.state.percentage / 100) * this.config.width);
    const empty = this.config.width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    
    let output = `\r${this.state.stage}: [${bar}]`;
    
    if (this.config.showPercentage) {
      output += ` ${this.state.percentage.toFixed(1)}%`;
    }
    
    output += ` (${this.state.current}/${this.state.total})`;
    
    if (this.config.showETA && this.state.remainingMs > 0) {
      const eta = this.formatDuration(this.state.remainingMs);
      output += ` ETA: ${eta}`;
    }
    
    if (this.config.showThroughput && this.state.throughputPerSecond > 0) {
      output += ` (${this.state.throughputPerSecond.toFixed(1)}/s)`;
    }
    
    if (this.state.message) {
      output += ` - ${this.state.message}`;
    }

    process.stdout.write(output);
  }

  /**
   * Render spinner indicator
   */
  private renderSpinner(): void {
    const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const spinnerIndex = Math.floor(Date.now() / 100) % spinnerChars.length;
    const spinner = spinnerChars[spinnerIndex];
    
    let output = `\r${spinner} ${this.state.stage}`;
    
    if (this.config.showPercentage) {
      output += ` ${this.state.percentage.toFixed(1)}%`;
    }
    
    output += ` (${this.state.current}/${this.state.total})`;
    
    if (this.state.message) {
      output += ` - ${this.state.message}`;
    }

    process.stdout.write(output);
  }

  /**
   * Render dots indicator
   */
  private renderDots(): void {
    const dotCount = Math.floor(Date.now() / 500) % 4;
    const dots = '.'.repeat(dotCount);
    
    let output = `\r${this.state.stage}${dots.padEnd(3)}`;
    
    if (this.config.showPercentage) {
      output += ` ${this.state.percentage.toFixed(1)}%`;
    }
    
    output += ` (${this.state.current}/${this.state.total})`;

    process.stdout.write(output);
  }

  /**
   * Render minimal indicator
   */
  private renderMinimal(): void {
    const output = `\r${this.state.stage}: ${this.state.current}/${this.state.total}`;
    process.stdout.write(output);
  }

  /**
   * Render simple text output for non-TTY
   */
  private renderSimple(): void {
    const percentage = this.state.percentage.toFixed(1);
    console.log(`${this.state.stage}: ${percentage}% (${this.state.current}/${this.state.total})`);
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Move to next line
    if (process.stdout.isTTY) {
      process.stdout.write('\n');
    }
  }
}

/**
 * Multi-stage progress tracker for complex operations
 */
export class MultiStageProgress extends EventEmitter {
  private stages: Map<string, { weight: number; progress: ProgressIndicator }>;
  private currentStage?: string;
  private totalWeight: number;
  private overallProgress: ProgressIndicator;

  constructor() {
    super();
    this.stages = new Map();
    this.totalWeight = 0;
    this.overallProgress = new ProgressIndicator({
      format: 'bar',
      showETA: true,
      showThroughput: false
    });
  }

  /**
   * Add a stage to the multi-stage progress
   */
  addStage(name: string, weight: number = 1): void {
    const progress = new ProgressIndicator({
      format: 'minimal',
      showETA: false
    });

    progress.on('update', (state) => {
      this.updateOverallProgress();
      this.emit('stage-update', { stage: name, state });
    });

    progress.on('complete', (state) => {
      this.emit('stage-complete', { stage: name, state });
    });

    this.stages.set(name, { weight, progress });
    this.totalWeight += weight;
  }

  /**
   * Start a specific stage
   */
  startStage(name: string, total: number): void {
    const stage = this.stages.get(name);
    if (!stage) {
      throw new Error(`Stage not found: ${name}`);
    }

    this.currentStage = name;
    stage.progress.start(total, name);
    
    if (this.stages.size === 1 || !this.overallProgress.isRunning()) {
      this.overallProgress.start(100, 'Processing');
    }

    this.emit('stage-start', { stage: name, total });
  }

  /**
   * Update current stage progress
   */
  updateStage(update: ProgressUpdate): void {
    if (!this.currentStage) {
      throw new Error('No active stage');
    }

    const stage = this.stages.get(this.currentStage);
    if (!stage) {
      throw new Error(`Stage not found: ${this.currentStage}`);
    }

    stage.progress.update(update);
    this.updateOverallProgress();
  }

  /**
   * Complete current stage
   */
  completeStage(message?: string): void {
    if (!this.currentStage) {
      throw new Error('No active stage');
    }

    const stage = this.stages.get(this.currentStage);
    if (!stage) {
      throw new Error(`Stage not found: ${this.currentStage}`);
    }

    stage.progress.complete(message);
    this.updateOverallProgress();
  }

  /**
   * Complete all stages
   */
  complete(message?: string): void {
    this.overallProgress.complete(message);
    this.emit('complete');
  }

  /**
   * Update overall progress based on stage progress
   */
  private updateOverallProgress(): void {
    let totalProgress = 0;

    for (const [name, stage] of this.stages) {
      const stageState = stage.progress.getState();
      const stageProgress = (stageState.percentage / 100) * stage.weight;
      totalProgress += stageProgress;
    }

    const overallPercentage = (totalProgress / this.totalWeight) * 100;
    this.overallProgress.update({
      current: Math.floor(overallPercentage),
      total: 100
    });
  }

  /**
   * Get overall progress state
   */
  getOverallState(): ProgressState {
    return this.overallProgress.getState();
  }

  /**
   * Get specific stage state
   */
  getStageState(name: string): ProgressState | undefined {
    const stage = this.stages.get(name);
    return stage?.progress.getState();
  }
}

/**
 * Utility function to create a simple progress callback
 */
export function createProgressCallback(
  indicator: ProgressIndicator
): (current: number, total?: number, message?: string) => void {
  return (current: number, total?: number, message?: string) => {
    indicator.update({ current, total, message });
  };
}

/**
 * Utility function to wrap an async operation with progress tracking
 */
export async function withProgress<T>(
  operation: (progress: ProgressIndicator) => Promise<T>,
  config?: Partial<ProgressConfig>
): Promise<T> {
  const progress = new ProgressIndicator(config);
  
  try {
    const result = await operation(progress);
    if (progress.isRunning()) {
      progress.complete();
    }
    return result;
  } catch (error) {
    if (progress.isRunning()) {
      progress.error(error instanceof Error ? error.message : 'Unknown error');
    }
    throw error;
  }
}