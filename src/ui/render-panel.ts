type PanelParams = {
  readonly title: string;
  readonly subtitle?: string;
  readonly lines: readonly string[];
};

type BoxChars = {
  readonly topLeft: string;
  readonly topRight: string;
  readonly bottomLeft: string;
  readonly bottomRight: string;
  readonly horizontal: string;
  readonly vertical: string;
};

const BOX: BoxChars = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
} as const;

function repeatChar(char: string, count: number): string {
  return new Array(Math.max(0, count)).fill(char).join("");
}

function lineLength(value: string): number {
  return value.replace(/\u001b\[[0-9;]*m/g, "").length;
}

function padRight(value: string, total: number): string {
  const rawLen: number = lineLength(value);
  if (rawLen >= total) {
    return value;
  }
  return `${value}${repeatChar(" ", total - rawLen)}`;
}

function renderHeader(params: { readonly title: string; readonly subtitle?: string; readonly contentWidth: number }): readonly string[] {
  const titleLine: string = params.subtitle ? `${params.title} — ${params.subtitle}` : params.title;
  const padded: string = padRight(titleLine, params.contentWidth);
  return [`${BOX.vertical} ${padded} ${BOX.vertical}`];
}

function renderBody(lines: readonly string[], contentWidth: number): readonly string[] {
  return lines.map((line) => {
    const padded: string = padRight(line, contentWidth);
    return `${BOX.vertical} ${padded} ${BOX.vertical}`;
  });
}

function computeContentWidth(params: PanelParams): number {
  const headerLine: string = params.subtitle ? `${params.title} — ${params.subtitle}` : params.title;
  const lengths: readonly number[] = [lineLength(headerLine), ...params.lines.map((l) => lineLength(l))];
  return Math.max(10, ...lengths);
}

export function renderPanel(params: PanelParams): string {
  const contentWidth: number = computeContentWidth(params);
  const top: string = `${BOX.topLeft}${repeatChar(BOX.horizontal, contentWidth + 2)}${BOX.topRight}`;
  const bottom: string = `${BOX.bottomLeft}${repeatChar(BOX.horizontal, contentWidth + 2)}${BOX.bottomRight}`;
  const header: readonly string[] = renderHeader({ title: params.title, subtitle: params.subtitle, contentWidth });
  const separator: string = `${BOX.vertical} ${repeatChar(BOX.horizontal, contentWidth)} ${BOX.vertical}`;
  const body: readonly string[] = renderBody(params.lines, contentWidth);
  return [top, ...header, separator, ...body, bottom].join("\n");
}
