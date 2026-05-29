import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

type DirEntry = {
  readonly name: string;
  readonly kind: "file" | "dir";
};

async function listDirEntries(absoluteDir: string): Promise<readonly DirEntry[]> {
  try {
    const names: readonly string[] = await readdir(absoluteDir);
    const entries: DirEntry[] = [];
    for (const name of names) {
      const absolute: string = resolve(absoluteDir, name);
      const s = await stat(absolute);
      entries.push({ name, kind: s.isDirectory() ? "dir" : "file" });
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function toRelativeLink(name: string, kind: DirEntry["kind"]): string {
  if (kind === "dir") {
    return `[${name}/](${name}/)`;
  }
  return `[${name}](${name})`;
}

export async function buildFlatNavigationMarkdown(outputDir: string): Promise<string> {
  const entries = await listDirEntries(outputDir);
  const generatedAt = new Date().toISOString();
  const lines: string[] = [];
  lines.push("# Signaler artifacts navigation");
  lines.push("");
  lines.push(`Generated: ${generatedAt}`);
  lines.push("");
  lines.push("Flat layout (`--artifact-layout flat`). For categorized output use `--artifact-layout tree` (default).");
  lines.push("");
  lines.push("## Quick start");
  lines.push("");
  lines.push("- Agents: `signaler query --view agent --dir .signaler --json`");
  lines.push("- Developers: `overview.md` → `report.html`");
  lines.push("");
  lines.push("## Files in this directory");
  lines.push("");
  for (const entry of entries) {
    lines.push(`- ${toRelativeLink(entry.name, entry.kind)}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
