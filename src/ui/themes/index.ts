/**
 * UI Themes - Styling and color management
 */

// Theme interfaces
export interface Theme {
  colors: ColorPalette;
  formatting: FormatOptions;
  apply(text: string, style: StyleName): string;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface FormatOptions {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export type StyleName = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'bold' | 'italic' | 'underline';

// Re-export theme components
export * from './theme.js';
export * from './colors.js';