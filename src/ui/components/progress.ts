import type { ProgressIndicator } from './index.js';

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;
const SPINNER_INTERVAL_MS: number = 80;
const ANSI_BLUE: string = "\u001B[34m";
const ANSI_RESET: string = "\u001B[0m";

/**
 * Terminal spinner progress indicator.
 */
export class SpinnerProgress implements ProgressIndicator {
  private interval?: NodeJS.Timeout;
  private frameIndex: number = 0;
  private message: string = "";

  /**
   * Check whether the spinner is currently active.
   */
  isActive(): boolean {
    return this.interval !== undefined;
  }

  /**
   * Start the spinner with an initial message.
   * @param message Initial message to display.
   */
  start(message: string = ""): void {
    if (!process.stdout.isTTY) {
      return;
    }
    this.stop();
    this.message = message;
    this.frameIndex = 0;
    process.stdout.write("\u001B[?25l"); // hide cursor
    this.interval = setInterval(() => {
      process.stdout.write(`\r${ANSI_BLUE}${SPINNER_FRAMES[this.frameIndex]} ${this.message}${ANSI_RESET}`);
      this.frameIndex = (this.frameIndex + 1) % SPINNER_FRAMES.length;
    }, SPINNER_INTERVAL_MS);
  }

  /**
   * Update the spinner message.
   * @param message New message to display.
   */
  update(message: string): void {
    if (!process.stdout.isTTY || this.interval === undefined) {
      return;
    }
    this.message = message;
  }

  /**
   * Stop the spinner.
   */
  stop(): void {
    if (this.interval === undefined) {
      return;
    }
    clearInterval(this.interval);
    this.interval = undefined;
    if (process.stdout.isTTY) {
      process.stdout.write("\r\u001B[K"); // clear line
      process.stdout.write("\u001B[?25h"); // show cursor
    }
  }
}

// Legacy functions for backward compatibility
let globalSpinner: SpinnerProgress | undefined;

/**
 * Check whether the global spinner is currently active.
 */
export function isSpinnerActive(): boolean {
  return globalSpinner?.isActive() ?? false;
}

/**
 * Start a global spinner with an initial message.
 * @param message Initial message to display.
 */
export function startSpinner(message: string): void {
  if (!globalSpinner) {
    globalSpinner = new SpinnerProgress();
  }
  globalSpinner.start(message);
}

/**
 * Update the global spinner message.
 * @param message New message to display.
 */
export function updateSpinnerMessage(message: string): void {
  globalSpinner?.update(message);
}

/**
 * Stop the global spinner.
 */
export function stopSpinner(): void {
  globalSpinner?.stop();
}