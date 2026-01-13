/**
 * Color definitions and ANSI escape codes
 */

export type ColorToken = "reset" | "bold" | "dim" | "cyan" | "magenta" | "yellow" | "green" | "red";

export type ColorMap = Readonly<Record<ColorToken, string>>;

export const ANSI_COLORS: ColorMap = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  cyan: "\u001b[36m",
  magenta: "\u001b[35m",
  yellow: "\u001b[33m",
  green: "\u001b[32m",
  red: "\u001b[31m",
} as const;

export const ANSI_BLUE = "\u001B[34m";
export const ANSI_RESET = "\u001B[0m";

/**
 * Check if colors should be disabled based on environment
 */
export function shouldDisableColors(): boolean {
  return (
    process.env.NO_COLOR !== undefined ||
    process.env.CI === "true" ||
    !process.stdout.isTTY
  );
}