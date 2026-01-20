/**
 * UI Themes - Styling and color management
 */

// Theme interfaces
/**
 * Theme contract for applying styles to rendered CLI text.
 */
export interface Theme {
  colors: ColorPalette;
  formatting: FormatOptions;
  apply(text: string, style: StyleName): string;
}

/**
 * Named theme colors used by the CLI.
 */
export interface ColorPalette {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

/**
 * Formatting toggles for a theme.
 */
export interface FormatOptions {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

/**
 * Style identifiers supported by Theme.apply.
 */
export type StyleName = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'bold' | 'italic' | 'underline';

// Re-export theme components
export * from './theme.js';
export * from './colors.js';