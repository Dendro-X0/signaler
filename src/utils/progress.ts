/**
 * Progress indicator utilities for better UX
 */

export interface ProgressBarOptions {
  readonly total: number;
  readonly width?: number;
  readonly completeChar?: string;
  readonly incompleteChar?: string;
  readonly showPercentage?: boolean;
  readonly showETA?: boolean;
}

export class ProgressBar {
  private current = 0;
  private readonly total: number;
  private readonly width: number;
  private readonly completeChar: string;
  private readonly incompleteChar: string;
  private readonly showPercentage: boolean;
  private readonly showETA: boolean;
  private readonly startTime: number;
  private lastRenderTime = 0;
  private readonly minRenderInterval = 100; // ms
  
  constructor(options: ProgressBarOptions) {
    this.total = options.total;
    this.width = options.width ?? 40;
    this.completeChar = options.completeChar ?? '█';
    this.incompleteChar = options.incompleteChar ?? '░';
    this.showPercentage = options.showPercentage ?? true;
    this.showETA = options.showETA ?? true;
    this.startTime = Date.now();
  }
  
  /**
   * Update progress
   */
  update(current: number, message?: string): void {
    this.current = Math.min(current, this.total);
    
    // Throttle rendering
    const now = Date.now();
    if (now - this.lastRenderTime < this.minRenderInterval && current < this.total) {
      return;
    }
    this.lastRenderTime = now;
    
    this.render(message);
  }
  
  /**
   * Increment progress
   */
  tick(message?: string): void {
    this.update(this.current + 1, message);
  }
  
  /**
   * Mark progress as complete
   */
  finish(message?: string): void {
    this.current = this.total;
    this.render(message);
    if (process.stdout.isTTY) {
      process.stdout.write('\n');
    }
  }
  
  /**
   * Render the progress bar
   */
  private render(message?: string): void {
    if (!process.stdout.isTTY) {
      // Non-TTY: just log progress occasionally
      if (this.current === this.total || this.current % Math.ceil(this.total / 10) === 0) {
        console.log(`Progress: ${this.current}/${this.total}${message ? ` - ${message}` : ''}`);
      }
      return;
    }
    
    const percentage = this.total > 0 ? this.current / this.total : 0;
    const completedWidth = Math.floor(this.width * percentage);
    const incompleteWidth = this.width - completedWidth;
    
    const bar = this.completeChar.repeat(completedWidth) + this.incompleteChar.repeat(incompleteWidth);
    
    let output = `\r[${bar}]`;
    
    if (this.showPercentage) {
      output += ` ${Math.floor(percentage * 100)}%`;
    }
    
    output += ` ${this.current}/${this.total}`;
    
    if (this.showETA && this.current > 0 && this.current < this.total) {
      const eta = this.calculateETA();
      if (eta) {
        output += ` | ETA: ${eta}`;
      }
    }
    
    if (message) {
      output += ` | ${message}`;
    }
    
    // Clear to end of line and write
    process.stdout.write(output + '\x1b[K');
  }
  
  /**
   * Calculate ETA
   */
  private calculateETA(): string | null {
    if (this.current === 0) {
      return null;
    }
    
    const elapsed = Date.now() - this.startTime;
    const rate = this.current / elapsed; // items per ms
    const remaining = this.total - this.current;
    const etaMs = remaining / rate;
    
    if (!Number.isFinite(etaMs) || etaMs < 0) {
      return null;
    }
    
    return this.formatDuration(etaMs);
  }
  
  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  }
}

/**
 * Spinner for indeterminate progress
 */
export class Spinner {
  private readonly frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private intervalId?: NodeJS.Timeout;
  private message: string;
  
  constructor(message: string = 'Loading...') {
    this.message = message;
  }
  
  /**
   * Start the spinner
   */
  start(): void {
    if (!process.stdout.isTTY) {
      console.log(this.message);
      return;
    }
    
    this.intervalId = setInterval(() => {
      const frame = this.frames[this.currentFrame];
      process.stdout.write(`\r${frame} ${this.message}\x1b[K`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);
  }
  
  /**
   * Update spinner message
   */
  updateMessage(message: string): void {
    this.message = message;
  }
  
  /**
   * Stop the spinner
   */
  stop(finalMessage?: string): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    if (process.stdout.isTTY) {
      process.stdout.write('\r\x1b[K');
      if (finalMessage) {
        console.log(finalMessage);
      }
    } else if (finalMessage) {
      console.log(finalMessage);
    }
  }
  
  /**
   * Stop with success message
   */
  succeed(message?: string): void {
    this.stop(`✓ ${message || this.message}`);
  }
  
  /**
   * Stop with error message
   */
  fail(message?: string): void {
    this.stop(`✗ ${message || this.message}`);
  }
  
  /**
   * Stop with warning message
   */
  warn(message?: string): void {
    this.stop(`⚠ ${message || this.message}`);
  }
}

/**
 * Multi-line progress tracker
 */
export class MultiProgress {
  private readonly bars: Map<string, { bar: ProgressBar; message: string }> = new Map();
  
  /**
   * Add a progress bar
   */
  addBar(id: string, options: ProgressBarOptions): ProgressBar {
    const bar = new ProgressBar(options);
    this.bars.set(id, { bar, message: '' });
    return bar;
  }
  
  /**
   * Update a specific bar
   */
  updateBar(id: string, current: number, message?: string): void {
    const entry = this.bars.get(id);
    if (entry) {
      entry.bar.update(current, message);
      if (message) {
        entry.message = message;
      }
    }
  }
  
  /**
   * Remove a bar
   */
  removeBar(id: string): void {
    this.bars.delete(id);
  }
  
  /**
   * Clear all bars
   */
  clear(): void {
    this.bars.clear();
  }
}

/**
 * Simple status indicator
 */
export function logStatus(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
  const icons = {
    info: 'ℹ',
    success: '✓',
    error: '✗',
    warning: '⚠',
  };
  
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
  };
  
  const reset = '\x1b[0m';
  const icon = icons[type];
  const color = colors[type];
  
  console.log(`${color}${icon}${reset} ${message}`);
}

/**
 * Format bytes in human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}
