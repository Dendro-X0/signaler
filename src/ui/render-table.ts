type TableParams = {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
};

type BoxChars = {
  readonly topLeft: string;
  readonly topRight: string;
  readonly bottomLeft: string;
  readonly bottomRight: string;
  readonly horizontal: string;
  readonly vertical: string;
  readonly junctionTop: string;
  readonly junctionMid: string;
  readonly junctionBottom: string;
  readonly junctionLeft: string;
  readonly junctionRight: string;
};

const BOX: BoxChars = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  junctionTop: "┬",
  junctionMid: "┼",
  junctionBottom: "┴",
  junctionLeft: "├",
  junctionRight: "┤",
} as const;

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function visibleLength(value: string): number {
  return stripAnsi(value).length;
}

function repeatChar(char: string, count: number): string {
  return new Array(Math.max(0, count)).fill(char).join("");
}

function padCell(value: string, width: number): string {
  const len: number = visibleLength(value);
  if (len >= width) {
    return value;
  }
  return `${value}${repeatChar(" ", width - len)}`;
}

function computeWidths(params: TableParams): readonly number[] {
  const columnCount: number = Math.max(params.headers.length, ...params.rows.map((r) => r.length));
  const widths: number[] = new Array(columnCount).fill(1);
  for (let i = 0; i < columnCount; i += 1) {
    const header: string = params.headers[i] ?? "";
    widths[i] = Math.max(widths[i] ?? 1, visibleLength(header));
  }
  for (const row of params.rows) {
    for (let i = 0; i < columnCount; i += 1) {
      const cell: string = row[i] ?? "";
      widths[i] = Math.max(widths[i] ?? 1, visibleLength(cell));
    }
  }
  return widths;
}

function joinBorder(widths: readonly number[], left: string, mid: string, right: string): string {
  const parts: string[] = widths.map((w) => repeatChar(BOX.horizontal, w + 2));
  return `${left}${parts.join(mid)}${right}`;
}

function renderRow(cells: readonly string[], widths: readonly number[]): string {
  const padded: string[] = widths.map((w, i) => ` ${padCell(cells[i] ?? "", w)} `);
  return `${BOX.vertical}${padded.join(BOX.vertical)}${BOX.vertical}`;
}

export function renderTable(params: TableParams): string {
  const widths: readonly number[] = computeWidths(params);
  const top: string = joinBorder(widths, BOX.topLeft, BOX.junctionTop, BOX.topRight);
  const header: string = renderRow(params.headers, widths);
  const mid: string = joinBorder(widths, BOX.junctionLeft, BOX.junctionMid, BOX.junctionRight);
  const body: string[] = params.rows.map((r) => renderRow(r, widths));
  const bottom: string = joinBorder(widths, BOX.bottomLeft, BOX.junctionBottom, BOX.bottomRight);
  return [top, header, mid, ...body, bottom].join("\n");
}
