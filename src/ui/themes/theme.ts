type ColorToken = "reset" | "bold" | "dim" | "cyan" | "magenta" | "yellow" | "green" | "red";

type ColorMap = Readonly<Record<ColorToken, string>>;

const COLOR_MAP: ColorMap = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  cyan: "\u001b[36m",
  magenta: "\u001b[35m",
  yellow: "\u001b[33m",
  green: "\u001b[32m",
  red: "\u001b[31m",
} as const;

/**
 * Terminal theme helper that supports NO_COLOR/CI fallbacks.
 */
export class UiTheme {
  private readonly noColor: boolean;

  public constructor(params: { readonly noColor: boolean }) {
    this.noColor = params.noColor;
  }

  public apply(token: ColorToken, value: string): string {
    if (this.noColor) {
      return value;
    }
    const open: string = COLOR_MAP[token];
    return `${open}${value}${COLOR_MAP.reset}`;
  }

  public bold(value: string): string {
    return this.apply("bold", value);
  }

  public dim(value: string): string {
    return this.apply("dim", value);
  }

  public cyan(value: string): string {
    return this.apply("cyan", value);
  }

  public magenta(value: string): string {
    return this.apply("magenta", value);
  }

  public yellow(value: string): string {
    return this.apply("yellow", value);
  }

  public green(value: string): string {
    return this.apply("green", value);
  }

  public red(value: string): string {
    return this.apply("red", value);
  }
}