import type { ArtifactManifestV1, ManifestArtifactEntry } from "./types.js";

function groupByRunner(manifest: ArtifactManifestV1): Map<string, ManifestArtifactEntry[]> {
  const map = new Map<string, ManifestArtifactEntry[]>();
  for (const artifact of manifest.artifacts) {
    const list = map.get(artifact.runner) ?? [];
    list.push(artifact);
    map.set(artifact.runner, list);
  }
  return map;
}

export function buildIndexMarkdown(params: {
  readonly manifest: ArtifactManifestV1;
  readonly generatedAt: string;
}): string {
  const lines: string[] = [];
  lines.push("# Signaler audit index");
  lines.push("");
  lines.push(`Generated: ${params.generatedAt}`);
  lines.push(`Layout: **${params.manifest.layout}** (see [manifest.json](manifest.json))`);
  lines.push("");
  lines.push("## Quick start");
  lines.push("");
  lines.push("### Developers");
  lines.push("");
  lines.push("- Open [developer/report.html](developer/report.html) for the visual report.");
  lines.push("- Read [developer/overview.md](developer/overview.md) and [developer/triage.md](developer/triage.md).");
  lines.push("- Side runners: [developer/reports/](developer/reports/)");
  lines.push("");
  lines.push("### Agents");
  lines.push("");
  lines.push("- Prefer CLI: `signaler query --view agent|perf --dir .signaler --json`");
  lines.push("- Fallback: [agent/entrypoints.json](agent/entrypoints.json)");
  lines.push("");
  lines.push("### CI / quality gates");
  lines.push("");
  for (const path of params.manifest.entrypoints.ci) {
    lines.push(`- [\`${path}\`](${path})`);
  }
  if (params.manifest.entrypoints.ci.length === 0) {
    lines.push("- (no gate artifacts in this run)");
  }
  lines.push("");
  lines.push("## By runner");
  lines.push("");
  const byRunner = groupByRunner(params.manifest);
  for (const [runner, artifacts] of [...byRunner.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`### ${runner}`);
    lines.push("");
    for (const artifact of artifacts) {
      const legacy = artifact.legacyPath ? ` (legacy: \`${artifact.legacyPath}\`)` : "";
      lines.push(`- [\`${artifact.path}\`](${artifact.path}) — ${artifact.audience}${legacy}`);
    }
    lines.push("");
  }
  lines.push("## Directories");
  lines.push("");
  lines.push("- [agent/](agent/) — lean agent entrypoints");
  lines.push("- [developer/](developer/) — human reports");
  lines.push("- [runs/](runs/) — Lighthouse, analyze, verify pipeline");
  lines.push("- [runners/](runners/) — headers, links, bundle, and other side runners");
  lines.push("- [orchestration/](orchestration/) — jobs, discovery");
  lines.push("- [gates/](gates/) — quality-pack and policy gates");
  lines.push("- [export/](export/) — export payloads");
  lines.push("- [archive/](archive/) — legacy / bulk artifacts");
  lines.push("");
  return `${lines.join("\n")}\n`;
}
